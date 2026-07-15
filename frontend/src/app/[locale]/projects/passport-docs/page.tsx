"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plane, Upload, Copy, CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

interface DocsLine {
  pax: number;
  command: string;
  fields: Record<string, string>;
  warnings?: string[] | null;
  error?: string | null;
}

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

export default function PassportDocsPage() {
  const [airline, setAirline] = useState("");
  const [startPax, setStartPax] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lines, setLines] = useState<DocsLine[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files || []));
    setLines([]);
    setMessage(null);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    });
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
    try {
      const fd = new FormData();
      fd.append("airline", airline.trim());
      fd.append("start_pax", String(startPax));
      files.forEach((f) => fd.append("files", f));

      const res = await fetch(`${API_BASE_URL}/api/passport/docs`, { method: "POST", body: fd });
      const data = await res.json();

      if (res.ok && data.success) {
        setLines(data.lines);
        const okCount = data.lines.filter((l: DocsLine) => l.command && !l.error).length;
        setMessage({ type: "success", text: `已生成 ${okCount}/${data.lines.length} 条指令` });
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
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Plane className="h-7 w-7" />
            护照 → DOCS 指令
          </h1>
          <p className="text-muted-foreground mt-1">
            上传护照照片页，自动识别 MRZ 并生成 SR DOCS 指令（每张护照一行，乘客号自动递增）
          </p>
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

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>参数</CardTitle>
            <CardDescription>填写航空公司代码，上传一张或多张护照照片</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">航空公司代码 *</label>
                <Input
                  placeholder="如: KE"
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
              <div className="space-y-2">
                <label className="text-sm font-medium">护照照片 *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            </div>

            {files.length > 0 && (
              <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded">
                    <FileText className="h-3 w-3" />
                    {f.name}
                  </span>
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
              识别结果请人工核对无误后再使用。
            </p>
          </CardContent>
        </Card>

        {/* Results */}
        {lines.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>生成结果</CardTitle>
                <CardDescription>点击复制单条，或右上角复制全部</CardDescription>
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
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg">
          指令格式：<code className="font-mono">DOCS {"{航司}"} HK1 P/签发国/护照号/国籍/出生/性别/到期/姓/名/P{"{乘客号}"}</code>
          <br />
          姓名取自护照 MRZ（机读区），而非印刷姓名栏，以保证姓/名顺序正确。
        </div>
      </motion.div>
    </div>
  );
}
