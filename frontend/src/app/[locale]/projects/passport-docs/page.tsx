"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plane, Upload, Copy, CheckCircle, AlertCircle, ImagePlus, X, Loader2, ThumbsUp, ThumbsDown, Search } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

type Provider = "aliyun" | "openai";

interface DocsLine {
  pax: number;
  command: string;
  fields: Record<string, string>;
  warnings?: string[] | null;
  error?: string | null;
  log_id?: number | null;
}

interface ProviderAccuracy {
  votes: number;
  correct: number;
  accuracy: number | null;
}

interface AccuracyResponse {
  aliyun: ProviderAccuracy;
  openai: ProviderAccuracy;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  aliyun: "阿里云 护照识别",
  openai: "OpenAI gpt-4.1-mini",
};

const FIELD_LABELS: Record<string, string> = {
  doc_type: "类型",
  issuing_country: "签发国",
  passport_number: "护照号",
  nationality: "国籍",
  birth_date: "出生(YYMMDD)",
  sex: "性别",
  expiry_date: "到期(YYMMDD)",
  surname: "姓",
  given_names: "名",
};

function fmtAccuracy(a?: ProviderAccuracy): string {
  if (!a || a.votes === 0 || a.accuracy === null) return "暂无数据";
  return `${Math.round(a.accuracy * 100)}% (${a.correct}/${a.votes})`;
}

export default function PassportDocsPage() {
  const locale = useLocale();
  const [airline, setAirline] = useState("CZ");
  const [startPax, setStartPax] = useState(1);
  const [provider, setProvider] = useState<Provider>("aliyun");
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lines, setLines] = useState<DocsLine[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [accuracy, setAccuracy] = useState<AccuracyResponse | null>(null);
  const [votes, setVotes] = useState<Record<number, boolean>>({}); // log_id -> correct?
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object-URL thumbnails; revoked when the file list changes or on unmount.
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const refreshAccuracy = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/passport/accuracy`);
      if (res.ok) setAccuracy(await res.json());
    } catch {
      /* accuracy is a nice-to-have; ignore failures */
    }
  }, []);

  useEffect(() => {
    refreshAccuracy();
  }, [refreshAccuracy]);

  const addFiles = (incoming: File[]) => {
    const images = incoming.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
      const merged = [...prev];
      for (const f of images) {
        const key = `${f.name}:${f.size}:${f.lastModified}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(f);
        }
      }
      return merged;
    });
    setLines([]);
    setVotes({});
    setMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = ""; // allow re-selecting the same file
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Paste images anywhere on the page (Ctrl/Cmd+V).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pasted: File[] = [];
      for (const it of Array.from(items)) {
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f && f.type.startsWith("image/")) pasted.push(f);
        }
      }
      if (pasted.length) {
        e.preventDefault();
        addFiles(pasted);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // addFiles uses only functional state updaters, so the first-render closure is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    });
  };

  const handleVote = async (logId: number, correct: boolean) => {
    setVotes((v) => ({ ...v, [logId]: correct })); // optimistic
    try {
      await fetch(`${API_BASE_URL}/api/passport/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log_id: logId, correct }),
      });
      refreshAccuracy();
    } catch {
      /* keep the optimistic mark even if the network hiccups */
    }
  };

  const handleSubmit = async () => {
    if (!airline.trim()) {
      setMessage({ type: "error", text: "请填写航空公司代码（如 KE）" });
      return;
    }
    if (files.length === 0) {
      setMessage({ type: "error", text: "请至少上传一张护照照片" });
      return;
    }

    setIsProcessing(true);
    setMessage(null);
    setLines([]);
    setVotes({});
    try {
      const fd = new FormData();
      fd.append("airline", airline.trim());
      fd.append("start_pax", String(startPax));
      fd.append("provider", provider);
      files.forEach((f) => fd.append("files", f));

      const res = await fetch(`${API_BASE_URL}/api/passport/docs`, { method: "POST", body: fd });
      const data = await res.json();

      if (res.ok && data.success) {
        setLines(data.lines);
        const okCount = data.lines.filter((l: DocsLine) => l.command && !l.error).length;
        setMessage({ type: "success", text: `已用${PROVIDER_LABELS[provider]}生成 ${okCount}/${data.lines.length} 条指令` });
      } else {
        setMessage({ type: "error", text: data.detail || "生成失败" });
      }
    } catch (err) {
      console.error("passport docs failed:", err);
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setIsProcessing(false);
    }
  };

  const allCommands = lines.filter((l) => l.command && !l.error).map((l) => l.command).join("\n");

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Plane className="h-7 w-7" />
              护照 → DOCS 指令
            </h1>
            <p className="text-muted-foreground mt-1">
              上传护照照片页，自动识别 MRZ 并生成 SR DOCS 指令（每张护照一行，乘客号自动递增）
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={`/${locale}/projects/passport-docs/records`}>
              <Search className="h-4 w-4 mr-1" />
              历史记录
            </Link>
          </Button>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg flex items-center gap-2 ${
              message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {message.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {message.text}
          </div>
        )}

        {/* Results — shown above the input form so generated text sits on top */}
        {lines.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>生成结果</CardTitle>
                <CardDescription>点击复制单条，或右上角复制全部；请核对后为每条反馈是否正确</CardDescription>
              </div>
              {allCommands && (
                <Button variant="outline" size="sm" onClick={() => copy(allCommands, "__all__")}>
                  <Copy className="h-4 w-4 mr-1" />
                  {copiedKey === "__all__" ? "已复制" : "复制全部"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {lines.map((line) => {
                const key = `line-${line.pax}`;
                const voted = line.log_id != null ? votes[line.log_id] : undefined;
                return (
                  <div key={key} className="border rounded-lg p-3">
                    {line.error ? (
                      <div className="text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        P{line.pax}: 识别失败 — {line.error}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <code className="font-mono text-sm break-all">{line.command}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0"
                            onClick={() => copy(line.command, key)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            {copiedKey === key ? "已复制" : "复制"}
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {Object.entries(FIELD_LABELS).map(([k, label]) => (
                            <span key={k}>
                              {label}: <span className="text-foreground">{line.fields[k] || "-"}</span>
                            </span>
                          ))}
                        </div>
                        {line.warnings && line.warnings.length > 0 && (
                          <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 space-y-0.5">
                            {line.warnings.map((w, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                {w}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Correctness vote — feeds the accuracy tracker */}
                        {line.log_id != null && (
                          <div className="mt-3 flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-medium">识别是否正确？</span>
                            <button
                              type="button"
                              onClick={() => handleVote(line.log_id!, true)}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                                voted === true
                                  ? "bg-green-600 text-white border-green-600 shadow-md scale-105"
                                  : voted === false
                                  ? "bg-green-50 text-green-700 border-green-200 opacity-50 hover:opacity-100"
                                  : "bg-green-100 text-green-800 border-green-300 hover:bg-green-200 hover:border-green-400"
                              }`}
                            >
                              <ThumbsUp className="h-4 w-4" /> 正确
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVote(line.log_id!, false)}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                                voted === false
                                  ? "bg-red-600 text-white border-red-600 shadow-md scale-105"
                                  : voted === true
                                  ? "bg-red-50 text-red-700 border-red-200 opacity-50 hover:opacity-100"
                                  : "bg-red-100 text-red-800 border-red-300 hover:bg-red-200 hover:border-red-400"
                              }`}
                            >
                              <ThumbsDown className="h-4 w-4" /> 有误
                            </button>
                            {voted !== undefined && <span className="text-sm text-muted-foreground">已反馈，谢谢</span>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>参数</CardTitle>
            <CardDescription>选择识别引擎，填写航空公司代码，上传一张或多张护照照片</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Provider selector with live accuracy */}
            <div className="space-y-2">
              <label className="text-sm font-medium">识别引擎</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["aliyun", "openai"] as Provider[]).map((p) => {
                  const acc = accuracy?.[p];
                  const active = provider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-muted-foreground/25 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{PROVIDER_LABELS[p]}</span>
                        {p === "aliyun" && <span className="text-[10px] text-muted-foreground">默认</span>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        用户反馈准确率：<span className="text-foreground font-medium">{fmtAccuracy(acc)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">航空公司代码 *</label>
                <Input
                  placeholder="如: CZ"
                  value={airline}
                  onChange={(e) => setAirline(e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">起始乘客号</label>
                <Input
                  type="number"
                  min={1}
                  value={startPax}
                  onChange={(e) => setStartPax(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">护照照片 *</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  addFiles(Array.from(e.dataTransfer.files || []));
                }}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm">点击上传，或拖拽图片到此，或直接粘贴（Ctrl/⌘+V）</p>
                <p className="text-xs text-muted-foreground mt-1">支持一次多张护照照片</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {files.map((f, i) => (
                  <div key={`${f.name}-${f.size}-${i}`} className="relative w-24">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previews[i]} alt={f.name} className="h-24 w-24 object-cover rounded-md border" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -top-2 -right-2 bg-background border rounded-full p-0.5 shadow hover:bg-muted"
                      title="移除"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="text-[10px] text-muted-foreground truncate mt-1">{f.name}</div>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleSubmit} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  识别中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  生成指令
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              识别结果请人工核对无误后再使用；核对后点击“正确/有误”可帮助统计各引擎准确率。
            </p>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg">
          指令格式：<code className="font-mono">DOCS {"{航司}"} HK1 P/签发国/护照号/国籍/出生/性别/到期/姓/名/P{"{乘客号}"}</code>
          <br />
          姓名取自护照 MRZ（机读区），而非印刷姓名栏，以保证姓/名顺序正确。仅记录识别结果与准确率反馈，不保存护照照片。
        </div>
      </motion.div>
    </div>
  );
}
