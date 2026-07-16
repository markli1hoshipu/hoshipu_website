"""
掼蛋 (Guandan) server-authoritative engine — Python port of the frontend
engine.ts (kept in parity via shared test vectors). Pure card logic plus the
deal/turn/level orchestration used by the online tables.

A card is a dict: {"id": int, "suit": str, "rank": str}.
Suit is one of ♠♥♦♣ or "" for jokers. Rank ∈ 3..10,J,Q,K,A,2,小王,大王.
"""

import random
from typing import Dict, List, Optional

RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"]
LEVEL_SEQ = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
BASE = {
    "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
    "J": 11, "Q": 12, "K": 13, "A": 14, "2": 15, "小王": 16, "大王": 17,
}


def is_joker(rank: str) -> bool:
    return rank in ("小王", "大王")


def card_val(card: Dict, level: str) -> float:
    if is_joker(card["rank"]):
        return BASE[card["rank"]]
    if card["rank"] == level:
        return 15.5
    return BASE[card["rank"]]


def create_deck() -> List[Dict]:
    deck: List[Dict] = []
    suits = ["♠", "♥", "♦", "♣"]
    cid = 0
    for _ in range(2):
        for s in suits:
            for r in RANKS:
                deck.append({"id": cid, "suit": s, "rank": r})
                cid += 1
        deck.append({"id": cid, "suit": "", "rank": "小王"}); cid += 1
        deck.append({"id": cid, "suit": "", "rank": "大王"}); cid += 1
    return deck


def deal() -> List[List[Dict]]:
    deck = create_deck()
    random.shuffle(deck)
    hands: List[List[Dict]] = [[], [], [], []]
    idx = 0
    for _ in range(27):
        for p in range(4):
            hands[p].append(deck[idx]); idx += 1
    return hands


def sort_hand(cards: List[Dict], level: str) -> List[Dict]:
    return sorted(cards, key=lambda c: (card_val(c, level), c["suit"]))


def _consecutive(sorted_unique: List[int]) -> bool:
    if not sorted_unique:
        return False
    for i in range(1, len(sorted_unique)):
        if sorted_unique[i] != sorted_unique[i - 1] + 1:
            return False
    return True


def analyze(cards: List[Dict], level: str) -> Optional[Dict]:
    n = len(cards)
    if n == 0:
        return None
    by_rank: Dict[str, List[Dict]] = {}
    for c in cards:
        by_rank.setdefault(c["rank"], []).append(c)
    ranks = list(by_rank.keys())
    joker_count = sum(1 for c in cards if is_joker(c["rank"]))

    # 天王炸
    if n == 4:
        big = sum(1 for c in cards if c["rank"] == "大王")
        small = sum(1 for c in cards if c["rank"] == "小王")
        if big == 2 and small == 2:
            return {"kind": "天王炸", "cat": 100, "len": 4, "value": 1000, "cards": cards}

    # same-rank bomb 4-8
    if len(ranks) == 1 and joker_count == 0 and n >= 4:
        return {"kind": "炸弹", "cat": n, "len": n, "value": card_val(cards[0], level), "cards": cards}

    # 同花顺
    if n >= 5 and joker_count == 0 and cards[0]["suit"] and all(c["suit"] == cards[0]["suit"] for c in cards) and "2" not in by_rank:
        bv = sorted(BASE[c["rank"]] for c in cards)
        if _consecutive(bv):
            return {"kind": "同花顺", "cat": 6.5, "len": n, "value": max(bv), "cards": cards}

    # single / pair / triple
    if len(ranks) == 1:
        if n == 1:
            return {"kind": "单牌", "cat": 0, "len": 1, "value": card_val(cards[0], level), "cards": cards}
        if n == 2:
            return {"kind": "对子", "cat": 0, "len": 2, "value": card_val(cards[0], level), "cards": cards}
        if n == 3 and joker_count == 0:
            return {"kind": "三张", "cat": 0, "len": 3, "value": card_val(cards[0], level), "cards": cards}

    # 三带二
    if n == 5 and len(ranks) == 2 and joker_count == 0:
        sizes = sorted(len(by_rank[r]) for r in ranks)
        if sizes == [2, 3]:
            triple_rank = next(r for r in ranks if len(by_rank[r]) == 3)
            return {"kind": "三带二", "cat": 0, "len": 5, "value": card_val(by_rank[triple_rank][0], level), "cards": cards}

    # sequences — base values, no jokers, no '2'
    if joker_count == 0 and "2" not in by_rank:
        rank_vals = sorted(BASE[r] for r in ranks)

        def all_same_count(k: int) -> bool:
            return all(len(by_rank[r]) == k for r in ranks)

        if n >= 5 and all_same_count(1) and _consecutive(rank_vals):
            return {"kind": "顺子", "cat": 0, "len": n, "value": max(rank_vals), "cards": cards}
        if n >= 6 and n % 2 == 0 and all_same_count(2) and len(ranks) >= 3 and _consecutive(rank_vals):
            return {"kind": "连对", "cat": 0, "len": len(ranks), "value": max(rank_vals), "cards": cards}
        if n >= 6 and n % 3 == 0 and all_same_count(3) and len(ranks) >= 2 and _consecutive(rank_vals):
            return {"kind": "飞机", "cat": 0, "len": len(ranks), "value": max(rank_vals), "cards": cards}

    return None


def can_beat(a: Dict, b: Optional[Dict]) -> bool:
    if not b:
        return True
    a_bomb = a["cat"] >= 4
    b_bomb = b["cat"] >= 4
    if a_bomb and not b_bomb:
        return True
    if not a_bomb and b_bomb:
        return False
    if a_bomb and b_bomb:
        if a["cat"] != b["cat"]:
            return a["cat"] > b["cat"]
        if a["kind"] == "同花顺":
            return a["len"] > b["len"] if a["len"] != b["len"] else a["value"] > b["value"]
        return a["value"] > b["value"]
    if a["kind"] != b["kind"]:
        return False
    if len(a["cards"]) != len(b["cards"]):
        return False
    return a["value"] > b["value"]


# ── AI helpers ──────────────────────────────────────────────────────────────
def _group_by_rank(hand: List[Dict]) -> Dict[str, List[Dict]]:
    g: Dict[str, List[Dict]] = {}
    for c in hand:
        g.setdefault(c["rank"], []).append(c)
    return g


def find_bombs(hand: List[Dict], level: str) -> List[List[Dict]]:
    bombs: List[List[Dict]] = []
    g = _group_by_rank(hand)
    for r, cs in g.items():
        if not is_joker(r) and len(cs) >= 4:
            bombs.append(list(cs))
    by_suit: Dict[str, List[Dict]] = {}
    for c in hand:
        if c["suit"] and c["rank"] != "2":
            by_suit.setdefault(c["suit"], []).append(c)
    for cs in by_suit.values():
        arr = sorted(cs, key=lambda c: BASE[c["rank"]])
        uniq, seen = [], set()
        for c in arr:
            if BASE[c["rank"]] not in seen:
                seen.add(BASE[c["rank"]]); uniq.append(c)
        for ln in range(5, len(uniq) + 1):
            for i in range(0, len(uniq) - ln + 1):
                seg = uniq[i:i + ln]
                if _consecutive([BASE[c["rank"]] for c in seg]):
                    bombs.append(seg)
    big = [c for c in hand if c["rank"] == "大王"]
    small = [c for c in hand if c["rank"] == "小王"]
    if len(big) >= 2 and len(small) >= 2:
        bombs.append(big[:2] + small[:2])

    scored = [(b, analyze(b, level)) for b in bombs]
    scored = [(b, c) for (b, c) in scored if c]
    scored.sort(key=lambda x: (x[1]["cat"], x[1]["len"], x[1]["value"]))
    return [b for (b, _c) in scored]


def find_non_bomb_beat(hand: List[Dict], last: Dict, level: str) -> Optional[List[Dict]]:
    g = _group_by_rank(hand)

    def ranks_val_asc(rs: List[str]) -> List[str]:
        return sorted(rs, key=lambda r: card_val({"id": 0, "suit": "", "rank": r}, level))

    def of_size(minsize: int) -> List[str]:
        return ranks_val_asc([r for r in g if len(g[r]) >= minsize])

    kind = last["kind"]
    if kind == "单牌":
        cand = sorted([c for c in hand if card_val(c, level) > last["value"]], key=lambda c: card_val(c, level))
        solo = next((c for c in cand if len(g[c["rank"]]) == 1), None)
        pick = solo or (cand[0] if cand else None)
        return [pick] if pick else None
    if kind == "对子":
        for r in of_size(2):
            if card_val(g[r][0], level) > last["value"]:
                return g[r][:2]
        return None
    if kind == "三张":
        for r in of_size(3):
            if card_val(g[r][0], level) > last["value"]:
                return g[r][:3]
        return None
    if kind == "三带二":
        for tr in of_size(3):
            if card_val(g[tr][0], level) <= last["value"]:
                continue
            pr = next((r for r in of_size(2) if r != tr and len(g[r]) >= 2), None)
            if pr:
                return g[tr][:3] + g[pr][:2]
        return None
    if kind in ("顺子", "连对", "飞机"):
        need = 1 if kind == "顺子" else 2 if kind == "连对" else 3
        seq_len = len(last["cards"]) // need
        avail = sorted({BASE[r] for r in g if not is_joker(r) and r != "2" and len(g[r]) >= need})
        rank_by_base = {BASE[r]: r for r in g if not is_joker(r)}
        for i in range(0, len(avail) - seq_len + 1):
            window = avail[i:i + seq_len]
            if not _consecutive(window):
                continue
            if max(window) <= last["value"]:
                continue
            cards: List[Dict] = []
            for bv in window:
                cards += g[rank_by_base[bv]][:need]
            return cards
        return None
    return None


def decide_ai_move(hand: List[Dict], last: Optional[Dict], last_is_teammate: bool,
                   level: str, last_player_cards_left: int) -> Optional[List[Dict]]:
    if not last:
        g = _group_by_rank(hand)
        srt = sorted(hand, key=lambda c: card_val(c, level))
        safe = next((c for c in srt if len(g[c["rank"]]) < 4), None)
        return [safe or srt[0]]

    whole = analyze(hand, level)
    if whole and can_beat(whole, last):
        return list(hand)

    if last_is_teammate:
        return None

    beat = find_non_bomb_beat(hand, last, level)
    if beat:
        return beat

    for b in find_bombs(hand, level):
        bc = analyze(b, level)
        if bc and can_beat(bc, last) and (last_player_cards_left <= 5 or len(hand) <= 8 or last["cat"] >= 4):
            return b
    return None


# ── Game / table orchestration ────────────────────────────────────────────
def team_of(i: int) -> int:
    return 0 if i % 2 == 0 else 1


def partner_of(i: int) -> int:
    return (i + 2) % 4


def _next_active(state: Dict, frm: int) -> int:
    for k in range(1, 5):
        j = (frm + k) % 4
        if not state["players"][j]["finished"]:
            return j
    return frm


def init_match(seats: List[Dict]) -> Dict:
    """seats: list of 4 {type:'human'|'ai', player_id, name}. Empty seats must be
    filled (with ai) before calling. Returns a fresh match state at level 2."""
    players = [{
        "type": s["type"], "player_id": s.get("player_id"), "name": s.get("name") or ("电脑" if s["type"] == "ai" else "玩家"),
        "cards": [], "finished": False,
    } for s in seats]
    state = {
        "players": players,
        "current": 0, "lastPlay": None, "lastPlayer": -1, "passed": [],
        "plays": [None, None, None, None], "finishOrder": [],
        "dealLevel": "2", "levels": ["2", "2"], "onLevelTeam": 0, "nextLeader": 0,
        "phase": "playing", "message": "新的一局，出牌吧！", "result": None,
    }
    start_deal(state, random.randint(0, 3))
    return state


def start_deal(state: Dict, leader: int) -> None:
    hands = deal()
    for i, p in enumerate(state["players"]):
        p["cards"] = sort_hand(hands[i], state["dealLevel"])
        p["finished"] = False
    state["current"] = leader
    state["lastPlay"] = None
    state["lastPlayer"] = -1
    state["passed"] = []
    state["plays"] = [None, None, None, None]
    state["finishOrder"] = []
    state["result"] = None
    state["phase"] = "playing"
    state["message"] = "新的一局，出牌吧！"


def _end_deal(state: Dict) -> None:
    rest = [p for p in range(4) if not state["players"][p]["finished"]]
    order = state["finishOrder"] + rest
    head = order[0]
    winner_team = team_of(head)
    partner_pos = order.index(partner_of(head))
    gain = 3 if partner_pos == 1 else 2 if partner_pos == 2 else 1
    idx_cur = LEVEL_SEQ.index(state["levels"][winner_team])
    idx_a = LEVEL_SEQ.index("A")
    match_win = state["dealLevel"] == "A" and winner_team == state["onLevelTeam"]
    state["levels"][winner_team] = LEVEL_SEQ[min(idx_cur + gain, idx_a)]
    state["onLevelTeam"] = winner_team
    state["dealLevel"] = state["levels"][winner_team]
    state["nextLeader"] = head
    state["result"] = {"winnerTeam": winner_team, "gain": gain, "order": order, "matchWin": match_win}
    state["phase"] = "matchOver" if match_win else "dealOver"
    tn = "我方" if winner_team == 0 else "对方"
    state["message"] = f"{tn}打过 A，赢得整场！" if match_win else f"本局结束 — {tn}升 {gain} 级"


def _register_finish(state: Dict, idx: int) -> None:
    state["players"][idx]["finished"] = True
    state["finishOrder"].append(idx)
    fo = state["finishOrder"]
    if len(fo) == 2 and team_of(fo[0]) == team_of(fo[1]):
        _end_deal(state); return
    if len(fo) == 3:
        _end_deal(state)


def _do_play(state: Dict, idx: int, cards: List[Dict]) -> None:
    ids = {c["id"] for c in cards}
    state["players"][idx]["cards"] = [c for c in state["players"][idx]["cards"] if c["id"] not in ids]
    state["lastPlay"] = analyze(cards, state["dealLevel"])
    state["lastPlayer"] = idx
    state["passed"] = []
    state["plays"] = [cards if i == idx else state["plays"][i] for i in range(4)]
    state["message"] = f'{state["players"][idx]["name"]}出牌'
    if len(state["players"][idx]["cards"]) == 0:
        _register_finish(state, idx)
    if state["phase"] == "playing":
        state["current"] = _next_active(state, idx)


def _do_pass(state: Dict, idx: int) -> None:
    if idx not in state["passed"]:
        state["passed"].append(idx)
    state["message"] = f'{state["players"][idx]["name"]}不要'
    active = [p for p in range(4) if not state["players"][p]["finished"]]
    others = [p for p in active if p != state["lastPlayer"]]
    if others and all(p in state["passed"] for p in others):
        state["lastPlay"] = None
        state["passed"] = []
        state["plays"] = [None, None, None, None]
        lp = state["lastPlayer"]
        state["current"] = _next_active(state, lp) if state["players"][lp]["finished"] else lp
    else:
        state["current"] = _next_active(state, idx)


def advance_ai(state: Dict, max_moves: int = 40) -> None:
    """Play out AI turns until it's a human's turn or the deal/match ends."""
    moves = 0
    while state["phase"] == "playing" and state["players"][state["current"]]["type"] == "ai":
        if moves >= max_moves:
            break
        moves += 1
        idx = state["current"]
        p = state["players"][idx]
        last = state["lastPlay"]
        last_is_mate = last is not None and team_of(state["lastPlayer"]) == team_of(idx)
        lp_left = len(state["players"][state["lastPlayer"]]["cards"]) if state["lastPlayer"] >= 0 else 27
        move = decide_ai_move(p["cards"], last, last_is_mate, state["dealLevel"], lp_left)
        if move:
            _do_play(state, idx, move)
        else:
            _do_pass(state, idx)


def apply_human_action(state: Dict, seat: int, action: str, card_ids: Optional[List[int]]) -> Optional[str]:
    """Validate & apply a human seat's action. Returns an error message or None."""
    if state["phase"] != "playing":
        return "游戏未在进行中"
    if state["current"] != seat:
        return "还没轮到你"
    if action == "pass":
        if not state["lastPlay"]:
            return "你是首出，不能不要"
        _do_pass(state, seat)
        advance_ai(state)
        return None
    if action == "play":
        ids = set(card_ids or [])
        cards = [c for c in state["players"][seat]["cards"] if c["id"] in ids]
        if not cards:
            return "请选择要出的牌"
        combo = analyze(cards, state["dealLevel"])
        if not combo:
            return "牌型不合法"
        if not can_beat(combo, state["lastPlay"]):
            return "压不过上家"
        _do_play(state, seat, cards)
        advance_ai(state)
        return None
    return "未知操作"
