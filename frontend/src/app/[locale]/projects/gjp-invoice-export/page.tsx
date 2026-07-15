"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileSpreadsheet,
  GitCompare,
  Copy,
} from "lucide-react";
import { saveAs } from "file-saver";
import {
  processGjpInvoices,
  exportGjpInvoices,
  type GjpInvoiceResult,
} from "@/lib/apiClient";

export default function GjpInvoiceExportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [results, setResults] = useState<GjpInvoiceResult[]>([]);

  // 发票号信息比对
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...uploaded]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
    if (dropped.length > 0) setFiles((prev) => [...prev, ...dropped]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    setProcessing(true);
    setResults([]);
    try {
      const resp = await processGjpInvoices(files);
      setResults(resp.results);
    } catch (error) {
      console.error("Error processing files:", error);
      alert("解析文件失败。请确保后端服务器正在运行。");
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportGjpInvoices(files);
      saveAs(blob, "GJP发票导出.xlsx");
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert("导出 Excel 失败。请确保后端服务器正在运行。");
    } finally {
      setExporting(false);
    }
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const incompleteCount = results.filter((r) => r.status === "incomplete").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  // One entry per line/whitespace-separated chunk; strip dashes within an entry
  // (e.g. 123-456 -> 123456), drop empties, dedupe into a set.
  const toSet = (text: string): Set<string> =>
    new Set(
      text
        .split(/\s+/)
        .map((t) => t.replace(/-/g, "").trim())
        .filter(Boolean)
    );

  const comparison = useMemo(() => {
    const left = toSet(leftText);
    const right = toSet(rightText);
    const onlyLeft: string[] = [];
    const both: string[] = [];
    const onlyRight: string[] = [];
    left.forEach((v) => (right.has(v) ? both : onlyLeft).push(v));
    right.forEach((v) => {
      if (!left.has(v)) onlyRight.push(v);
    });
    return {
      left,
      right,
      onlyLeft: onlyLeft.sort(),
      both: both.sort(),
      onlyRight: onlyRight.sort(),
    };
  }, [leftText, rightText]);

  const copyList = (items: string[]) => {
    navigator.clipboard.writeText(items.join("\n")).catch(() => {});
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6">GJP 发票导出工具</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          批量上传机票行程单 PDF（航空运输电子客票行程单），自动提取乘机人、航程、航班、金额、发票号等信息，
          导出为宇航 SAP 录入格式的 Excel 表格（税额、Net、Des. 等列由公式自动计算）。
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>上传 PDF 发票</CardTitle>
              <CardDescription>选择一个或多个机票行程单 PDF 文件</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={handleDrop}
              >
                <Input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">点击上传或拖放文件</p>
                  <p className="text-xs text-muted-foreground">仅支持 PDF 文件</p>
                </label>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">已上传文件 ({files.length})</h3>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm truncate max-w-xs">{file.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleProcess} disabled={processing} className="flex-1">
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          解析中...
                        </>
                      ) : (
                        "解析预览"
                      )}
                    </Button>
                    <Button
                      onClick={handleExport}
                      disabled={exporting}
                      variant="default"
                      className="flex-1"
                    >
                      {exporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          导出中...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          导出 Excel
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>解析结果</CardTitle>
                    <CardDescription>
                      成功 {successCount} 个， 不完整 {incompleteCount} 个， 错误 {errorCount} 个
                    </CardDescription>
                  </div>
                  <Button onClick={handleExport} disabled={exporting}>
                    <Download className="mr-2 h-4 w-4" />
                    导出 Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium"></th>
                        <th className="py-2 pr-3 font-medium">乘机人</th>
                        <th className="py-2 pr-3 font-medium">类别</th>
                        <th className="py-2 pr-3 font-medium">国内/国际</th>
                        <th className="py-2 pr-3 font-medium">航程</th>
                        <th className="py-2 pr-3 font-medium">ROUTING</th>
                        <th className="py-2 pr-3 font-medium">航班</th>
                        <th className="py-2 pr-3 font-medium">起飞</th>
                        <th className="py-2 pr-3 font-medium text-right">基金</th>
                        <th className="py-2 pr-3 font-medium text-right">合计</th>
                        <th className="py-2 pr-3 font-medium">发票号</th>
                        <th className="py-2 pr-3 font-medium">客票号</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, index) => (
                        <tr key={index} className="border-b last:border-0 align-top">
                          <td className="py-2 pr-3">
                            {r.status === "success" ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : r.status === "error" ? (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                          </td>
                          <td className="py-2 pr-3">{r.info.name || "—"}</td>
                          <td className="py-2 pr-3">{r.info.category || "—"}</td>
                          <td className="py-2 pr-3">{r.info.intl_dom || "—"}</td>
                          <td className="py-2 pr-3">{r.info.route_cn || "—"}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{r.info.routing || "—"}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{r.info.flight_no || "—"}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{r.info.depart_date || "—"}</td>
                          <td className="py-2 pr-3 text-right">{r.info.caac_fund ?? "—"}</td>
                          <td className="py-2 pr-3 text-right">{r.info.total ?? "—"}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{r.info.invoice_number || "—"}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{r.info.ticket_number || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(incompleteCount > 0 || errorCount > 0) && (
                  <div className="mt-4 space-y-1 text-xs">
                    {results
                      .filter((r) => r.status !== "success")
                      .map((r, i) => (
                        <div key={i} className="text-amber-600">
                          {r.filename}:{" "}
                          {r.status === "error"
                            ? `错误 ${r.error}`
                            : `缺少字段 ${(r.missing_fields || []).join(", ")}`}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {[
                "上传机票行程单 PDF（可批量）",
                "点击「解析预览」核对提取的信息",
                "点击「导出 Excel」下载 SAP 录入表格",
                "打开 Excel，税额/Net/Des. 等列会自动计算",
              ].map((text, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                    {i + 1}
                  </div>
                  <p>{text}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>需手动补充的列</CardTitle>
              <CardDescription>以下信息不在发票上，导出后请在 Excel 中填写</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>• 预订日期 (G)</p>
              <p>• 成本中心 / WBS / ORDER (O)</p>
              <p>• CO / home trip 标记 (E)</p>
              <p>• rebook / rebooking / 备注 (Q/R/S)</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 发票号信息比对 */}
      {/* ------------------------------------------------------------------ */}
      <Separator className="my-12" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-2">
          <GitCompare className="h-6 w-6 text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold">发票号信息比对</h2>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          粘贴两组发票号 / 客票号（每行一个，用空格或换行分隔）。号码中的
          <span className="font-mono"> - </span>会被自动去除（如 <span className="font-mono">123-456 → 123456</span>）。
          系统各自去重、去空后比对，列出「仅左侧」「两侧都有」「仅右侧」的号码。
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            左侧数据 <span className="text-muted-foreground font-normal">（{comparison.left.size} 个唯一）</span>
          </label>
          <Textarea
            value={leftText}
            onChange={(e) => setLeftText(e.target.value)}
            placeholder={"26378324211041825165\n26448784110005209647\n..."}
            className="min-h-[180px] font-mono text-xs"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            右侧数据 <span className="text-muted-foreground font-normal">（{comparison.right.size} 个唯一）</span>
          </label>
          <Textarea
            value={rightText}
            onChange={(e) => setRightText(e.target.value)}
            placeholder={"999-4879583863\n999-4879583868\n..."}
            className="min-h-[180px] font-mono text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "仅左侧", items: comparison.onlyLeft, color: "text-amber-600" },
          { title: "两侧都有", items: comparison.both, color: "text-green-600" },
          { title: "仅右侧", items: comparison.onlyRight, color: "text-blue-600" },
        ].map((col) => (
          <Card key={col.title}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-base ${col.color}`}>
                  {col.title} ({col.items.length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={col.items.length === 0}
                  onClick={() => copyList(col.items)}
                  title="复制"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {col.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1 font-mono text-xs">
                  {col.items.map((v) => (
                    <div key={v} className="truncate" title={v}>
                      {v}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
