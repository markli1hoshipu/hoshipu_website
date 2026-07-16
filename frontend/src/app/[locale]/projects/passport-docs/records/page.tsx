"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Copy, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Loader2, ScanLine } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";
const PAGE_SIZE = 20;

interface LogItem {
  id: number;
  created_at?: string | null;
  provider?: string | null;
  airline?: string | null;
  pax?: number | null;
  command?: string | null;
  fields: Record<string, string>;
  warnings?: string[] | null;
  error?: string | null;
  vote?: number | null;
  duration_ms?: number | null;
  client_ip?: string | null;
}

interface LogsResponse {
  total: number;
  page: number;
  page_size: number;
  items: LogItem[];
}

const PROVIDER_LABELS: Record<string, string> = {
  aliyun: "阿里云",
  openai: "OpenAI",
};

function fmtTime(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function voteBadge(vote?: number | null) {
  if (vote === 1)
    return (
      <span className="inline-flex items-center gap-1 text-green-800 bg-green-100 border-2 border-green-400 rounded-md px-2.5 py-1 text-xs font-bold">
        ✓ 正确
      </span>
    );
  if (vote === 0)
    return (
      <span className="inline-flex items-center gap-1 text-white bg-red-600 border-2 border-red-600 rounded-md px-2.5 py-1 text-xs font-bold shadow-sm">
        ✗ 错误
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted border-2 border-transparent rounded-md px-2.5 py-1 text-xs font-medium">
      未投票
    </span>
  );
}

export default function PassportRecordsPage() {
  const locale = useLocale();
  const [inputQ, setInputQ] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const load = useCallback(async (query: string, pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        page: String(pageNum),
        page_size: String(PAGE_SIZE),
      });
      const res = await fetch(`${API_BASE_URL}/api/passport/logs?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } catch {
      /* keep last data on network error */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(q, page);
  }, [q, page, load]);

  const doSearch = () => {
    setPage(1);
    setQ(inputQ.trim());
  };

  const copy = (text: string, id: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    });
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Search className="h-7 w-7" />
              护照识别记录
            </h1>
            <p className="text-muted-foreground mt-1">
              按姓名 / 护照号搜索历史识别结果，避免同一本护照重复识别
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/projects/passport-docs`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回识别
            </Link>
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="输入姓名（拼音）或护照号，如 SONG / EL7577380"
                value={inputQ}
                onChange={(e) => setInputQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSearch();
                }}
              />
              <Button onClick={doSearch}>
                <Search className="h-4 w-4 mr-1" />
                搜索
              </Button>
              {q && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setInputQ("");
                    setPage(1);
                    setQ("");
                  }}
                >
                  清除
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {q ? `“${q}” 的搜索结果：共 ${total} 条` : `全部记录：共 ${total} 条`}
            </p>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>识别记录</CardTitle>
              <CardDescription>仅保存识别结果，不保存护照照片</CardDescription>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent className="space-y-3">
            {data && data.items.length === 0 && (
              <div className="text-sm text-muted-foreground py-8 text-center">
                {q ? "没有找到匹配的记录" : "暂无记录"}
              </div>
            )}
            {data?.items.map((item) => {
              const name = [item.fields.surname, item.fields.given_names].filter(Boolean).join(" ") || "-";
              const rowTint =
                item.vote === 0
                  ? "border-red-300 bg-red-50/60"
                  : item.vote === 1
                  ? "border-green-300 bg-green-50/50"
                  : "";
              return (
                <div key={item.id} className={`border rounded-lg p-3 ${rowTint}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mb-1">
                        <span className="font-medium text-foreground">{name}</span>
                        {item.fields.passport_number && (
                          <span className="font-mono">{item.fields.passport_number}</span>
                        )}
                        {item.provider && (
                          <span className="bg-muted rounded px-1.5 py-0.5">
                            {PROVIDER_LABELS[item.provider] || item.provider}
                          </span>
                        )}
                        {voteBadge(item.vote)}
                        <span>{fmtTime(item.created_at)}</span>
                      </div>
                      {item.error ? (
                        <div className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {item.error}
                        </div>
                      ) : (
                        <code className="font-mono text-sm break-all">{item.command}</code>
                      )}
                    </div>
                    {item.command && !item.error && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0"
                        onClick={() => copy(item.command!, item.id)}
                      >
                        {copiedId === item.id ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" /> 已复制
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" /> 复制
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {!data && loading && (
              <div className="text-sm text-muted-foreground py-8 text-center flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> 加载中...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              第 {page} / {totalPages} 页
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                下一页
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        <div className="text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/projects/passport-docs`}>
              <ScanLine className="h-4 w-4 mr-1" />
              去识别新护照
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
