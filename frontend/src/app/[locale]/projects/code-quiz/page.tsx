"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle, Trophy, Flame, Plane, Building2, Loader2, RefreshCw } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";
const BEST_STREAK_KEY = "code_quiz_best_streak";

type Entry = { code: string; name: string };
type Category = "airline" | "airport" | "mixed";
type Direction = "both" | "zh2code" | "code2zh";
type Kind = "airline" | "airport";

interface Question {
  kind: Kind;             // which pool this question came from
  promptKind: "name" | "code"; // what we show
  prompt: string;         // the shown value
  answer: string;         // the correct option
  options: string[];      // 4 shuffled options
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Keep the first entry for each distinct name so name→code questions are unambiguous.
function dedupeByName(entries: Entry[]): Entry[] {
  const seen = new Set<string>();
  const out: Entry[] = [];
  for (const e of entries) {
    if (!e.code || !e.name) continue;
    if (seen.has(e.name)) continue;
    seen.add(e.name);
    out.push(e);
  }
  return out;
}

function buildQuestion(pool: Entry[], kind: Kind, direction: Direction): Question | null {
  if (pool.length < 4) return null;
  const promptKind: "name" | "code" =
    direction === "zh2code" ? "name" : direction === "code2zh" ? "code" : Math.random() < 0.5 ? "name" : "code";
  const answerKey = promptKind === "name" ? "code" : "name";

  const entry = pool[Math.floor(Math.random() * pool.length)];
  const answer = entry[answerKey];
  const prompt = entry[promptKind];

  const options = new Set<string>([answer]);
  const bag = shuffle(pool);
  for (const e of bag) {
    if (options.size >= 4) break;
    const v = e[answerKey];
    if (v && v !== answer && !options.has(v)) options.add(v);
  }
  if (options.size < 4) return null;
  return { kind, promptKind, prompt, answer, options: shuffle([...options]) };
}

const CATEGORY_LABELS: Record<Category, string> = { airline: "航司", airport: "机场", mixed: "混合" };
const DIRECTION_LABELS: Record<Direction, string> = { both: "双向", zh2code: "中文 → 代码", code2zh: "代码 → 中文" };

export default function CodeQuizPage() {
  const [airlines, setAirlines] = useState<Entry[]>([]);
  const [airports, setAirports] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [category, setCategory] = useState<Category>("mixed");
  const [direction, setDirection] = useState<Direction>("both");

  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem(BEST_STREAK_KEY) || "0", 10);
    if (!Number.isNaN(saved)) setBestStreak(saved);
  }, []);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const nextQuestion = useCallback(
    (cat: Category, dir: Direction) => {
      const canAirline = airlines.length >= 4;
      const canAirport = airports.length >= 4;
      let kind: Kind;
      if (cat === "airline") kind = "airline";
      else if (cat === "airport") kind = "airport";
      else {
        // mixed — pick from whichever pools are usable
        if (canAirline && canAirport) kind = Math.random() < 0.5 ? "airline" : "airport";
        else kind = canAirline ? "airline" : "airport";
      }
      const pool = kind === "airline" ? airlines : airports;
      setSelected(null);
      setQuestion(buildQuestion(pool, kind, dir));
    },
    [airlines, airports]
  );

  // Build the first question once data is ready.
  useEffect(() => {
    if (!loading && !loadError && !question) nextQuestion(category, direction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadError]);

  const answered = selected !== null;

  const handleAnswer = (opt: string) => {
    if (answered || !question) return;
    setSelected(opt);
    setTotal((t) => t + 1);
    if (opt === question.answer) {
      setScore((s) => s + 1);
      setStreak((st) => {
        const ns = st + 1;
        setBestStreak((b) => {
          const nb = Math.max(b, ns);
          if (nb !== b) localStorage.setItem(BEST_STREAK_KEY, String(nb));
          return nb;
        });
        return ns;
      });
    } else {
      setStreak(0);
    }
  };

  const changeCategory = (c: Category) => {
    setCategory(c);
    nextQuestion(c, direction);
  };
  const changeDirection = (d: Direction) => {
    setDirection(d);
    nextQuestion(category, d);
  };

  const resetStats = () => {
    setScore(0);
    setTotal(0);
    setStreak(0);
    nextQuestion(category, direction);
  };

  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

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
          中文名与 IATA 代码双向选择题。选择类别与方向，看看你能连对多少题！
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
          {/* Settings */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">类别</div>
                <div className="flex gap-2 flex-wrap">
                  {(["airline", "airport", "mixed"] as Category[]).map((c) => (
                    <Button
                      key={c}
                      size="sm"
                      variant={category === c ? "default" : "outline"}
                      onClick={() => changeCategory(c)}
                    >
                      {c === "airline" && <Plane className="mr-1 h-4 w-4" />}
                      {c === "airport" && <Building2 className="mr-1 h-4 w-4" />}
                      {CATEGORY_LABELS[c]}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">出题方向</div>
                <div className="flex gap-2 flex-wrap">
                  {(["both", "zh2code", "code2zh"] as Direction[]).map((d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant={direction === d ? "default" : "outline"}
                      onClick={() => changeDirection(d)}
                    >
                      {DIRECTION_LABELS[d]}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold">
                  {score}
                  <span className="text-base text-muted-foreground font-normal">/{total}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">得分（正确率 {accuracy}%）</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold flex items-center justify-center gap-1 text-orange-500">
                  <Flame className="h-5 w-5" />
                  {streak}
                </div>
                <div className="text-xs text-muted-foreground mt-1">当前连对</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold flex items-center justify-center gap-1 text-amber-500">
                  <Trophy className="h-5 w-5" />
                  {bestStreak}
                </div>
                <div className="text-xs text-muted-foreground mt-1">最高连对</div>
              </CardContent>
            </Card>
          </div>

          {/* Question */}
          {question && (
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
                    let cls =
                      "justify-start h-auto py-3 px-4 text-left whitespace-normal border-2 transition-colors";
                    if (!answered) {
                      cls += " hover:border-primary/60";
                    } else if (isAnswer) {
                      cls += " border-green-500 bg-green-50 text-green-800";
                    } else if (isPicked) {
                      cls += " border-red-500 bg-red-50 text-red-800";
                    } else {
                      cls += " opacity-50";
                    }
                    return (
                      <Button
                        key={opt}
                        variant="outline"
                        className={cls}
                        disabled={answered}
                        onClick={() => handleAnswer(opt)}
                      >
                        <span className={question.promptKind === "name" ? "font-mono text-lg" : "text-base"}>
                          {opt}
                        </span>
                        {answered && isAnswer && <CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />}
                        {answered && isPicked && !isAnswer && <XCircle className="ml-auto h-5 w-5 text-red-600" />}
                      </Button>
                    );
                  })}
                </div>

                {answered && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-1 flex items-center justify-between gap-3"
                  >
                    <div className="text-sm">
                      {selected === question.answer ? (
                        <span className="text-green-700 font-medium">回答正确！</span>
                      ) : (
                        <span className="text-red-700 font-medium">答错了</span>
                      )}
                      <span className="text-muted-foreground ml-2">
                        {question.promptKind === "name" ? question.prompt : question.answer}
                        {" — "}
                        <span className="font-mono">
                          {question.promptKind === "name" ? question.answer : question.prompt}
                        </span>
                      </span>
                    </div>
                    <Button onClick={() => nextQuestion(category, direction)}>下一题</Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={resetStats}>
              <RotateCcw className="mr-2 h-4 w-4" />
              重置分数
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
