"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pause, Play, RotateCcw } from "lucide-react";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────
const W = 800, H = 500;
const PW = 12, PH = 84;      // paddle width / height
const BR = 8;                // ball radius
const PMARGIN = 22;          // paddle distance from wall
const WIN_SCORE = 7;
const BASE_SPEED = 5;
const MAX_SPEED = 14;
const PLAYER_SPEED = 6;

type Phase = "menu" | "playing" | "paused" | "gameover";
type Difficulty = "easy" | "medium" | "hard";

const AI_SPEED: Record<Difficulty, number> = { easy: 2.8, medium: 4.6, hard: 7.2 };

interface GS {
  ball: { x: number; y: number; vx: number; vy: number };
  player: { y: number };
  ai: { y: number };
  pScore: number;
  aScore: number;
  phase: Phase;
  winner: "player" | "ai" | null;
}

function makeBall(dir: 1 | -1 = 1) {
  const angle = (Math.random() * 50 - 25) * (Math.PI / 180);
  return { x: W / 2, y: H / 2, vx: BASE_SPEED * Math.cos(angle) * dir, vy: BASE_SPEED * Math.sin(angle) };
}

function fresh(): GS {
  return { ball: makeBall(), player: { y: H / 2 - PH / 2 }, ai: { y: H / 2 - PH / 2 }, pScore: 0, aScore: 0, phase: "menu", winner: null };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PongPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GS>(fresh());
  const keysRef = useRef<Set<string>>(new Set());
  const diffRef = useRef<Difficulty>("medium");
  const rafRef = useRef<number>(0);

  const [ui, setUi] = useState<{ pScore: number; aScore: number; phase: Phase; winner: "player" | "ai" | null }>({
    pScore: 0, aScore: 0, phase: "menu", winner: null,
  });
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);

  // sync display state at ~12fps (no need for 60fps react re-renders)
  useEffect(() => {
    const t = setInterval(() => {
      const g = gsRef.current;
      setUi({ pScore: g.pScore, aScore: g.aScore, phase: g.phase, winner: g.winner });
    }, 80);
    return () => clearInterval(t);
  }, []);

  // ── draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gsRef.current;

    ctx.fillStyle = "#080810";
    ctx.fillRect(0, 0, W, H);

    // dashed center line
    ctx.setLineDash([9, 14]);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    // score display
    ctx.font = "bold 56px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillText(String(g.pScore), W / 4, 72);
    ctx.fillText(String(g.aScore), (W * 3) / 4, 72);

    // player paddle (violet)
    ctx.shadowColor = "#8b5cf6";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(PMARGIN, g.player.y, PW, PH);

    // ai paddle (red)
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#f87171";
    ctx.fillRect(W - PMARGIN - PW, g.ai.y, PW, PH);

    // ball
    ctx.shadowColor = "#c4b5fd";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(g.ball.x, g.ball.y, BR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // speed pip row (shows current ball speed)
    const spd = Math.sqrt(g.ball.vx ** 2 + g.ball.vy ** 2);
    const pips = Math.min(Math.round(((spd - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)) * 8), 8);
    if (pips > 0 && g.phase === "playing") {
      for (let i = 0; i < pips; i++) {
        ctx.fillStyle = `hsl(${270 - i * 22}, 80%, 70%)`;
        ctx.beginPath();
        ctx.arc(W / 2 - (pips - 1) * 7 + i * 14, H - 18, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // dimming overlay when not playing
    if (g.phase !== "playing") {
      ctx.fillStyle = "rgba(0,0,0,0.58)";
      ctx.fillRect(0, 0, W, H);
    }
  }, []);

  // ── update ────────────────────────────────────────────────────────────────
  const update = useCallback(() => {
    const g = gsRef.current;
    if (g.phase !== "playing") return;

    const aiSpd = AI_SPEED[diffRef.current];

    // player movement (keyboard)
    const up = keysRef.current.has("w") || keysRef.current.has("W") || keysRef.current.has("ArrowUp");
    const dn = keysRef.current.has("s") || keysRef.current.has("S") || keysRef.current.has("ArrowDown");
    if (up) g.player.y = Math.max(0, g.player.y - PLAYER_SPEED);
    if (dn) g.player.y = Math.min(H - PH, g.player.y + PLAYER_SPEED);

    // AI: track ball center with lookahead + capped speed
    const aiCenter = g.ai.y + PH / 2;
    const target = g.ball.y + g.ball.vy * 0.35;
    const diff = target - aiCenter;
    g.ai.y = Math.max(0, Math.min(H - PH, g.ai.y + Math.sign(diff) * Math.min(Math.abs(diff), aiSpd)));

    // move ball
    g.ball.x += g.ball.vx;
    g.ball.y += g.ball.vy;

    // top / bottom walls
    if (g.ball.y - BR < 0)  { g.ball.y = BR;     g.ball.vy =  Math.abs(g.ball.vy); }
    if (g.ball.y + BR > H)  { g.ball.y = H - BR; g.ball.vy = -Math.abs(g.ball.vy); }

    // helper: paddle collision response
    const bounce = (vxDir: 1 | -1, paddleY: number) => {
      const rel = (g.ball.y - (paddleY + PH / 2)) / (PH / 2);
      const angle = rel * (Math.PI / 3.2);
      const spd = Math.min(Math.sqrt(g.ball.vx ** 2 + g.ball.vy ** 2) * 1.07, MAX_SPEED);
      g.ball.vx = vxDir * Math.cos(angle) * spd;
      g.ball.vy = Math.sin(angle) * spd;
    };

    // player paddle hit
    const pRight = PMARGIN + PW;
    if (
      g.ball.vx < 0 &&
      g.ball.x - BR <= pRight + 1 && g.ball.x - BR >= PMARGIN - 2 &&
      g.ball.y + BR >= g.player.y && g.ball.y - BR <= g.player.y + PH
    ) {
      g.ball.x = pRight + BR + 1;
      bounce(1, g.player.y);
    }

    // ai paddle hit
    const aiLeft = W - PMARGIN - PW;
    if (
      g.ball.vx > 0 &&
      g.ball.x + BR >= aiLeft - 1 && g.ball.x + BR <= W - PMARGIN + 2 &&
      g.ball.y + BR >= g.ai.y && g.ball.y - BR <= g.ai.y + PH
    ) {
      g.ball.x = aiLeft - BR - 1;
      bounce(-1, g.ai.y);
    }

    // scoring
    const reset = (dir: 1 | -1) => {
      g.ball = makeBall(dir);
      g.player.y = H / 2 - PH / 2;
      g.ai.y = H / 2 - PH / 2;
    };
    if (g.ball.x < 0) {
      g.aScore++;
      if (g.aScore >= WIN_SCORE) { g.phase = "gameover"; g.winner = "ai"; }
      else reset(1);
    }
    if (g.ball.x > W) {
      g.pScore++;
      if (g.pScore >= WIN_SCORE) { g.phase = "gameover"; g.winner = "player"; }
      else reset(-1);
    }
  }, []);

  // ── game loop ─────────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    update();
    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  // ── keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (["ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
      if (e.key === " " || e.key === "Escape") {
        const g = gsRef.current;
        if (g.phase === "playing") g.phase = "paused";
        else if (g.phase === "paused") g.phase = "playing";
      }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // ── mouse / touch ─────────────────────────────────────────────────────────
  const movePaddle = useCallback((clientY: number, rect: DOMRect) => {
    if (gsRef.current.phase !== "playing") return;
    const y = (clientY - rect.top) * (H / rect.height);
    gsRef.current.player.y = Math.max(0, Math.min(H - PH, y - PH / 2));
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    movePaddle(e.clientY, e.currentTarget.getBoundingClientRect());
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    movePaddle(e.touches[0].clientY, e.currentTarget.getBoundingClientRect());
  };

  // ── actions ───────────────────────────────────────────────────────────────
  const startGame = () => {
    const g = fresh();
    g.phase = "playing";
    gsRef.current = g;
  };
  const togglePause = () => {
    const g = gsRef.current;
    if (g.phase === "playing") g.phase = "paused";
    else if (g.phase === "paused") g.phase = "playing";
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/projects"><ArrowLeft className="mr-2 h-4 w-4" />返回项目列表</Link>
        </Button>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Pong</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          经典乒乓球游戏。W/S 或 ↑/↓ 控制，也支持鼠标/触屏。先得 {WIN_SCORE} 分获胜！
        </p>
      </motion.div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">

        {/* ── Canvas area ─────────────────────────────────────────────────── */}
        <div className="relative flex-1" style={{ maxWidth: W }}>
          <canvas
            ref={canvasRef}
            width={W} height={H}
            className="w-full rounded-xl border border-white/10 block"
            style={{ cursor: ui.phase === "playing" ? "none" : "default", touchAction: "none" }}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            aria-label="Pong game canvas"
          />

          {/* Menu */}
          {ui.phase === "menu" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl">
              <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-7 px-8">
                <div>
                  <h2 className="text-7xl font-bold text-white tracking-[0.25em] drop-shadow-2xl">PONG</h2>
                  <p className="text-white/40 mt-3 text-sm tracking-wider">W / S · ↑ ↓ · 鼠标</p>
                </div>
                <div className="flex gap-3 justify-center">
                  {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`px-5 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        difficulty === d
                          ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/50"
                          : "bg-white/8 border-white/15 text-white/55 hover:bg-white/15"
                      }`}>
                      {d === "easy" ? "简单" : d === "medium" ? "中等" : "困难"}
                    </button>
                  ))}
                </div>
                <Button size="lg" onClick={startGame} className="px-16 bg-violet-600 hover:bg-violet-700 text-base shadow-lg shadow-violet-900/50">
                  开始游戏
                </Button>
              </motion.div>
            </div>
          )}

          {/* Paused */}
          {ui.phase === "paused" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
                <h2 className="text-5xl font-bold text-white tracking-wider">暂停</h2>
                <p className="text-white/45 text-sm">空格 / ESC 继续</p>
                <Button onClick={togglePause} className="bg-violet-600 hover:bg-violet-700 px-8">
                  <Play className="mr-2 h-4 w-4" />继续
                </Button>
              </motion.div>
            </div>
          )}

          {/* Game Over */}
          {ui.phase === "gameover" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className="text-center space-y-5">
                <h2 className="text-5xl font-bold text-white">
                  {ui.winner === "player" ? "🎉 你赢了！" : "🤖 AI 赢了"}
                </h2>
                <p className="text-white/55 text-3xl font-mono tracking-widest">
                  {ui.pScore} — {ui.aScore}
                </p>
                <Button onClick={startGame} className="bg-violet-600 hover:bg-violet-700 px-12 text-base">
                  <RotateCcw className="mr-2 h-4 w-4" />再来一局
                </Button>
              </motion.div>
            </div>
          )}

          {/* In-game pause button */}
          {ui.phase === "playing" && (
            <button onClick={togglePause} className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all">
              <Pause className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="xl:w-52 space-y-4 w-full">

          {/* Score */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">比分</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-400 block" />
                  <span className="text-sm">你</span>
                </div>
                <span className="text-4xl font-bold font-mono text-violet-400">{ui.pScore}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 block" />
                  <span className="text-sm">AI</span>
                </div>
                <span className="text-4xl font-bold font-mono text-red-400">{ui.aScore}</span>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">操作</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {([["W / ↑", "向上"], ["S / ↓", "向下"], ["鼠标", "控制挡板"], ["空格/ESC", "暂停"]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-sm">
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{k}</span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Rules */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">规则</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 text-sm text-muted-foreground">
              <p>先得 <span className="text-foreground font-semibold">{WIN_SCORE}</span> 分获胜</p>
              <p>每次击球球速 +7%</p>
              <p>击中挡板边缘偏转角更大</p>
              <p>球速越快底部小点越多</p>
            </CardContent>
          </Card>

          {ui.phase === "gameover" && (
            <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={startGame}>
              <RotateCcw className="mr-2 h-4 w-4" />再来一局
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
