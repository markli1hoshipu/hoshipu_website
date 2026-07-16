"use client";

import type { Card } from "./engine";
import { isWild } from "./engine";

export function cardIsRed(c: { suit: string; rank: string }): boolean {
  if (c.rank === "大王") return true;
  if (c.rank === "小王") return false;
  return c.suit === "♥" || c.suit === "♦";
}

type Size = "sm" | "md" | "lg";

const SZ: Record<Size, { w: string; corner: string; center: string; pip: string }> = {
  sm: { w: "w-7 h-10", corner: "text-[8px]", center: "text-sm", pip: "text-[7px]" },
  md: { w: "w-9 h-[3.25rem]", corner: "text-[10px]", center: "text-xl", pip: "text-[9px]" },
  lg: { w: "w-11 h-16", corner: "text-xs", center: "text-3xl", pip: "text-[11px]" },
};

// texture: subtle sheen so the face doesn't read as flat white
const FACE_STYLE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(120% 90% at 15% 10%, rgba(255,255,255,0.95), rgba(241,245,249,0.9) 55%, rgba(226,232,240,0.95))",
};

function jokerChars(rank: string): [string, string] {
  return rank === "大王" ? ["大", "王"] : ["小", "王"];
}

function Corner({ rank, suit, red, size, rotated }: { rank: string; suit: string; red: boolean; size: Size; rotated?: boolean }) {
  const s = SZ[size];
  return (
    <span
      className={`absolute flex flex-col items-center leading-none ${red ? "text-rose-600" : "text-slate-900"} ${
        rotated ? "bottom-0.5 right-1 rotate-180" : "top-0.5 left-1"
      }`}
    >
      <span className={`font-bold tracking-tighter ${s.corner}`}>{rank}</span>
      <span className={s.pip}>{suit}</span>
    </span>
  );
}

interface FaceProps {
  card: Card;
  level?: string;
  selected?: boolean;
  onClick?: () => void;
  size?: Size;
  disabled?: boolean;
}

export function CardFace({ card, level, selected, onClick, size = "md", disabled }: FaceProps) {
  const s = SZ[size];
  const red = cardIsRed(card);
  const joker = card.rank === "小王" || card.rank === "大王";
  const wild = level ? isWild(card, level) : false;
  const Tag = onClick ? "button" : "div";

  const ring = selected
    ? "border-amber-500 ring-2 ring-amber-400 -translate-y-3"
    : wild
    ? "border-amber-400 ring-2 ring-amber-300"
    : "border-slate-300";

  return (
    <Tag
      onClick={onClick}
      disabled={disabled}
      style={FACE_STYLE}
      className={`relative ${s.w} shrink-0 rounded-[5px] border shadow-sm select-none transition-transform ${ring} ${
        onClick ? "cursor-pointer hover:-translate-y-1" : ""
      }`}
    >
      {joker ? (
        <>
          <span className={`absolute top-0.5 left-1 flex flex-col items-center leading-none font-bold ${red ? "text-rose-600" : "text-slate-900"} ${s.corner}`}>
            {jokerChars(card.rank).map((ch, i) => (
              <span key={i}>{ch}</span>
            ))}
          </span>
          <span className={`absolute inset-0 flex items-center justify-center ${s.center} ${red ? "text-rose-500" : "text-slate-700"}`}>★</span>
        </>
      ) : (
        <>
          <Corner rank={card.rank} suit={card.suit} red={red} size={size} />
          <Corner rank={card.rank} suit={card.suit} red={red} size={size} rotated />
          <span
            className={`absolute inset-0 flex items-center justify-center ${s.center} ${red ? "text-rose-500/90" : "text-slate-800/90"}`}
            style={{ textShadow: "0 1px 1px rgba(0,0,0,0.12)" }}
          >
            {card.suit}
          </span>
        </>
      )}
      {wild && (
        <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black text-[8px] font-bold rounded-full px-1 leading-tight shadow">
          百搭
        </span>
      )}
    </Tag>
  );
}

export function CardBack({ size = "sm" }: { size?: Size }) {
  const s = SZ[size];
  return (
    <div
      className={`${s.w} shrink-0 rounded-[5px] border border-blue-950 relative overflow-hidden shadow-sm`}
      style={{
        backgroundColor: "#1e3a8a",
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 3px, transparent 3px 7px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.14) 0 3px, transparent 3px 7px)",
      }}
    >
      <div className="absolute inset-1 rounded-[3px] border border-white/40" />
      <div className="absolute inset-0 flex items-center justify-center text-white/70 text-[8px] font-bold">掼</div>
    </div>
  );
}
