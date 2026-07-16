"use client";

import { useReducer, useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Play, RotateCcw, Lightbulb, Users, Info } from "lucide-react";
import {
  Card, Combo, LEVEL_SEQ, BASE, analyze, canBeat, deal, sortHand, decideAIMove, findNonBombBeat, findBombs,
  isWild, cardVal,
} from "../engine";
import { CardFace, CardBack } from "../CardView";

// Seats: 0 you (bottom), 1 right, 2 partner (top), 3 left. Teams: {0,2} vs {1,3}.
const SEAT_LABEL = ["你", "对手·右", "队友", "对手·左"];
const teamOf = (i: number) => (i % 2 === 0 ? 0 : 1);
const partnerOf = (i: number) => (i + 2) % 4;
const teamName = (t: number) => (t === 0 ? "我方" : "对方");

interface Player {
  name: string;
  isAI: boolean;
  cards: Card[];
  finished: boolean;
}

type Phase = "lobby" | "playing" | "dealOver" | "matchOver";

interface Game {
  players: Player[];
  current: number;
  lastPlay: Combo | null;
  lastPlayer: number;
  passed: Set<number>;
  plays: (Card[] | null)[]; // most recent play shown per seat
  finishOrder: number[];
  dealLevel: string;         // the level card in play this deal
  levels: [string, string];  // team A (0) and team B (1) progress
  onLevelTeam: number;       // team whose level is the current deal level
  nextLeader: number;
  phase: Phase;
  message: string;
  result: { winnerTeam: number; gain: number; order: number[]; matchWin: boolean } | null;
  tribute: string | null;
  lastOrder: number[] | null;
}


export default function GuandanPage() {
  const gRef = useRef<Game | null>(null);
  const [, force] = useReducer((x) => x + 1, 0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [name, setName] = useState("玩家");
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    aiTimer.current = null;
  };
  useEffect(() => () => clearTimer(), []);

  const seatName = useCallback((i: number) => (i === 0 ? name || "你" : SEAT_LABEL[i]), [name]);

  // ── turn scheduling ───────────────────────────────────────────────────────
  const scheduleAI = () => {
    const g = gRef.current!;
    clearTimer();
    if (g.phase === "playing" && g.players[g.current].isAI) {
      aiTimer.current = setTimeout(runAI, 700 + Math.random() * 700);
    }
  };

  const nextActive = (g: Game, from: number) => {
    for (let k = 1; k <= 4; k++) {
      const j = (from + k) % 4;
      if (!g.players[j].finished) return j;
    }
    return from;
  };

  const endDeal = (g: Game) => {
    const rest = [0, 1, 2, 3].filter((p) => !g.players[p].finished);
    const order = [...g.finishOrder, ...rest];
    const head = order[0];
    const winnerTeam = teamOf(head);
    const partnerPos = order.indexOf(partnerOf(head));
    const gain = partnerPos === 1 ? 3 : partnerPos === 2 ? 2 : 1;

    const idxCur = LEVEL_SEQ.indexOf(g.levels[winnerTeam]);
    const idxA = LEVEL_SEQ.indexOf("A");
    const wasPlayingA = g.dealLevel === "A" && winnerTeam === g.onLevelTeam;
    const matchWin = wasPlayingA;
    g.levels[winnerTeam] = LEVEL_SEQ[Math.min(idxCur + gain, idxA)];
    g.onLevelTeam = winnerTeam;
    g.dealLevel = g.levels[winnerTeam];
    g.nextLeader = head;
    g.lastOrder = order;
    g.result = { winnerTeam, gain, order, matchWin };
    g.phase = matchWin ? "matchOver" : "dealOver";
    g.message = matchWin
      ? `${teamName(winnerTeam)}打过 A，赢得整场！`
      : `本局结束 — ${teamName(winnerTeam)}升 ${gain} 级`;
  };

  const registerFinish = (g: Game, idx: number) => {
    g.players[idx].finished = true;
    g.finishOrder.push(idx);
    if (g.finishOrder.length === 2 && teamOf(g.finishOrder[0]) === teamOf(g.finishOrder[1])) {
      endDeal(g); // 双下
      return;
    }
    if (g.finishOrder.length === 3) endDeal(g);
  };

  const doPlay = (g: Game, idx: number, cards: Card[]) => {
    const combo = analyze(cards, g.dealLevel);
    if (!combo) return; // should never happen (validated before)
    const ids = new Set(cards.map((c) => c.id));
    g.players[idx].cards = g.players[idx].cards.filter((c) => !ids.has(c.id));
    g.lastPlay = combo;
    g.lastPlayer = idx;
    g.passed = new Set();
    g.plays = g.plays.map((p, i) => (i === idx ? cards : p));
    g.message = `${seatName(idx)}出牌`;
    if (g.players[idx].cards.length === 0) registerFinish(g, idx);
    if (g.phase === "playing") g.current = nextActive(g, idx);
  };

  const doPass = (g: Game, idx: number) => {
    g.passed.add(idx);
    g.message = `${seatName(idx)}不要`;
    const active = [0, 1, 2, 3].filter((p) => !g.players[p].finished);
    const othersActive = active.filter((p) => p !== g.lastPlayer);
    if (othersActive.length > 0 && othersActive.every((p) => g.passed.has(p))) {
      // round over — the last player to lay cards leads a fresh round
      g.lastPlay = null;
      g.passed = new Set();
      g.plays = [null, null, null, null];
      g.current = g.players[g.lastPlayer].finished ? nextActive(g, g.lastPlayer) : g.lastPlayer;
    } else {
      g.current = nextActive(g, idx);
    }
  };

  const runAI = () => {
    const g = gRef.current!;
    if (g.phase !== "playing") return;
    const idx = g.current;
    const p = g.players[idx];
    const move = decideAIMove({
      hand: p.cards,
      last: g.lastPlay,
      lastIsTeammate: g.lastPlay != null && teamOf(g.lastPlayer) === teamOf(idx),
      level: g.dealLevel,
      lastPlayerCardsLeft: g.lastPlayer >= 0 ? g.players[g.lastPlayer].cards.length : 27,
    });
    if (move && move.length) doPlay(g, idx, move);
    else doPass(g, idx);
    force();
    scheduleAI();
  };

  // ── setup ───────────────────────────────────────────────────────────────
  // 进贡/还贡 — mirrors the server engine. Returns a leader override or null.
  const applyTribute = (g: Game, order: number[]): number | null => {
    const lvl = g.dealLevel;
    const ps = g.players;
    const biggest = (hand: Card[]) =>
      hand.filter((c) => !isWild(c, lvl)).reduce((a, b) => (cardVal(b, lvl) > cardVal(a, lvl) ? b : a));
    const twoBigJokers = (hand: Card[]) => hand.filter((c) => c.rank === "大王").length >= 2;
    const smallReturn = (hand: Card[]) => {
      const small = hand.filter((c) => BASE[c.rank] <= 10);
      const pool = small.length ? small : hand;
      return pool.reduce((a, b) => (BASE[b.rank] < BASE[a.rank] ? b : a));
    };
    const move = (frm: number, to: number, card: Card) => {
      ps[frm].cards = ps[frm].cards.filter((c) => c.id !== card.id);
      ps[to].cards.push(card);
    };
    const nm = (i: number) => ps[i].name;
    const events: string[] = [];
    let leader: number | null = null;
    const head = order[0];
    const wteam = teamOf(head);
    const double = teamOf(order[0]) === teamOf(order[1]);

    if (double) {
      const pays: [number, Card][] = [];
      for (const p of [order[2], order[3]]) {
        if (twoBigJokers(ps[p].cards)) events.push(`${nm(p)} 抗贡（双大王）`);
        else pays.push([p, biggest(ps[p].cards)]);
      }
      if (!pays.length) leader = head;
      else {
        pays.sort((a, b) => cardVal(b[1], lvl) - cardVal(a[1], lvl));
        const receivers = [head, order[1]];
        pays.forEach(([payer, card], i) => {
          const recv = i < receivers.length ? receivers[i] : head;
          move(payer, recv, card);
          const ret = smallReturn(ps[recv].cards);
          move(recv, payer, ret);
          events.push(`${nm(payer)}进贡${card.suit}${card.rank}给${nm(recv)}（还${ret.suit}${ret.rank}）`);
        });
        leader = pays[0][0];
      }
    } else {
      const losers = order.filter((p) => teamOf(p) !== wteam);
      const payer = losers[losers.length - 1];
      if (twoBigJokers(ps[payer].cards)) {
        events.push(`${nm(payer)} 抗贡（双大王）`);
        leader = head;
      } else {
        const card = biggest(ps[payer].cards);
        move(payer, head, card);
        const ret = smallReturn(ps[head].cards);
        move(head, payer, ret);
        events.push(`${nm(payer)}进贡${card.suit}${card.rank}给${nm(head)}（还${ret.suit}${ret.rank}）`);
        leader = payer;
      }
    }
    g.players.forEach((pl) => { pl.cards = sortHand(pl.cards, lvl); });
    g.tribute = events.length ? events.join("；") : null;
    return leader;
  };

  const startDeal = (g: Game, leader: number, tributeFrom?: number[] | null) => {
    const hands = deal();
    g.players.forEach((pl, i) => {
      pl.cards = sortHand(hands[i], g.dealLevel);
      pl.finished = false;
    });
    g.lastPlay = null;
    g.lastPlayer = -1;
    g.passed = new Set();
    g.plays = [null, null, null, null];
    g.finishOrder = [];
    g.result = null;
    g.phase = "playing";
    g.tribute = null;
    if (tributeFrom) {
      const ov = applyTribute(g, tributeFrom);
      if (ov !== null) leader = ov;
    }
    g.current = leader;
    g.message = g.tribute ? `进贡完成，${g.tribute}，出牌吧！` : "新的一局，出牌吧！";
    setSelected(new Set());
  };

  const startMatch = () => {
    const g: Game = {
      players: [
        { name: name || "你", isAI: false, cards: [], finished: false },
        { name: SEAT_LABEL[1], isAI: true, cards: [], finished: false },
        { name: SEAT_LABEL[2], isAI: true, cards: [], finished: false },
        { name: SEAT_LABEL[3], isAI: true, cards: [], finished: false },
      ],
      current: 0,
      lastPlay: null,
      lastPlayer: -1,
      passed: new Set(),
      plays: [null, null, null, null],
      finishOrder: [],
      dealLevel: "2",
      levels: ["2", "2"],
      onLevelTeam: 0,
      nextLeader: 0,
      phase: "playing",
      message: "",
      result: null,
      tribute: null,
      lastOrder: null,
    };
    gRef.current = g;
    startDeal(g, Math.floor(Math.random() * 4));
    force();
    scheduleAI();
  };

  const nextDeal = () => {
    const g = gRef.current!;
    startDeal(g, g.nextLeader, g.lastOrder);
    force();
    scheduleAI();
  };

  const backToLobby = () => {
    clearTimer();
    gRef.current = null;
    force();
  };

  // ── human actions ─────────────────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const myTurn = () => {
    const g = gRef.current;
    return g != null && g.phase === "playing" && g.current === 0;
  };

  const humanPlay = () => {
    const g = gRef.current!;
    if (!myTurn()) return;
    const cards = g.players[0].cards.filter((c) => selected.has(c.id));
    if (cards.length === 0) {
      g.message = "请先选择要出的牌";
      force();
      return;
    }
    const combo = analyze(cards, g.dealLevel);
    if (!combo) {
      g.message = "牌型不合法，请重新选择";
      force();
      return;
    }
    if (!canBeat(combo, g.lastPlay)) {
      g.message = "压不过上家，请重选或点“不要”";
      force();
      return;
    }
    doPlay(g, 0, cards);
    setSelected(new Set());
    force();
    scheduleAI();
  };

  const humanPass = () => {
    const g = gRef.current!;
    if (!myTurn() || !g.lastPlay) return; // can't pass when leading
    doPass(g, 0);
    setSelected(new Set());
    force();
    scheduleAI();
  };

  const hint = () => {
    const g = gRef.current!;
    if (!myTurn()) return;
    const hand = g.players[0].cards;
    let move: Card[] | null = null;
    if (!g.lastPlay) {
      move = [sortHand(hand, g.dealLevel)[0]];
    } else {
      move = findNonBombBeat(hand, g.lastPlay, g.dealLevel);
      if (!move) {
        for (const b of findBombs(hand, g.dealLevel)) {
          const bc = analyze(b, g.dealLevel);
          if (bc && canBeat(bc, g.lastPlay)) { move = b; break; }
        }
      }
    }
    if (move) setSelected(new Set(move.map((c) => c.id)));
    else {
      g.message = "没有能压过的牌，只能“不要”";
      force();
    }
  };

  const g = gRef.current;

  // ── render: lobby ─────────────────────────────────────────────────────────
  const header = (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/projects/guandan">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回游戏大厅
        </Link>
      </Button>
      <h1 className="text-4xl md:text-5xl font-bold mb-2">掼蛋 · 单机练习</h1>
      <p className="text-muted-foreground max-w-3xl">
        与三台电脑对战（你 + AI 队友 对 两台 AI）。含炸弹/同花顺/天王炸、红桃逢人配（百搭）与局间进贡/还贡，逐级打级至 A 获胜。
      </p>
    </motion.div>
  );

  if (!g) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {header}
        <div className="max-w-md mx-auto space-y-4">
          <UICard>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                入座：你坐下方，其余三席由电脑补齐
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">用户名</label>
                <div className="flex gap-2">
                  <Input value={name} maxLength={16} onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") startMatch(); }} placeholder="输入用户名入座" />
                  <Button onClick={startMatch} disabled={!name.trim()}>
                    <Play className="mr-1 h-4 w-4" /> 入座开始
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                当前为人机版（你 + AI 队友 对 两台 AI）。线上真人 2v2 等座对战为后续计划。
              </div>
            </CardContent>
          </UICard>
        </div>
      </div>
    );
  }

  const finishRankText = (idx: number) => {
    const pos = g.finishOrder.indexOf(idx);
    return pos === 0 ? "头游" : pos === 1 ? "二游" : pos === 2 ? "三游" : g.players[idx].finished ? "末游" : "";
  };

  // opponent / partner seat box (backs + count + last play)
  const SeatBox = ({ idx }: { idx: number }) => {
    const p = g.players[idx];
    const isTurn = g.current === idx && g.phase === "playing";
    const mine = teamOf(idx) === 0;
    return (
      <div className={`rounded-xl p-3 border-2 transition-colors ${isTurn ? "border-yellow-400 bg-yellow-50/60" : "border-transparent bg-black/5"}`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-semibold text-sm flex items-center gap-1">
            {seatName(idx)}
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${mine ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              {teamName(teamOf(idx))}
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            {p.finished ? finishRankText(idx) : `${p.cards.length}张`}
          </span>
        </div>
        {/* card backs */}
        <div className="flex -space-x-3 min-h-[2.5rem] items-center">
          {!p.finished &&
            Array.from({ length: Math.min(p.cards.length, 10) }).map((_, i) => (
              <CardBack key={i} size="sm" />
            ))}
        </div>
        {/* last play */}
        {g.plays[idx] && (
          <div className="mt-2 flex flex-wrap gap-1">
            {g.plays[idx]!.map((c) => (
              <CardFace key={c.id} card={c} level={g.dealLevel} size="sm" />
            ))}
          </div>
        )}
      </div>
    );
  };

  const myHand = sortHand(g.players[0].cards, g.dealLevel);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {header}

      {/* scoreboard */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
        <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-medium">
          我方等级 {g.levels[0]}
        </span>
        <span className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 font-medium">
          对方等级 {g.levels[1]}
        </span>
        <span className="px-3 py-1.5 rounded-lg bg-muted">本局打 <b>{g.dealLevel}</b></span>
        <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800">百搭 <b>♥{g.dealLevel}</b></span>
        <span className="ml-auto text-muted-foreground">{g.message}</span>
      </div>

      {g.tribute && (
        <div className="mb-3 text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">
          🎴 进贡：{g.tribute}
        </div>
      )}

      {/* table */}
      <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-emerald-800/90 to-emerald-950 text-white shadow-inner space-y-4">
        {/* top: partner */}
        <div className="max-w-sm mx-auto"><SeatBox idx={2} /></div>

        {/* middle: left | center | right */}
        <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-3 items-stretch">
          <SeatBox idx={3} />
          <div className="rounded-xl bg-black/25 p-3 flex flex-col items-center justify-center min-h-[180px] text-center">
            {g.lastPlay ? (
              <>
                <div className="text-xs text-white/70 mb-1">{seatName(g.lastPlayer)} 出了 {g.lastPlay.kind}</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {g.lastPlay.cards.map((c) => (
                    <CardFace key={c.id} card={c} level={g.dealLevel} size="md" />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-white/70">{g.phase === "playing" ? `轮到 ${seatName(g.current)} 首出` : ""}</div>
            )}
          </div>
          <SeatBox idx={1} />
        </div>

        {/* bottom: you */}
        <div className="rounded-xl p-3 border-2 border-transparent bg-black/10">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm flex items-center gap-1">
              {seatName(0)}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">我方</span>
              {g.players[0].finished && <span className="text-xs text-white/70">{finishRankText(0)}</span>}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${g.current === 0 && g.phase === "playing" ? "bg-yellow-400 text-black" : "text-white/70"}`}>
              {g.current === 0 && g.phase === "playing" ? "轮到你" : `${g.players[0].cards.length}张`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 justify-center">
            {myHand.map((c) => (
              <CardFace key={c.id} card={c} level={g.dealLevel} size="lg"
                selected={selected.has(c.id)} onClick={() => toggleSelect(c.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {g.phase === "playing" && (
          <>
            <Button onClick={humanPlay} disabled={!myTurn() || selected.size === 0}>出牌</Button>
            <Button variant="outline" onClick={humanPass} disabled={!myTurn() || !g.lastPlay}>不要</Button>
            <Button variant="outline" onClick={hint} disabled={!myTurn()}>
              <Lightbulb className="mr-1 h-4 w-4" /> 提示
            </Button>
          </>
        )}
        {g.phase === "dealOver" && (
          <Button onClick={nextDeal}>
            <Play className="mr-1 h-4 w-4" /> 下一局
          </Button>
        )}
        {g.phase === "matchOver" && (
          <Button onClick={backToLobby}>
            <RotateCcw className="mr-1 h-4 w-4" /> 再来一场
          </Button>
        )}
        <Button variant="ghost" onClick={backToLobby}>退出</Button>
      </div>

      {/* result banner */}
      {g.result && (g.phase === "dealOver" || g.phase === "matchOver") && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto mt-4 rounded-xl border p-4 text-center space-y-1">
          <div className="text-lg font-bold">
            {g.result.matchWin ? "🏆 " : ""}{teamName(g.result.winnerTeam)}获胜 · 升 {g.result.gain} 级
          </div>
          <div className="text-sm text-muted-foreground">
            名次：{g.result.order.map((idx, i) => `${["头游", "二游", "三游", "末游"][i]}=${seatName(idx)}`).join("，")}
          </div>
          <div className="text-sm">我方 {g.levels[0]} · 对方 {g.levels[1]}</div>
        </motion.div>
      )}
    </div>
  );
}
