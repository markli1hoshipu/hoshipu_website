"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, CheckCircle2, XCircle, Trophy, Flame, Plane, Building2,
  Loader2, RefreshCw, Timer, Play, RotateCcw, Medal,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";
const USERNAME_KEY = "code_quiz_username";
const MAX_Q = 100;            // reach 100 in a row = perfect run
const AUTO_ADVANCE_MS = 350;  // brief green flash before the next question
const REVEAL_MS = 1100;       // show the correct answer on a miss before ending

type Entry = { code: string; name: string };
type Kind = "airline" | "airport";
type Phase = "idle" | "playing" | "done";

interface Question {
  kind: Kind;
  promptKind: "name" | "code";
  prompt: string;
  answer: string;
  options: string[];
}

interface LBEntry {
  username: string;
  score: number;
  time_ms: number;
  perfect: boolean;
  created_at?: string | null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dedupeByName(entries: Entry[]): Entry[] {
  const seen = new Set<string>();
  const out: Entry[] = [];
  for (const e of entries) {
    if (!e.code || !e.name || seen.has(e.name)) continue;
    seen.add(e.name);
    out.push(e);
  }
  return out;
}

function buildQuestion(pool: Entry[], kind: Kind): Question | null {
  if (pool.length < 4) return null;
  const promptKind: "name" | "code" = Math.random() < 0.5 ? "name" : "code";
  const answerKey = promptKind === "name" ? "code" : "name";
  const entry = pool[Math.floor(Math.random() * pool.length)];
  const answer = entry[answerKey];
  const options = new Set<string>([answer]);
  for (const e of shuffle(pool)) {
    if (options.size >= 4) break;
    const v = e[answerKey];
    if (v && v !== answer && !options.has(v)) options.add(v);
  }
  if (options.size < 4) return null;
  return { kind, promptKind, prompt: entry[promptKind], answer, options: shuffle([...options]) };
}

function fmtTime(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = (s - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${rem}`;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function CodeQuizPage() {
  const [airlines, setAirlines] = useState<Entry[]>([]);
  const [airports, setAirports] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [username, setUsername] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ score: number; timeMs: number; perfect: boolean } | null>(null);

  const [board, setBoard] = useState<LBEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const startRef = useRef(0);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── data ──────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [al, ap] = await Promise.all([
        fetch(`${API_BASE_URL}/api/qff-travel/airlines`).then((r) => r.json()),
        fetch(`${API_BASE_URL}/api/qff-travel/airports`).then((r) => r.json()),
      ]);
      const alList = dedupeByName((al || []).map((x: Entry) => ({ code: x.code, name: x.name })));
      const apList = dedupeByName((ap || []).map((x: Entry) => ({ code: x.code, name: x.name })));
      setAirlines(alList);
      setAirports(apList);
      if (alList.length < 4 && apList.length < 4) setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBoard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/quiz/leaderboard?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setBoard(data.entries || []);
      }
    } catch {
      /* keep last board */
    }
  }, []);

  useEffect(() => {
    setUsername(localStorage.getItem(USERNAME_KEY) || "");
    loadData();
    loadBoard();
  }, [loadData, loadBoard]);

  // live timer while playing
  useEffect(() => {
    if (phase !== "playing") return;
    const iv = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
    return () => clearInterval(iv);
  }, [phase]);

  // clear any pending auto-advance on unmount
  useEffect(() => () => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
  }, []);

  const nextQuestion = useCallback(() => {
    const canAirline = airlines.length >= 4;
    const canAirport = airports.length >= 4;
    const kind: Kind =
      canAirline && canAirport ? (Math.random() < 0.5 ? "airline" : "airport") : canAirline ? "airline" : "airport";
    setSelected(null);
    setQuestion(buildQuestion(kind === "airline" ? airlines : airports, kind));
  }, [airlines, airports]);

  // ── run control ─────────────────────────────────────────────────────────
  const startRun = () => {
    if (!username.trim()) return;
    localStorage.setItem(USERNAME_KEY, username.trim());
    if (advanceRef.current) clearTimeout(advanceRef.current);
    setCorrect(0);
    setResult(null);
    setSelected(null);
    startRef.current = Date.now();
    setElapsed(0);
    setPhase("playing");
    nextQuestion();
  };

  const submitScore = useCallback(async (score: number, timeMs: number, perfect: boolean) => {
    setSubmitting(true);
    try {
      await fetch(`${API_BASE_URL}/api/quiz/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), score, time_ms: timeMs, perfect }),
      });
      await loadBoard();
    } catch {
      /* leaderboard refresh will retry on next load */
    } finally {
      setSubmitting(false);
    }
  }, [username, loadBoard]);

  const finish = useCallback((score: number, perfect: boolean) => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
    const el = Date.now() - startRef.current;
    setElapsed(el);
    setResult({ score, timeMs: el, perfect });
    setPhase("done");
    submitScore(score, el, perfect);
  }, [submitScore]);

  const handleAnswer = (opt: string) => {
    if (selected !== null || !question || phase !== "playing") return;
    setSelected(opt);
    if (opt === question.answer) {
      const nc = correct + 1;
      setCorrect(nc);
      if (nc >= MAX_Q) {
        advanceRef.current = setTimeout(() => finish(nc, true), 600);
      } else {
        advanceRef.current = setTimeout(() => nextQuestion(), AUTO_ADVANCE_MS);
      }
    } else {
      advanceRef.current = setTimeout(() => finish(correct, false), REVEAL_MS);
    }
  };

  const giveUp = () => finish(correct, false);

  const answered = selected !== null;

  // ── leaderboard table (shared by idle + done) ─────────────────────────────
  const renderBoard = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-amber-500" />
          排行榜
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={loadBoard}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {board.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">还没有成绩，快来抢第一！</div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-2 text-xs text-muted-foreground px-2 pb-1">
              <span>#</span>
              <span>用户名</span>
              <span className="text-right">连对</span>
              <span className="text-right w-20">用时</span>
            </div>
            {board.map((e, i) => {
              const mine = e.username === username.trim();
              return (
                <div
                  key={`${e.username}-${i}`}
                  className={`grid grid-cols-[2rem_1fr_auto_auto] gap-2 items-center px-2 py-1.5 rounded-md text-sm ${
                    mine ? "bg-primary/10 ring-1 ring-primary/30" : i % 2 ? "bg-muted/40" : ""
                  }`}
                >
                  <span className="font-medium">{MEDALS[i] || i + 1}</span>
                  <span className="truncate font-medium flex items-center gap-1">
                    {e.username}
                    {e.perfect && <span title="满分 100 连对">🏆</span>}
                  </span>
                  <span className="text-right font-mono">{e.score}</span>
                  <span className="text-right font-mono text-muted-foreground w-20">{fmtTime(e.time_ms)}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回项目列表
          </Link>
        </Button>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">航司/机场代码测验</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          混合航司与机场、中文名与代码双向出题。一直答对下去 —— 答错即结束，连对越多越强！连对满 100
          题为满分，此时比拼用时。
        </p>
      </motion.div>

      {loading && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            正在加载航司/机场数据…（后端首次唤醒可能需要几秒）
          </CardContent>
        </Card>
      )}

      {!loading && loadError && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-muted-foreground">
            <XCircle className="h-8 w-8 text-red-500" />
            数据加载失败，请重试
            <Button onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重新加载
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !loadError && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* IDLE — enter name + start */}
          {phase === "idle" && (
            <>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">用户名</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="输入用户名上榜"
                        value={username}
                        maxLength={24}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") startRun();
                        }}
                      />
                      <Button onClick={startRun} disabled={!username.trim()}>
                        <Play className="mr-1 h-4 w-4" />
                        开始挑战
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    规则：混合出题，答错即结束；连对数为成绩（最多 100）。连对满 100 者按用时排名。
                  </p>
                </CardContent>
              </Card>
              {renderBoard()}
            </>
          )}

          {/* PLAYING */}
          {phase === "playing" && question && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-lg font-bold text-orange-500">
                  <Flame className="h-5 w-5" />
                  {correct}
                  <span className="text-sm text-muted-foreground font-normal">/ {MAX_Q} 连对</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  {fmtTime(elapsed)}
                </div>
              </div>
              {/* progress bar */}
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(correct / MAX_Q) * 100}%` }}
                />
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1">
                      {question.kind === "airline" ? <Plane className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                      {question.kind === "airline" ? "航司" : "机场"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {question.promptKind === "name" ? "选择正确的代码" : "选择正确的名称"}
                    </span>
                  </div>
                  <CardTitle className="pt-2 text-center">
                    <span className={question.promptKind === "code" ? "font-mono text-4xl tracking-wider" : "text-3xl"}>
                      {question.prompt}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {question.options.map((opt) => {
                      const isAnswer = opt === question.answer;
                      const isPicked = opt === selected;
                      let cls = "justify-start h-auto py-3 px-4 text-left whitespace-normal border-2 transition-colors";
                      if (!answered) cls += " hover:border-primary/60";
                      else if (isAnswer) cls += " border-green-500 bg-green-50 text-green-800";
                      else if (isPicked) cls += " border-red-500 bg-red-50 text-red-800";
                      else cls += " opacity-50";
                      return (
                        <Button
                          key={opt}
                          variant="outline"
                          className={cls}
                          disabled={answered}
                          onClick={() => handleAnswer(opt)}
                        >
                          <span className={question.promptKind === "name" ? "font-mono text-lg" : "text-base"}>{opt}</span>
                          {answered && isAnswer && <CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />}
                          {answered && isPicked && !isAnswer && <XCircle className="ml-auto h-5 w-5 text-red-600" />}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={giveUp} disabled={answered}>
                  结束挑战
                </Button>
              </div>
            </>
          )}

          {/* DONE */}
          {phase === "done" && result && (
            <>
              <Card>
                <CardContent className="py-8 text-center space-y-3">
                  {result.perfect ? (
                    <div className="text-2xl font-bold text-amber-500 flex items-center justify-center gap-2">
                      <Trophy className="h-7 w-7" /> 满分通关！
                    </div>
                  ) : (
                    <div className="text-xl font-semibold">挑战结束</div>
                  )}
                  <div className="text-5xl font-bold flex items-center justify-center gap-2 text-orange-500">
                    <Flame className="h-8 w-8" />
                    {result.score}
                    <span className="text-2xl text-muted-foreground font-normal">连对</span>
                  </div>
                  <div className="text-muted-foreground flex items-center justify-center gap-2">
                    <Timer className="h-4 w-4" />
                    用时 {fmtTime(result.timeMs)}
                    {submitting && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button onClick={startRun}>
                      <RotateCcw className="mr-1 h-4 w-4" />
                      再来一次
                    </Button>
                    <Button variant="outline" onClick={() => setPhase("idle")}>
                      <Medal className="mr-1 h-4 w-4" />
                      换用户名
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {renderBoard()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
