"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Bot, Lightbulb, Loader2, LogOut, Users, Wrench } from "lucide-react";
import { API_BASE_URL, getPlayerId, getPlayerName, TableView, ViewState } from "../../net";
import { analyze, canBeat, findNonBombBeat, findBombs, sortHand, Card } from "../../engine";
import { CardFace, CardBack } from "../../CardView";

const ONLINE_ENABLED = process.env.NEXT_PUBLIC_GUANDAN_ONLINE === "1";

const teamOf = (i: number) => (i % 2 === 0 ? 0 : 1);
const teamName = (t: number) => (t === 0 ? "我方" : "对方");

/** Rotate absolute seat index so the viewer is always at the bottom. */
function relPos(seat: number, mySeat: number): "bottom" | "right" | "top" | "left" {
  const base = mySeat >= 0 ? mySeat : 0;
  const d = (seat - base + 4) % 4;
  return (["bottom", "right", "top", "left"] as const)[d];
}

export default function GuandanTablePage() {
  const params = useParams();
  const locale = useLocale();
  const tableId = Number(params.id);

  const [view, setView] = useState<TableView | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pid = useRef<string>("");

  useEffect(() => { pid.current = getPlayerId(); }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/guandan/tables/${tableId}?player_id=${encodeURIComponent(getPlayerId())}`);
      if (res.ok) setView(await res.json());
    } catch {
      /* keep last */
    }
  }, [tableId]);

  useEffect(() => {
    if (!ONLINE_ENABLED) return; // online hall disabled — send no requests
    poll();
    // Pause polling while the tab is hidden (background tabs shouldn't keep hitting the server).
    const iv = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) poll();
    }, 1500);
    return () => clearInterval(iv);
  }, [poll]);

  const post = async (path: string, body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/guandan/tables/${tableId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setToast(data.detail || "操作失败"); return null; }
      if (data.state !== undefined) setView(data as TableView);
      return data;
    } catch {
      setToast("网络错误");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const st: ViewState | null = view?.state ?? null;
  const mySeat = view?.mySeat ?? -1;

  const toggle = (id: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const myTurn = () => st != null && st.phase === "playing" && st.current === mySeat && mySeat >= 0;

  const myHand: Card[] = st && mySeat >= 0 && st.players[mySeat].cards
    ? sortHand(st.players[mySeat].cards as Card[], st.dealLevel)
    : [];

  const play = async () => {
    if (!myTurn()) return;
    const cards = myHand.filter((c) => selected.has(c.id));
    if (!cards.length) { setToast("请选择要出的牌"); return; }
    const combo = analyze(cards, st!.dealLevel);
    if (!combo) { setToast("牌型不合法"); return; }
    if (!canBeat(combo, st!.lastPlay)) { setToast("压不过上家"); return; }
    setSelected(new Set());
    await post("action", { player_id: pid.current, action: "play", card_ids: cards.map((c) => c.id) });
  };
  const pass = async () => {
    if (!myTurn() || !st!.lastPlay) return;
    setSelected(new Set());
    await post("action", { player_id: pid.current, action: "pass" });
  };
  const hint = () => {
    if (!myTurn()) return;
    let move: Card[] | null = null;
    if (!st!.lastPlay) move = [myHand[0]];
    else {
      move = findNonBombBeat(myHand, st!.lastPlay, st!.dealLevel);
      if (!move) for (const b of findBombs(myHand, st!.dealLevel)) {
        const bc = analyze(b, st!.dealLevel);
        if (bc && canBeat(bc, st!.lastPlay)) { move = b; break; }
      }
    }
    if (move) setSelected(new Set(move.map((c) => c.id)));
    else setToast("没有能压过的牌，只能不要");
  };

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 1800); return () => clearTimeout(t); } }, [toast]);

  const header = (
    <div className="mb-4 flex items-center justify-between gap-2">
      <Button variant="ghost" asChild size="sm">
        <Link href={`/${locale}/projects/guandan`}>
          <ArrowLeft className="mr-1 h-4 w-4" /> 大厅
        </Link>
      </Button>
      <div className="font-semibold truncate">{view?.name || "牌桌"}</div>
      <Button variant="ghost" size="sm" onClick={async () => { await post("leave", { player_id: pid.current }); window.location.href = `/${locale}/projects/guandan`; }}>
        <LogOut className="mr-1 h-4 w-4" /> 离桌
      </Button>
    </div>
  );

  if (!ONLINE_ENABLED) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-md">
        <div className="mb-4">
          <Button variant="ghost" asChild size="sm">
            <Link href={`/${locale}/projects/guandan`}>
              <ArrowLeft className="mr-1 h-4 w-4" /> 大厅
            </Link>
          </Button>
        </div>
        <UICard>
          <CardContent className="pt-6 text-center space-y-3">
            <Wrench className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="text-lg font-semibold">在线对战维护中</div>
            <p className="text-sm text-muted-foreground">在线掼蛋暂时关闭，即将上线。</p>
          </CardContent>
        </UICard>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="container mx-auto px-4 py-10">
        {header}
        <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </div>
    );
  }

  // ── waiting room ──────────────────────────────────────────────────────────
  if (view.status === "waiting") {
    const seated = view.mySeat >= 0;
    return (
      <div className="container mx-auto px-4 py-8 max-w-xl">
        {header}
        <UICard>
          <CardContent className="pt-6 space-y-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> 等待入座（对面为队友：座位 1↔3、2↔4）
            </div>
            <div className="grid grid-cols-2 gap-3">
              {view.seats.map((s, i) => (
                <div key={i} className={`rounded-lg border-2 p-3 ${teamOf(i) === 0 ? "border-emerald-200" : "border-rose-200"}`}>
                  <div className="text-xs text-muted-foreground mb-1">座位 {i + 1} · {teamName(teamOf(i))}</div>
                  {s.type === "empty" ? (
                    <div className="flex gap-2">
                      {!seated && (
                        <Button size="sm" onClick={() => post("join", { player_id: pid.current, player_name: getPlayerName() || "玩家", seat: i })}>
                          入座
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => post("add_ai", { seat: i })}>
                        <Bot className="mr-1 h-4 w-4" /> 加AI
                      </Button>
                    </div>
                  ) : (
                    <div className="font-medium flex items-center gap-1">
                      {s.type === "ai" && <Bot className="h-4 w-4 text-muted-foreground" />}
                      {s.name}
                      {i === view.mySeat && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded">你</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" disabled={!seated || busy} onClick={() => post("start", { player_id: pid.current })}>
                <Play className="mr-1 h-4 w-4" /> 开始（空位自动补 AI）
              </Button>
            </div>
            {!seated && <div className="text-xs text-muted-foreground">你在围观 — 点任意空位“入座”加入。</div>}
          </CardContent>
        </UICard>
        {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-lg">{toast}</div>}
      </div>
    );
  }

  // ── in game ───────────────────────────────────────────────────────────────
  const seatBox = (seat: number) => {
    if (!st) return null;
    const p = st.players[seat];
    const isTurn = st.current === seat && st.phase === "playing";
    const viewerTeam = teamOf(mySeat >= 0 ? mySeat : 0);
    const mine = teamOf(seat) === viewerTeam; // same team as viewer
    const pos = relPos(seat, mySeat);
    const finishTxt = (() => {
      const idx = st.finishOrder.indexOf(seat);
      return idx === 0 ? "头游" : idx === 1 ? "二游" : idx === 2 ? "三游" : p.finished ? "末游" : "";
    })();
    return (
      <div className={`rounded-xl p-2.5 border-2 ${isTurn ? "border-yellow-400 bg-yellow-50/70" : "border-transparent bg-black/5"}`}>
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-semibold text-sm flex items-center gap-1 truncate">
            {p.type === "ai" && <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
            {p.name}
            {seat === mySeat && <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">你</span>}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">{p.finished ? finishTxt : `${p.count}张`}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${mine ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
            {pos === "bottom" ? "你" : mine ? "队友" : "对手"}
          </span>
          {!p.finished && seat !== mySeat && (
            <div className="flex -space-x-3">
              {Array.from({ length: Math.min(p.count, 8) }).map((_, i) => (
                <CardBack key={i} size="sm" />
              ))}
            </div>
          )}
        </div>
        {st.plays[seat] && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {st.plays[seat]!.map((c) => (
              <CardFace key={c.id} card={c} level={st.dealLevel} size="sm" />
            ))}
          </div>
        )}
      </div>
    );
  };

  // map relative positions to absolute seats
  const posSeat: Record<string, number> = {};
  if (st) for (let s = 0; s < 4; s++) posSeat[relPos(s, mySeat)] = s;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {header}

      {st && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">我方 {st.levels[0]}</span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800">对方 {st.levels[1]}</span>
            <span className="px-2.5 py-1 rounded-lg bg-muted">本局打 <b>{st.dealLevel}</b></span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800">百搭 <b>♥{st.dealLevel}</b></span>
            <span className="ml-auto text-muted-foreground truncate">{st.message}</span>
          </div>

          {st.tribute && (
            <div className="mb-3 text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">
              🎴 进贡：{st.tribute}
            </div>
          )}

          <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-emerald-800/90 to-emerald-950 text-white space-y-4">
            <div className="max-w-sm mx-auto">{seatBox(posSeat["top"])}</div>
            <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-3 items-stretch">
              {seatBox(posSeat["left"])}
              <div className="rounded-xl bg-black/25 p-3 flex flex-col items-center justify-center min-h-[180px] text-center">
                {st.lastPlay ? (
                  <>
                    <div className="text-xs text-white/70 mb-1">{st.players[st.lastPlayer]?.name} · {st.lastPlay.kind}</div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {st.lastPlay.cards.map((c) => (
                        <CardFace key={c.id} card={c} level={st.dealLevel} size="md" />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-white/70">{st.phase === "playing" ? `${st.players[st.current]?.name} 首出` : ""}</div>
                )}
              </div>
              {seatBox(posSeat["right"])}
            </div>

            {/* your hand */}
            <div className="rounded-xl p-2.5 bg-black/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">你的手牌</span>
                <span className={`text-xs px-2 py-0.5 rounded ${myTurn() ? "bg-yellow-400 text-black" : "text-white/70"}`}>
                  {mySeat < 0 ? "围观" : myTurn() ? "轮到你" : `${myHand.length}张`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 justify-center">
                {myHand.map((c) => (
                  <CardFace key={c.id} card={c} level={st.dealLevel} size="lg"
                    selected={selected.has(c.id)} onClick={() => toggle(c.id)} />
                ))}
                {mySeat < 0 && <div className="text-sm text-white/60 py-4">你在围观本局</div>}
              </div>
            </div>
          </div>

          {/* controls */}
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {st.phase === "playing" && mySeat >= 0 && (
              <>
                <Button onClick={play} disabled={!myTurn() || selected.size === 0 || busy}>出牌</Button>
                <Button variant="outline" onClick={pass} disabled={!myTurn() || !st.lastPlay || busy}>不要</Button>
                <Button variant="outline" onClick={hint} disabled={!myTurn()}>
                  <Lightbulb className="mr-1 h-4 w-4" /> 提示
                </Button>
              </>
            )}
            {st.phase === "dealOver" && mySeat >= 0 && (
              <Button onClick={() => post("next_deal", { player_id: pid.current })} disabled={busy}>
                <Play className="mr-1 h-4 w-4" /> 下一局
              </Button>
            )}
            {st.phase === "matchOver" && (
              <Button asChild>
                <Link href={`/${locale}/projects/guandan`}>返回大厅</Link>
              </Button>
            )}
          </div>

          {st.result && (st.phase === "dealOver" || st.phase === "matchOver") && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto mt-4 rounded-xl border p-4 text-center space-y-1">
              <div className="text-lg font-bold">
                {st.result.matchWin ? "🏆 " : ""}{teamName(st.result.winnerTeam)}获胜 · 升 {st.result.gain} 级
              </div>
              <div className="text-sm text-muted-foreground">
                {st.result.order.map((idx, i) => `${["头游", "二游", "三游", "末游"][i]}=${st.players[idx]?.name}`).join("，")}
              </div>
            </motion.div>
          )}
        </>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-lg z-50">{toast}</div>}
    </div>
  );
}
