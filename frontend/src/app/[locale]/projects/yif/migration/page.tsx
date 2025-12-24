"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Database,
  FileText,
  RefreshCw,
  Lock
} from "lucide-react";
import { useYIFAuth } from "@/hooks/useYIFAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

interface Stats {
  ious: number;
  items: number;
  payments: number;
  total_amount: number;
  total_paid: number;
  remaining: number;
}

export default function MigrationPage() {
  const { user, loading: authLoading, getToken } = useYIFAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearPassword, setClearPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [importProgress, setImportProgress] = useState<{
    status: string;
    percent: number;
    message: string;
    total_ious?: number;
  } | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/yif/migration/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const pollProgress = async (taskId: string) => {
    const token = getToken();
    const maxAttempts = 600; // 10 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/yif/migration/import/progress/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const progress = await response.json();
          setImportProgress(progress);

          if (progress.status === "complete" || progress.status === "error") {
            return progress;
          }
        }
      } catch (err) {
        console.error("Progress poll error:", err);
      }

      await new Promise(resolve => setTimeout(resolve, 500)); // Poll every 500ms
      attempts++;
    }

    return { status: "timeout", message: "导入超时" };
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);
    setImportProgress({ status: "uploading", percent: 0, message: "正在上传文件..." });

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("file", file);

      // Start import (this returns quickly with task_id)
      const response = await fetch(`${API_BASE_URL}/api/yif/migration/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // If task_id returned, poll for progress
        if (data.task_id) {
          const finalProgress = await pollProgress(data.task_id);
          if (finalProgress.status === "complete") {
            setMessage({
              type: "success",
              text: `导入成功: ${data.ious_created} 欠条, ${data.items_created} 明细, ${data.payments_created} 付款`,
            });
          } else if (finalProgress.status === "error") {
            setMessage({ type: "error", text: finalProgress.message || "导入失败" });
          }
        } else {
          setMessage({
            type: "success",
            text: `导入成功: ${data.ious_created} 欠条, ${data.items_created} 明细, ${data.payments_created} 付款`,
          });
        }
        fetchStats();
      } else {
        setMessage({ type: "error", text: data.detail || "导入失败" });
      }
    } catch (err) {
      console.error("Import failed:", err);
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/yif/migration/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `yif_export_${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage({ type: "success", text: "导出成功，已下载 ZIP 文件" });
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.detail || "导出失败" });
      }
    } catch (err) {
      console.error("Export failed:", err);
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClear = async () => {
    if (!clearPassword) {
      setMessage({ type: "error", text: "请输入密码" });
      return;
    }

    setIsClearing(true);
    setMessage(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/yif/migration/clear`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: clearPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Download backup file
        if (data.backup_data && data.backup_filename) {
          const binaryString = atob(data.backup_data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: "application/zip" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = data.backup_filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }

        setMessage({
          type: "success",
          text: `已清空: ${data.ious_deleted} 欠条, ${data.items_deleted} 明细, ${data.payments_deleted} 付款。备份已下载。`,
        });
        setShowClearConfirm(false);
        setClearPassword("");
        fetchStats();
      } else {
        setMessage({ type: "error", text: data.detail || "清空失败" });
      }
    } catch (err) {
      console.error("Clear failed:", err);
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setIsClearing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold">数据迁移工具</h1>
          <p className="text-muted-foreground mt-1">
            导入/导出 pickle 格式数据，用于测试和数据迁移
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

        {/* Current Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              当前数据统计
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchStats}
                disabled={isLoading}
                className="ml-auto"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </CardTitle>
            <CardDescription>用户 {user.username} 的数据</CardDescription>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{stats.ious}</p>
                  <p className="text-sm text-muted-foreground">欠条数</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{stats.items}</p>
                  <p className="text-sm text-muted-foreground">明细数</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{stats.payments}</p>
                  <p className="text-sm text-muted-foreground">付款数</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-blue-600">
                    ¥{stats.total_amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">总金额</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-600">
                    ¥{stats.total_paid.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">已付款</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-red-600">
                    ¥{stats.remaining.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">未付款</p>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">加载中...</p>
            )}
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              导入数据
            </CardTitle>
            <CardDescription>
              上传桌面应用的 business_data.txt 文件（pickle 格式）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {importProgress ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>{importProgress.message}</span>
                    <span className="font-medium">{importProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress.percent}%` }}
                    />
                  </div>
                  {importProgress.total_ious && (
                    <p className="text-xs text-muted-foreground text-center">
                      共 {importProgress.total_ious} 条欠条
                    </p>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    支持 .txt 或 .pkl 格式的 pickle 文件
                  </p>
                  <label>
                    <input
                      type="file"
                      accept=".txt,.pkl"
                      onChange={handleImport}
                      disabled={isImporting}
                      className="hidden"
                    />
                    <Button disabled={isImporting} asChild>
                      <span>
                        {isImporting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            导入中...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            选择文件并导入
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                注意：导入会追加数据，不会覆盖现有数据。重复的欠条 ID 会被跳过。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              导出数据
            </CardTitle>
            <CardDescription>
              将数据库数据导出为桌面应用格式（pickle）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                导出的 ZIP 文件包含：
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>business_data.txt - pickle 格式，可用于桌面应用</li>
                <li>summary.txt - 可读的文本摘要</li>
              </ul>
              <Button onClick={handleExport} disabled={isExporting || !stats?.ious}>
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    导出数据
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Clear Data */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              清空数据
            </CardTitle>
            <CardDescription>
              删除当前用户的所有欠条、明细和付款记录（清空前会自动导出备份）
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showClearConfirm ? (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">警告：此操作不可恢复！</p>
                    <p>系统会在清空前自动导出备份文件。</p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowClearConfirm(true)}
                  disabled={!stats?.ious}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  清空所有数据
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-red-100 rounded-lg">
                  <p className="text-red-800 font-medium mb-2">确认清空以下数据？</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• {stats?.ious || 0} 条欠条</li>
                    <li>• {stats?.items || 0} 条明细</li>
                    <li>• {stats?.payments || 0} 条付款</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">请输入管理密码以确认操作</span>
                  </div>
                  <Input
                    type="password"
                    placeholder="请输入密码"
                    value={clearPassword}
                    onChange={(e) => setClearPassword(e.target.value)}
                    disabled={isClearing}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowClearConfirm(false);
                      setClearPassword("");
                    }}
                    disabled={isClearing}
                  >
                    取消
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleClear}
                    disabled={isClearing || !clearPassword}
                  >
                    {isClearing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        清空中...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        确认清空
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
