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


def is_wild(card: Dict, level: str) -> bool:
    """The ♥ card matching the current level is the 逢人配 wild card."""
    return card["suit"] == "♥" and card["rank"] == level


def _rank_val(rank: str, level: str) -> float:
    return 15.5 if rank == level else BASE[rank]


def _seq_top(nat_by_rank: Dict[str, List[Dict]], w: int, mult: int, k: int) -> Optional[int]:
    """Highest top-base of a run of k consecutive ranks (each needing `mult`
    copies), filling shortfalls with `w` wilds. Every natural must be usable
    inside the window and consumed; wilds must be used exactly. None if no fit."""
    if k <= 0:
        return None
    counts: Dict[int, int] = {}
    for r, cs in nat_by_rank.items():
        b = BASE[r]
        if b == 15:  # '2' cannot appear in a run
            return None
        counts[b] = counts.get(b, 0) + len(cs)
    best: Optional[int] = None
    for lo in range(3, 15 - k + 1):  # window [lo, lo+k-1] within base 3..14
        window = set(range(lo, lo + k))
        if any(b not in window for b in counts):
            continue
        if any(counts.get(b, 0) > mult for b in window):
            continue
        need = sum(mult - counts.get(b, 0) for b in window)
        if need == w:
            top = lo + k - 1
            if best is None or top > best:
                best = top
    return best


def analyze(cards: List[Dict], level: str) -> Optional[Dict]:
    """Identify the combo a set of cards forms (wild-card aware). Returns the
    strongest sensible interpretation, or None if the cards form no legal combo."""
    n = len(cards)
    if n == 0:
        return None
    wilds = [c for c in cards if is_wild(c, level)]
    w = len(wilds)
    naturals = [c for c in cards if not is_wild(c, level)]
    jc = sum(1 for c in naturals if is_joker(c["rank"]))

    # Combos containing jokers: wilds may not mix with jokers.
    if jc > 0:
        if w > 0:
            return None
        if n == 4:
            big = sum(1 for c in cards if c["rank"] == "大王")
            small = sum(1 for c in cards if c["rank"] == "小王")
            if big == 2 and small == 2:
                return {"kind": "天王炸", "cat": 100, "len": 4, "value": 1000, "cards": cards}
        if n == 1:
            return {"kind": "单牌", "cat": 0, "len": 1, "value": BASE[cards[0]["rank"]], "cards": cards}
        if n == 2 and cards[0]["rank"] == cards[1]["rank"]:
            return {"kind": "对子", "cat": 0, "len": 2, "value": BASE[cards[0]["rank"]], "cards": cards}
        return None

    nat_by_rank: Dict[str, List[Dict]] = {}
    for c in naturals:
        nat_by_rank.setdefault(c["rank"], []).append(c)
    nat_ranks = list(nat_by_rank.keys())

    # same-rank bomb (4–8), wilds fill
    if n >= 4 and len(nat_ranks) <= 1 and naturals:
        return {"kind": "炸弹", "cat": n, "len": n, "value": _rank_val(nat_ranks[0], level), "cards": cards}

    # 同花顺 — naturals same suit, wilds fill
    if n >= 5 and naturals:
        suits = set(c["suit"] for c in naturals)
        if len(suits) == 1 and "" not in suits:
            top = _seq_top(nat_by_rank, w, 1, n)
            if top is not None:
                return {"kind": "同花顺", "cat": 6.5, "len": n, "value": top, "cards": cards}

    # single / pair / triple (same rank, wilds fill)
    if n == 1:
        r = nat_ranks[0] if naturals else level
        return {"kind": "单牌", "cat": 0, "len": 1, "value": _rank_val(r, level), "cards": cards}
    if n == 2 and len(nat_ranks) <= 1:
        r = nat_ranks[0] if naturals else level
        return {"kind": "对子", "cat": 0, "len": 2, "value": _rank_val(r, level), "cards": cards}
    if n == 3 and len(nat_ranks) <= 1 and naturals:
        return {"kind": "三张", "cat": 0, "len": 3, "value": _rank_val(nat_ranks[0], level), "cards": cards}

    # 三带二 — triple + pair, wilds fill
    if n == 5:
        best_t: Optional[float] = None
        for t in nat_ranks:
            need_t = 3 - len(nat_by_rank[t])
            if need_t < 0 or need_t > w:
                continue
            remw = w - need_t
            others = [r for r in nat_ranks if r != t]
            ok = False
            if len(others) == 0:
                ok = (remw == 2)
            elif len(others) == 1:
                cp = len(nat_by_rank[others[0]])
                ok = (cp <= 2 and (2 - cp) == remw)
            if ok:
                val = _rank_val(t, level)
                best_t = val if best_t is None else max(best_t, val)
        if best_t is not None:
            return {"kind": "三带二", "cat": 0, "len": 5, "value": best_t, "cards": cards}

    # 顺子 / 连对 / 飞机
    if n >= 5:
        top = _seq_top(nat_by_rank, w, 1, n)
        if top is not None:
            return {"kind": "顺子", "cat": 0, "len": n, "value": top, "cards": cards}
    if n >= 6 and n % 2 == 0 and n // 2 >= 3:
        top = _seq_top(nat_by_rank, w, 2, n // 2)
        if top is not None:
            return {"kind": "连对", "cat": 0, "len": n // 2, "value": top, "cards": cards}
    if n >= 6 and n % 3 == 0 and n // 3 >= 2:
        top = _seq_top(nat_by_rank, w, 3, n // 3)
        if top is not None:
            return {"kind": "飞机", "cat": 0, "len": n // 3, "value": top, "cards": cards}

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
        "tribute": None, "lastOrder": None,
    }
    start_deal(state, random.randint(0, 3))
    return state


def start_deal(state: Dict, leader: int, tribute_from: Optional[List[int]] = None) -> None:
    hands = deal()
    for i, p in enumerate(state["players"]):
        p["cards"] = sort_hand(hands[i], state["dealLevel"])
        p["finished"] = False
    state["lastPlay"] = None
    state["lastPlayer"] = -1
    state["passed"] = []
    state["plays"] = [None, None, None, None]
    state["finishOrder"] = []
    state["result"] = None
    state["phase"] = "playing"
    state["tribute"] = None
    if tribute_from:
        override = _apply_tribute(state, tribute_from)
        if override is not None:
            leader = override
    state["current"] = leader
    state["message"] = ("进贡完成，" + state["tribute"] + "，出牌吧！") if state["tribute"] else "新的一局，出牌吧！"


# ── 进贡 / 还贡 (tribute) ────────────────────────────────────────────────────
def _tribute_summary(state: Dict, events: List[Dict]) -> Optional[str]:
    def nm(i):
        return state["players"][i]["name"]
    parts = []
    for e in events:
        if e["type"] == "抗贡":
            parts.append(f'{nm(e["from"])} 抗贡（双大王）')
        else:
            c, b = e["card"], e["back"]
            parts.append(f'{nm(e["from"])}进贡{c["suit"]}{c["rank"]}给{nm(e["to"])}（还{b["suit"]}{b["rank"]}）')
    return "；".join(parts) if parts else None


def _apply_tribute(state: Dict, order: List[int]) -> Optional[int]:
    """Move tribute cards on the freshly dealt hands. Returns a leader override
    (the tribute payer / larger payer), or None to keep the given leader.
    Ruleset: losers pay their biggest non-wild card to winners; winner returns a
    small (≤10) card. 双大王 refuses (抗贡). Payer leads the new deal."""
    lvl = state["dealLevel"]
    players = state["players"]
    head = order[0]
    wteam = team_of(head)

    def biggest_nonwild(hand):
        pool = [c for c in hand if not is_wild(c, lvl)]
        return max(pool, key=lambda c: card_val(c, lvl))

    def has_two_big_jokers(hand):
        return sum(1 for c in hand if c["rank"] == "大王") >= 2

    def small_return(hand):
        small = [c for c in hand if BASE[c["rank"]] <= 10]
        pool = small if small else hand
        return min(pool, key=lambda c: BASE[c["rank"]])

    def move(frm, to, card):
        players[frm]["cards"] = [c for c in players[frm]["cards"] if c["id"] != card["id"]]
        players[to]["cards"].append(card)

    events: List[Dict] = []
    leader: Optional[int] = None
    double = team_of(order[0]) == team_of(order[1])  # winners took 1st & 2nd

    if double:
        pays = []
        for p in (order[2], order[3]):
            if has_two_big_jokers(players[p]["cards"]):
                events.append({"type": "抗贡", "from": p})
            else:
                pays.append([p, biggest_nonwild(players[p]["cards"])])
        if not pays:
            leader = head
        else:
            pays.sort(key=lambda x: card_val(x[1], lvl), reverse=True)
            receivers = [head, order[1]]  # larger tribute → head, smaller → partner
            for i, (payer, card) in enumerate(pays):
                recv = receivers[i] if i < len(receivers) else head
                move(payer, recv, card)
                ret = small_return(players[recv]["cards"])
                move(recv, payer, ret)
                events.append({"type": "进贡", "from": payer, "to": recv, "card": card, "back": ret})
            leader = pays[0][0]
    else:
        losers = [p for p in order if team_of(p) != wteam]
        payer = losers[-1]  # lower-ranked loser pays
        if has_two_big_jokers(players[payer]["cards"]):
            events.append({"type": "抗贡", "from": payer})
            leader = head
        else:
            card = biggest_nonwild(players[payer]["cards"])
            move(payer, head, card)
            ret = small_return(players[head]["cards"])
            move(head, payer, ret)
            events.append({"type": "进贡", "from": payer, "to": head, "card": card, "back": ret})
            leader = payer

    for p in players:
        p["cards"] = sort_hand(p["cards"], lvl)
    state["tribute"] = _tribute_summary(state, events)
    return leader


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
    state["lastOrder"] = order  # drives the next deal's tribute
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
