"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  Copy,
} from "lucide-react";
import { saveAs } from "file-saver";
import { mergeAeQff, AE_MAX_BYTES, QFF_MAX_BYTES, type AeQffMergeResponse } from "@/lib/apiClient";

const kb = (n: number) => `${Math.round(n / 1024)} KB`;

function base64ToBlob(b64: string): Blob {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export default function AeQffUpdatePage() {
  const [aeFile, setAeFile] = useState<File | null>(null);
  const [qffFiles, setQffFiles] = useState<File[]>([]);
  const [merging, setMerging] = useState(false);
  const [result, setResult] = useState<AeQffMergeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onQffUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQffFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
  };
  const removeQff = (i: number) => setQffFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleMerge = async () => {
    if (!aeFile || qffFiles.length === 0) return;

    // Size guards (mirror the backend) — fail fast, no upload, no spinner.
    if (aeFile.size > AE_MAX_BYTES) {
      setResult(null);
      setError(
        `AE 主表过大（${kb(aeFile.size)}），上限 ${kb(AE_MAX_BYTES)}。请先把历史月份归档，让在用报表变小后再上传。`,
      );
      return;
    }
    const tooBig = qffFiles.find((f) => f.size > QFF_MAX_BYTES);
    if (tooBig) {
      setResult(null);
      setError(`欠条文件「${tooBig.name}」过大（${kb(tooBig.size)}），单个上限 ${kb(QFF_MAX_BYTES)}。`);
      return;
    }

    setMerging(true);
    setResult(null);
    setError(null);
    try {
      const res = await mergeAeQff(aeFile, qffFiles);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "合并失败");
    } finally {
      setMerging(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    saveAs(base64ToBlob(result.file_base64), result.filename);
  };

  const report = result?.report;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6">AE 欠条报表更新</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          上传当前的 AE 欠条报表和一批欠条文件（QFF / WW / LYC 等），系统按<b>负责人代码（列 E）</b>、
          欠款人和日期把每笔初始金额并入对应月份表格的对应分组，自动新增未出现过的欠款人，
          并用隐藏表记录每个欠单号，重复上传不会重复计入。
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* AE upload */}
          <Card>
            <CardHeader>
              <CardTitle>当前 AE 欠条报表</CardTitle>
              <CardDescription>上传要更新的 AE 报表（.xlsx，单个文件）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="file"
                accept=".xlsx"
                className="hidden"
                id="ae-upload"
                onChange={(e) => setAeFile(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="ae-upload"
                className="flex items-center gap-3 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
                <div className="min-w-0">
                  {aeFile ? (
                    <span className="text-sm font-medium truncate">{aeFile.name}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">点击选择 AE 报表文件</span>
                  )}
                </div>
              </label>
            </CardContent>
          </Card>

          {/* QFF upload */}
          <Card>
            <CardHeader>
              <CardTitle>欠条文件（待加入）</CardTitle>
              <CardDescription>可一次选择多个文件（QFF / WW / LYC 等，按列 E 归组）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="file"
                accept=".xls,.xlsx"
                multiple
                className="hidden"
                id="qff-upload"
                onChange={onQffUpload}
              />
              <label
                htmlFor="qff-upload"
                className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer block"
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">点击上传 QFF 文件</p>
              </label>

              {qffFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {qffFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm truncate">{f.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeQff(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleMerge}
                disabled={merging || !aeFile || qffFiles.length === 0}
                className="w-full"
              >
                {merging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    合并处理中（大文件可能需要数十秒）...
                  </>
                ) : (
                  "开始合并"
                )}
              </Button>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-red-300">
              <CardContent className="py-4 text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {error}
              </CardContent>
            </Card>
          )}

          {/* Report */}
          {report && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" /> 合并完成
                    </CardTitle>
                    <CardDescription>核对结果后下载更新后的报表</CardDescription>
                  </div>
                  <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    下载报表
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "共读取", value: report.total },
                    { label: "已计入", value: report.added, color: "text-green-600" },
                    { label: "新增月份表", value: report.new_sheets ?? 0, color: "text-blue-600" },
                    { label: "新增分组", value: report.new_groups ?? 0, color: "text-blue-600" },
                    { label: "新增日期列", value: report.new_days ?? 0, color: "text-blue-600" },
                    { label: "新增欠款人", value: report.new_debtors, color: "text-blue-600" },
                    { label: "重复跳过", value: report.duplicates, color: "text-amber-600" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border p-3 text-center">
                      <div className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>

                {report.aggregated > 0 && (
                  <div className="text-xs text-amber-600 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      有 {report.aggregated} 笔金额并入了原本已有数值的单元格（同一欠款人当天已有金额）。
                      若这些欠单此前是手工录入且未记欠单号，请核对是否重复计入。
                    </span>
                  </div>
                )}

                {(report.new_group_names?.length ?? 0) > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <UserPlus className="h-4 w-4 text-blue-600" /> 新增负责人分组（含分组小计行）
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {report.new_group_names!.map((n, i) => (
                        <span key={i} className="text-xs bg-blue-500/10 text-blue-700 rounded px-2 py-1">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {report.new_debtor_names.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <UserPlus className="h-4 w-4 text-blue-600" /> 新增欠款人（已插入对应负责人分组）
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {report.new_debtor_names.map((n, i) => (
                        <span key={i} className="text-xs bg-blue-500/10 text-blue-700 rounded px-2 py-1">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {report.skipped.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-amber-600">
                        跳过 {report.skipped.length} 笔
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          navigator.clipboard
                            .writeText(report.skipped.map((s) => `${s.iou_no}\t${s.reason}`).join("\n"))
                            .catch(() => {})
                        }
                        title="复制"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 text-xs font-mono">
                      {report.skipped.map((s, i) => (
                        <div key={i} className="text-muted-foreground">
                          {s.iou_no} — {s.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {[
                "上传当前 AE 欠条报表",
                "上传一批要加入的 QFF 文件",
                "点击「开始合并」，核对结果摘要",
                "下载更新后的报表（余额/合计公式自动重算）",
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
              <CardTitle>说明</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• 按列 E 的负责人代码归入对应分组（QFF / WW / LYC …）。</p>
              <p>• 组内按欠款人姓名匹配（忽略空格）；写入每笔的初始金额。</p>
              <p>• 未匹配到的欠款人会在该负责人分组内新增一行。</p>
              <p>• 缺整个月份表会自动新建（当月单表，不结转上月余额）。</p>
              <p>• 报表里没有的负责人分组会自动新建（含分组小计行）。</p>
              <p>• 月份表里缺当天的日期列会自动补上。</p>
              <p>• 总计为开口 SUM、分组小计为区间 SUM（插行自动维护），打开时自动重算。</p>
              <p>• 隐藏表 <span className="font-mono">_QFF_imported</span> 记录已导入的欠单号，重复上传自动跳过。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
