"""
掼蛋 online game hall — server-authoritative tables over polling REST.

Tables live in guandan_tables (seats + full game state as JSONB). Any mix of
humans and AI can occupy the 4 seats; empty seats are filled with AI on start.
AI turns are driven lazily: whenever a client polls state or takes an action,
the server plays out AI moves until it's a human's turn (or the deal ends).
Optimistic concurrency via a version column keeps concurrent pollers safe.
"""

import json
from typing import List, Optional, Dict, Any

import os

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor, Json

from rate_limiter import limiter
import guandan_engine as G

# Online hall is temporarily disabled while we isolate/fix issues. Flip back on
# by setting env GUANDAN_ONLINE=1 (no code change / redeploy needed on Render).
ONLINE_ENABLED = os.getenv("GUANDAN_ONLINE", "0") == "1"


def _require_online():
    if not ONLINE_ENABLED:
        raise HTTPException(503, "在线掼蛋暂时维护中，即将上线")


# The dependency gates every route in this router, so nothing hits the DB while off.
router = APIRouter(prefix="/api/guandan", tags=["guandan"], dependencies=[Depends(_require_online)])

MAX_NAME = 20


def _db():
    from database import get_db_connection
    return get_db_connection()


def _empty_seat(idx: int) -> Dict[str, Any]:
    return {"type": "empty", "player_id": None, "name": None}


def _new_seats(host_id: str, host_name: str) -> List[Dict[str, Any]]:
    seats = [_empty_seat(i) for i in range(4)]
    seats[0] = {"type": "human", "player_id": host_id, "name": host_name}
    return seats


# ── models ────────────────────────────────────────────────────────────────
class CreateBody(BaseModel):
    name: str
    player_id: str
    player_name: str


class JoinBody(BaseModel):
    player_id: str
    player_name: str
    seat: Optional[int] = None


class SeatBody(BaseModel):
    seat: int


class PlayerBody(BaseModel):
    player_id: str


class ActionBody(BaseModel):
    player_id: str
    action: str               # 'play' | 'pass'
    card_ids: Optional[List[int]] = None


# ── helpers ─────────────────────────────────────────────────────────────────
def _load(cur, table_id: int) -> Optional[Dict[str, Any]]:
    cur.execute("SELECT * FROM guandan_tables WHERE id = %s", (table_id,))
    return cur.fetchone()


def _seat_of(seats: List[Dict], player_id: str) -> int:
    for i, s in enumerate(seats):
        if s.get("type") == "human" and s.get("player_id") == player_id:
            return i
    return -1


def _view(row: Dict[str, Any], player_id: Optional[str]) -> Dict[str, Any]:
    """Serialize a table for a given player — hides other players' cards."""
    seats = row["seats"]
    my_seat = _seat_of(seats, player_id or "")
    state = row["state"]
    view_state = None
    if state:
        players = []
        for i, p in enumerate(state["players"]):
            players.append({
                "type": p["type"], "name": p["name"], "finished": p["finished"],
                "count": len(p["cards"]),
                "cards": p["cards"] if i == my_seat else None,
            })
        view_state = {
            "players": players,
            "current": state["current"],
            "lastPlay": state["lastPlay"],
            "lastPlayer": state["lastPlayer"],
            "plays": state["plays"],
            "finishOrder": state["finishOrder"],
            "dealLevel": state["dealLevel"],
            "levels": state["levels"],
            "onLevelTeam": state["onLevelTeam"],
            "phase": state["phase"],
            "message": state["message"],
            "result": state["result"],
            "tribute": state.get("tribute"),
            "dealLevelWild": "♥" + state["dealLevel"],
        }
    return {
        "id": row["id"],
        "name": row["name"],
        "status": row["status"],
        "host_id": row["host_id"],
        "seats": [{"type": s["type"], "name": s.get("name")} for s in seats],
        "mySeat": my_seat,
        "version": row["version"],
        "state": view_state,
    }


def _persist(cur, row: Dict[str, Any], *, status: str = None, seats=None, state=None) -> Dict[str, Any]:
    """Write with optimistic version check; raises 409 on conflict."""
    new_status = status if status is not None else row["status"]
    new_seats = seats if seats is not None else row["seats"]
    new_state = state if state is not None else row["state"]
    cur.execute(
        """
        UPDATE guandan_tables
        SET status=%s, seats=%s, state=%s, version=version+1, updated_at=now()
        WHERE id=%s AND version=%s
        RETURNING *
        """,
        (new_status, Json(new_seats), Json(new_state) if new_state is not None else None, row["id"], row["version"]),
    )
    updated = cur.fetchone()
    if not updated:
        raise HTTPException(409, "牌桌状态已变化，请重试")
    return updated


def _drive_ai_if_needed(cur, row: Dict[str, Any]) -> Dict[str, Any]:
    """If it's an AI's turn, advance and persist. Returns the (possibly) new row."""
    state = row["state"]
    if row["status"] == "playing" and state and state["phase"] == "playing" \
            and state["players"][state["current"]]["type"] == "ai":
        G.advance_ai(state)
        try:
            return _persist(cur, row, state=state)
        except HTTPException:
            # someone else advanced concurrently — reload
            return _load(cur, row["id"]) or row
    return row


# ── endpoints ─────────────────────────────────────────────────────────────
@router.get("/tables")
@limiter.limit("120/minute")
async def list_tables(request: Request):
    conn = _db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Reap abandoned tables so the list (and DB) don't grow unbounded:
        # waiting tables idle >1h, any table idle >12h.
        cur.execute(
            """
            DELETE FROM guandan_tables
            WHERE (status = 'waiting' AND updated_at < now() - interval '1 hour')
               OR (updated_at < now() - interval '12 hours')
            """
        )
        conn.commit()
        cur.execute(
            """
            SELECT id, name, status, seats, created_at FROM guandan_tables
            WHERE status IN ('waiting', 'playing')
            ORDER BY updated_at DESC LIMIT 50
            """
        )
        rows = cur.fetchall()
        out = []
        for r in rows:
            seats = r["seats"]
            out.append({
                "id": r["id"], "name": r["name"], "status": r["status"],
                "humans": sum(1 for s in seats if s["type"] == "human"),
                "ai": sum(1 for s in seats if s["type"] == "ai"),
                "empty": sum(1 for s in seats if s["type"] == "empty"),
                "seats": [{"type": s["type"], "name": s.get("name")} for s in seats],
            })
        return {"tables": out}
    finally:
        cur.close(); conn.close()


@router.post("/tables")
@limiter.limit("30/minute")
async def create_table(request: Request, body: CreateBody):
    name = (body.name or "").strip()[:MAX_NAME] or "掼蛋牌桌"
    pid = (body.player_id or "").strip()
    pname = (body.player_name or "").strip()[:MAX_NAME] or "玩家"
    if not pid:
        raise HTTPException(400, "缺少玩家标识")
    conn = _db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute(
            "INSERT INTO guandan_tables (name, status, host_id, seats, version) VALUES (%s,'waiting',%s,%s,0) RETURNING *",
            (name, pid, Json(_new_seats(pid, pname))),
        )
        row = cur.fetchone()
        conn.commit()
        return _view(row, pid)
    finally:
        cur.close(); conn.close()


@router.post("/tables/{table_id}/join")
@limiter.limit("60/minute")
async def join_table(request: Request, table_id: int, body: JoinBody):
    pid = (body.player_id or "").strip()
    pname = (body.player_name or "").strip()[:MAX_NAME] or "玩家"
    if not pid:
        raise HTTPException(400, "缺少玩家标识")
    conn = _db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        row = _load(cur, table_id)
        if not row:
            raise HTTPException(404, "牌桌不存在")
        seats = row["seats"]
        if _seat_of(seats, pid) >= 0:
            conn.commit()
            return _view(row, pid)  # already seated
        target = body.seat
        if target is None:
            target = next((i for i, s in enumerate(seats) if s["type"] == "empty"), None)
        if target is None or not (0 <= target < 4) or seats[target]["type"] != "empty":
            raise HTTPException(400, "座位不可用")
        seats[target] = {"type": "human", "player_id": pid, "name": pname}
        row = _persist(cur, row, seats=seats)
        conn.commit()
        return _view(row, pid)
    finally:
        cur.close(); conn.close()


@router.post("/tables/{table_id}/add_ai")
@limiter.limit("60/minute")
async def add_ai(request: Request, table_id: int, body: SeatBody):
    conn = _db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        row = _load(cur, table_id)
        if not row:
            raise HTTPException(404, "牌桌不存在")
        if row["status"] != "waiting":
            raise HTTPException(400, "游戏已开始")
        seats = row["seats"]
        s = body.seat
        if not (0 <= s < 4) or seats[s]["type"] != "empty":
            raise HTTPException(400, "座位不可用")
        seats[s] = {"type": "ai", "player_id": None, "name": f"电脑{s + 1}"}
        row = _persist(cur, row, seats=seats)
        conn.commit()
        return _view(row, None)
    finally:
        cur.close(); conn.close()


@router.post("/tables/{table_id}/leave")
@limiter.limit("60/minute")
async def leave_table(request: Request, table_id: int, body: PlayerBody):
    pid = (body.player_id or "").strip()
    conn = _db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        row = _load(cur, table_id)
        if not row:
            return {"ok": True}
        seats = row["seats"]
        seat = _seat_of(seats, pid)
        if seat < 0:
            conn.commit()
            return {"ok": True}
        if row["status"] == "playing":
            # replace the leaver with an AI so the game continues
            seats[seat] = {"type": "ai", "player_id": None, "name": f"电脑{seat + 1}"}
            if row["state"]:
                row["state"]["players"][seat]["type"] = "ai"
                row["state"]["players"][seat]["name"] = seats[seat]["name"]
            _persist(cur, row, seats=seats, state=row["state"])
        else:
            seats[seat] = _empty_seat(seat)
            remaining_humans = sum(1 for s in seats if s["type"] == "human")
            if remaining_humans == 0:
                cur.execute("DELETE FROM guandan_tables WHERE id=%s", (table_id,))
            else:
                _persist(cur, row, seats=seats)
        conn.commit()
        return {"ok": True}
    finally:
        cur.close(); conn.close()


@router.post("/tables/{table_id}/start")
@limiter.limit("30/minute")
async def start_table(request: Request, table_id: int, body: PlayerBody):
    pid = (body.player_id or "").strip()
    conn = _db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        row = _load(cur, table_id)
        if not row:
            raise HTTPException(404, "牌桌不存在")
        if row["status"] != "waiting":
            raise HTTPException(400, "游戏已开始")
        seats = row["seats"]
        if _seat_of(seats, pid) < 0:
            raise HTTPException(403, "只有入座玩家可开始")
        # fill empty seats with AI
        for i in range(4):
            if seats[i]["type"] == "empty":
                seats[i] = {"type": "ai", "player_id": None, "name": f"电脑{i + 1}"}
        state = G.init_match(seats)
        G.advance_ai(state)  # in case the random leader is an AI
        row = _persist(cur, row, status="playing", seats=seats, state=state)
        conn.commit()
        return _view(row, pid)
    finally:
        cur.close(); conn.close()


@router.get("/tables/{table_id}")
@limiter.limit("400/minute")
async def get_table(request: Request, table_id: int, player_id: str = ""):
    conn = _db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        row = _load(cur, table_id)
        if not row:
            raise HTTPException(404, "牌桌不存在")
        row = _drive_ai_if_needed(cur, row)
        conn.commit()
        return _view(row, player_id or None)
    finally:
        cur.close(); conn.close()


@router.post("/tables/{table_id}/action")
@limiter.limit("120/minute")
async def table_action(request: Request, table_id: int, body: ActionBody):
    pid = (body.player_id or "").strip()
    conn = _db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        row = _load(cur, table_id)
        if not row:
            raise HTTPException(404, "牌桌不存在")
        if row["status"] != "playing" or not row["state"]:
            raise HTTPException(400, "游戏未在进行中")
        seat = _seat_of(row["seats"], pid)
        if seat < 0:
            raise HTTPException(403, "你不在此牌桌")
        state = row["state"]
        err = G.apply_human_action(state, seat, body.action, body.card_ids)
        if err:
            raise HTTPException(400, err)
        row = _persist(cur, row, state=state)
        conn.commit()
        return _view(row, pid)
    finally:
        cur.close(); conn.close()


@router.post("/tables/{table_id}/next_deal")
@limiter.limit("30/minute")
async def next_deal(request: Request, table_id: int, body: PlayerBody):
    pid = (body.player_id or "").strip()
    conn = _db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        row = _load(cur, table_id)
        if not row:
            raise HTTPException(404, "牌桌不存在")
        state = row["state"]
        if not state or state["phase"] != "dealOver":
            raise HTTPException(400, "本局尚未结束")
        if _seat_of(row["seats"], pid) < 0:
            raise HTTPException(403, "你不在此牌桌")
        G.start_deal(state, state["nextLeader"], tribute_from=state.get("lastOrder"))
        G.advance_ai(state)
        row = _persist(cur, row, state=state)
        conn.commit()
        return _view(row, pid)
    finally:
        cur.close(); conn.close()
