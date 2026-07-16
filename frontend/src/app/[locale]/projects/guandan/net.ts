// Shared client helpers for the online 掼蛋 hall.
import type { Card, Combo } from "./engine";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("guandan_player_id");
  if (!id) {
    id = "p_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("guandan_player_id", id);
  }
  return id;
}

export function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("guandan_player_name") || "";
}

export function setPlayerName(n: string): void {
  if (typeof window !== "undefined") localStorage.setItem("guandan_player_name", n);
}

export interface SeatInfo {
  type: "empty" | "human" | "ai";
  name: string | null;
}

export interface ViewPlayer {
  type: "human" | "ai";
  name: string;
  finished: boolean;
  count: number;
  cards: Card[] | null;
}

export interface ViewState {
  players: ViewPlayer[];
  current: number;
  lastPlay: Combo | null;
  lastPlayer: number;
  plays: (Card[] | null)[];
  finishOrder: number[];
  dealLevel: string;
  levels: [string, string];
  onLevelTeam: number;
  phase: "playing" | "dealOver" | "matchOver";
  message: string;
  result: { winnerTeam: number; gain: number; order: number[]; matchWin: boolean } | null;
  tribute?: string | null;
}

export interface TableView {
  id: number;
  name: string;
  status: "waiting" | "playing" | "finished";
  host_id: string;
  seats: SeatInfo[];
  mySeat: number;
  version: number;
  state: ViewState | null;
}
