"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, RefreshCw, Users, Bot, Cpu, LogIn, Gamepad2, Wrench } from "lucide-react";
import { API_BASE_URL, getPlayerId, getPlayerName, setPlayerName } from "./net";

// Online hall temporarily off while we isolate bugs. Re-enable by setting
// NEXT_PUBLIC_GUANDAN_ONLINE=1 (Vercel env) and redeploying the frontend.
const ONLINE_ENABLED = process.env.NEXT_PUBLIC_GUANDAN_ONLINE === "1";

interface LobbyTable {
  id: number;
  name: string;
  status: "waiting" | "playing" | "finished";
  humans: number;
  ai: number;
  empty: number;
  seats: { type: string; name: string | null }[];
}

export default function GuandanLobbyPage() {
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [tables, setTables] = useState<LobbyTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setName(getPlayerName());
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/guandan/tables`);
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch {
      /* keep last */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ONLINE_ENABLED) return; // online hall disabled — send no requests
    load();
    // Skip polling while the tab is hidden to avoid needless load on the backend.
    const iv = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) load();
    }, 3000);
    return () => clearInterval(iv);
  }, [load]);

  const ensureName = (): string | null => {
    const n = name.trim();
    if (!n) {
      setErr("请先填写用户名");
      return null;
    }
    setPlayerName(n);
    return n;
  };

  const go = (id: number) => router.push(`/${locale}/projects/guandan/table/${id}`);

  const createTable = async () => {
    const n = ensureName();
    if (!n) return;
    setCreating(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/guandan/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${n} 的牌桌`, player_id: getPlayerId(), player_name: n }),
      });
      if (!res.ok) throw new Error();
      const t = await res.json();
      go(t.id);
    } catch {
      setErr("创建失败，请重试");
    } finally {
      setCreating(false);
    }
  };

  const join = async (id: number) => {
    const n = ensureName();
    if (!n) return;
    setErr(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/guandan/tables/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: getPlayerId(), player_name: n }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "加入失败");
      }
      go(id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加入失败");
    }
  };

  if (!ONLINE_ENABLED) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回项目列表
            </Link>
          </Button>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">掼蛋 2v2</h1>
        </motion.div>
        <div className="max-w-md mx-auto">
          <UICard>
            <CardContent className="pt-6 text-center space-y-4">
              <Wrench className="h-8 w-8 mx-auto text-muted-foreground" />
              <div className="text-lg font-semibold">在线对战维护中</div>
              <p className="text-sm text-muted-foreground">
                在线掼蛋大厅正在调试中，即将上线。你可以先玩单机练习（离线，与 AI 对战）。
              </p>
              <Button asChild>
                <Link href={`/${locale}/projects/guandan/solo`}>
                  <Gamepad2 className="mr-1 h-4 w-4" />
                  单机练习
                </Link>
              </Button>
            </CardContent>
          </UICard>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回项目列表
          </Link>
        </Button>
        <h1 className="text-4xl md:text-5xl font-bold mb-2">掼蛋 · 游戏大厅</h1>
        <p className="text-muted-foreground max-w-3xl">
          创建或加入牌桌，真人可线上组队；空位可加 AI 补齐（1 人 3 AI、2 人 2 AI、4 人皆可）。坐在对面即为队友。含红桃逢人配（百搭）与局间进贡/还贡。
        </p>
      </motion.div>

      <div className="max-w-3xl mx-auto space-y-4">
        {/* controls */}
        <UICard>
          <CardContent className="pt-6 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium">用户名</label>
                <Input value={name} maxLength={20} placeholder="输入你的名字" onChange={(e) => setName(e.target.value)} />
              </div>
              <Button onClick={createTable} disabled={creating}>
                <Plus className="mr-1 h-4 w-4" />
                创建牌桌
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/${locale}/projects/guandan/solo`}>
                  <Gamepad2 className="mr-1 h-4 w-4" />
                  单机练习
                </Link>
              </Button>
            </div>
            {err && <div className="text-sm text-red-600">{err}</div>}
          </CardContent>
        </UICard>

        {/* table list */}
        <UICard>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" /> 牌桌列表
              </div>
              <Button variant="ghost" size="sm" onClick={load}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {loading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">加载中…</div>
            ) : tables.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">还没有牌桌，点“创建牌桌”开一桌吧！</div>
            ) : (
              <div className="space-y-2">
                {tables.map((t) => {
                  const full = t.empty === 0;
                  const canJoin = t.status === "waiting" && t.empty > 0;
                  return (
                    <div key={t.id} className="flex items-center gap-3 border rounded-lg p-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{t.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded ${t.status === "waiting" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {t.status === "waiting" ? "等待中" : "进行中"}
                          </span>
                          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{t.humans}</span>
                          <span className="inline-flex items-center gap-1"><Bot className="h-3 w-3" />{t.ai}</span>
                          <span className="inline-flex items-center gap-1"><Cpu className="h-3 w-3 opacity-40" />空 {t.empty}</span>
                        </div>
                      </div>
                      {canJoin ? (
                        <Button size="sm" onClick={() => join(t.id)}>
                          <LogIn className="mr-1 h-4 w-4" /> 加入
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => go(t.id)}>
                          {full && t.status === "waiting" ? "围观/进入" : "进入"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </UICard>
      </div>
    </div>
  );
}
