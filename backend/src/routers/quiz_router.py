"""
航司/机场代码测验 (code quiz) leaderboard.

A challenge run: the player answers mixed airline/airport multiple-choice
questions until the first wrong answer; the number answered correctly in a row
(capped at 100) is the score. Ranking is score DESC, then time_ms ASC — so among
perfect 100-question runs the fastest wins, and time also breaks lower ties.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from rate_limiter import limiter

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

MAX_SCORE = 100
MAX_NAME_LEN = 24


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else ""


class ScoreSubmit(BaseModel):
    username: str
    score: int
    time_ms: int
    perfect: bool = False


class SubmitResponse(BaseModel):
    success: bool


class LeaderboardEntry(BaseModel):
    username: str
    score: int
    time_ms: int
    perfect: bool
    created_at: Optional[str] = None


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]


@router.post("/score", response_model=SubmitResponse)
@limiter.limit("30/minute")
async def submit_score(request: Request, payload: ScoreSubmit):
    """Record a completed challenge run."""
    name = (payload.username or "").strip()[:MAX_NAME_LEN]
    if not name:
        raise HTTPException(400, "用户名必填")
    score = max(0, min(MAX_SCORE, int(payload.score)))
    time_ms = max(0, int(payload.time_ms))
    perfect = bool(payload.perfect) and score >= MAX_SCORE
    try:
        from database import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO code_quiz_leaderboard (username, score, time_ms, perfect, client_ip)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (name, score, time_ms, perfect, _client_ip(request)),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"提交成绩失败: {e}")
    return SubmitResponse(success=True)


@router.get("/leaderboard", response_model=LeaderboardResponse)
@limiter.limit("60/minute")
async def leaderboard(request: Request, limit: int = 20):
    """Top runs, one (best) per username, ranked by score DESC then time ASC."""
    limit = min(max(1, limit), 100)
    entries: List[LeaderboardEntry] = []
    try:
        from database import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT username, score, time_ms, perfect, created_at FROM (
                SELECT DISTINCT ON (username) username, score, time_ms, perfect, created_at
                FROM code_quiz_leaderboard
                ORDER BY username, score DESC, time_ms ASC
            ) best
            ORDER BY score DESC, time_ms ASC
            LIMIT %s
            """,
            (limit,),
        )
        for username, score, time_ms, perfect, created_at in cur.fetchall():
            entries.append(LeaderboardEntry(
                username=username, score=int(score), time_ms=int(time_ms),
                perfect=bool(perfect),
                created_at=created_at.isoformat() if created_at else None,
            ))
        cur.close()
        conn.close()
    except Exception as e:  # noqa: BLE001 — leaderboard is read-only; degrade to empty
        print(f"[quiz] leaderboard query failed: {e}")
    return LeaderboardResponse(entries=entries)
