"use client";

import { useEffect, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
type PClass = "node" | "dot" | "micro";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  baseVy: number;         // natural falling/rising speed
  r: number;              // base radius
  phase: number;          // sinusoidal oscillation phase
  phaseSpd: number;
  amplitude: number;      // horizontal sway amplitude
  pulsePhase: number;     // radius pulse
  pulseSpd: number;
  cls: PClass;
  side: "L" | "R";
  accent: boolean;        // cyan accent vs. blue
}

// ── Config ───────────────────────────────────────────────────────────────────
const ZONE       = 0.22;   // particles stay in outer 22% on each side
const CENTER_GAP = 0.30;   // repulsion zone around center (±30% from center)
const P2P_DIST   = 190;
const MOUSE_DIST = 230;
const MOUSE_REP  = 85;     // hard repulsion radius
const MOUSE_ATT  = 190;    // soft attraction outer radius

// Counts: node (large, slow), dot (medium), micro (tiny)
const N_NODE  = 10;
const N_DOT   = 38;
const N_MICRO = 22;

const BLUE = [65, 125, 215] as const;
const CYAN = [80, 215, 255] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────
const rgba = ([r, g, b]: readonly [number, number, number], a: number) =>
  `rgba(${r},${g},${b},${(+a.toFixed(3))})`;

function spawn(w: number, h: number, cls: PClass, side: "L" | "R"): Particle {
  const z = w * ZONE;
  const x = side === "L" ? Math.random() * z : w - Math.random() * z;
  const goesUp = cls !== "micro" && Math.random() < 0.18;

  const baseVy =
    cls === "node"  ? (0.08 + Math.random() * 0.18) :
    cls === "dot"   ? (0.18 + Math.random() * 0.45) :
                      (0.30 + Math.random() * 0.70);

  return {
    x, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.25,
    vy: goesUp ? -baseVy * 0.6 : baseVy,
    baseVy: goesUp ? -baseVy * 0.6 : baseVy,
    r:
      cls === "node"  ? 2.2 + Math.random() * 1.8 :
      cls === "dot"   ? 1.0 + Math.random() * 0.9 :
                        0.4 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
    phaseSpd: 0.004 + Math.random() * 0.009,
    amplitude:
      cls === "node" ? 0.9 + Math.random() * 1.4 :
                       0.3 + Math.random() * 0.7,
    pulsePhase: Math.random() * Math.PI * 2,
    pulseSpd: 0.008 + Math.random() * 0.018,
    cls,
    side,
    accent: Math.random() < 0.14,
  };
}

function buildParticles(w: number, h: number): Particle[] {
  const ps: Particle[] = [];
  const sides: ("L" | "R")[] = ["L", "R"];
  for (const s of sides) {
    for (let i = 0; i < N_NODE  / 2; i++) ps.push(spawn(w, h, "node",  s));
    for (let i = 0; i < N_DOT   / 2; i++) ps.push(spawn(w, h, "dot",   s));
    for (let i = 0; i < N_MICRO / 2; i++) ps.push(spawn(w, h, "micro", s));
  }
  return ps;
}

// ── Component ────────────────────────────────────────────────────────────────
export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = window.innerWidth;
    let h = window.innerHeight;
    const mouse = { x: -9999, y: -9999 };

    let particles = buildParticles(w, h);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      particles = buildParticles(w, h);
    };
    const onMove  = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    resize();
    window.addEventListener("resize",     resize);
    window.addEventListener("mousemove",  onMove);
    window.addEventListener("mouseleave", onLeave);

    // Radial glow for node particles
    const glow = (x: number, y: number, r: number, col: readonly [number, number, number], a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
      g.addColorStop(0,   rgba(col, a * 0.55));
      g.addColorStop(0.4, rgba(col, a * 0.18));
      g.addColorStop(1,   rgba(col, 0));
      ctx.beginPath();
      ctx.arc(x, y, r * 5, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      const z    = w * ZONE;
      const cx   = w / 2;
      const cGap = w * CENTER_GAP;

      // ── Update ────────────────────────────────────────────────────────
      for (const p of particles) {
        p.phase     += p.phaseSpd;
        p.pulsePhase += p.pulseSpd;

        // Sinusoidal sway
        const sway = Math.sin(p.phase) * p.amplitude * 0.07;
        p.vx += sway;

        // Soft pull back toward own side zone center
        const homeX = p.side === "L" ? z * 0.45 : w - z * 0.45;
        p.vx += (homeX - p.x) * 0.00025;

        // Center column repulsion — keep particles off the reading area
        const fromCenter = Math.abs(p.x - cx);
        if (fromCenter < cGap) {
          const f = Math.pow((cGap - fromCenter) / cGap, 1.5) * 0.55;
          p.vx += (p.side === "L" ? -f : f);
        }

        // Mouse dual-zone: repel close, attract far
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const md  = Math.sqrt(mdx * mdx + mdy * mdy);
        if (md < MOUSE_ATT && md > 0) {
          if (md < MOUSE_REP) {
            const f = Math.pow((MOUSE_REP - md) / MOUSE_REP, 1.5) * 3.5;
            p.vx += (mdx / md) * f * 0.055;
            p.vy += (mdy / md) * f * 0.055;
          } else {
            const f = ((MOUSE_ATT - md) / (MOUSE_ATT - MOUSE_REP)) * 0.4;
            p.vx -= (mdx / md) * f * 0.018;
            p.vy -= (mdy / md) * f * 0.018;
          }
        }

        // Dampen & restore vertical speed
        p.vx *= 0.94;
        p.vy  = p.vy * 0.96 + p.baseVy * 0.04;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap vertically
        if (p.baseVy > 0 && p.y >  h + 12) { p.y = -12; p.x = p.side === "L" ? Math.random() * z : w - Math.random() * z; }
        if (p.baseVy < 0 && p.y < -12)      { p.y =  h + 12; p.x = p.side === "L" ? Math.random() * z : w - Math.random() * z; }

        // Hard horizontal walls
        if (p.x < 0)  { p.x = 0;  p.vx = Math.abs(p.vx) * 0.4; }
        if (p.x > w)  { p.x = w;  p.vx = -Math.abs(p.vx) * 0.4; }
      }

      // ── P2P lines ────────────────────────────────────────────────────
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < P2P_DIST) {
            const alpha = (1 - d / P2P_DIST) * 0.20;
            const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            g.addColorStop(0, rgba(a.accent ? CYAN : BLUE, alpha * 1.1));
            g.addColorStop(1, rgba(b.accent ? CYAN : BLUE, alpha * 1.1));
            ctx.beginPath();
            ctx.strokeStyle = g;
            ctx.lineWidth = a.cls === "node" || b.cls === "node" ? 0.9 : 0.55;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // ── Mouse lines & cursor ─────────────────────────────────────────
      if (mouse.x > 0 && mouse.x < w) {
        for (const p of particles) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < MOUSE_DIST) {
            const alpha = (1 - d / MOUSE_DIST) * 0.42;
            const g = ctx.createLinearGradient(mouse.x, mouse.y, p.x, p.y);
            g.addColorStop(0, rgba(CYAN, alpha * 1.5));
            g.addColorStop(1, rgba(BLUE, alpha * 0.5));
            ctx.beginPath();
            ctx.strokeStyle = g;
            ctx.lineWidth = 0.75;
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
        // Cursor glow ring
        const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 14);
        mg.addColorStop(0,   rgba(CYAN, 0.85));
        mg.addColorStop(0.3, rgba(CYAN, 0.30));
        mg.addColorStop(1,   rgba(CYAN, 0));
        ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = mg; ctx.fill();
        ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(CYAN, 0.95); ctx.fill();
      }

      // ── Draw particles ───────────────────────────────────────────────
      for (const p of particles) {
        const col  = p.accent ? CYAN : BLUE;
        const pr   = p.r + Math.sin(p.pulsePhase) * (p.cls === "node" ? 0.9 : 0.25);
        const base = p.cls === "node" ? 0.72 : p.cls === "dot" ? 0.50 : 0.32;

        if (p.cls === "node") glow(p.x, p.y, pr, col, base);

        // Inner bright core for nodes
        if (p.cls === "node") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, pr * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = rgba(CYAN, 0.9);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
        ctx.fillStyle = rgba(col, base);
        ctx.fill();
      }

      animId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize",     resize);
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
