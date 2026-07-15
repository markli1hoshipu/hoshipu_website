"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, DollarSign, Trash2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useYIFAuth } from "@/hooks/useYIFAuth";
import { useDefaultExpandDetails } from "@/components/yif/DetailViewSettings";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

interface Payment {
  id: number;
  ious_id: number; // 关联欠条的数据库ID（用于拉取明细）
  payment_date: string;
  amount: number;
  payer_name: string;
  user_code: string;
  iou_ious_id: string;
  remark: string;
}

interface IOUItem {
  client: string;
  amount: number;
  flight: string;
  ticket_number: string;
  remark: string;
}

interface IOUPayment {
  payment_date: string;
  payer_name: string;
  amount: number;
  remark?: string;
}

interface IOUDetail {
  id: number;
  ious_id: string;
  ious_date: string;
  total_amount: number;
  rest: number;
  items: IOUItem[];
  payments: IOUPayment[];
}

interface PaidIOU {
  id: number;
  ious_id: string;
  ious_date: string;
  total_amount: number;
}

export default function PaymentSearchPage() {
  const { user, loading: authLoading, getToken } = useYIFAuth();
  const [searchParams, setSearchParams] = useState({
    startDate: "",
    endDate: "",
    payerName: "",
    remark: "",
  });
  const [searchResults, setSearchResults] = useState<Payment[]>([]);
  const [defaultExpand] = useDefaultExpandDetails();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [iouCache, setIouCache] = useState<Record<number, IOUDetail>>({});
  const [iouError, setIouError] = useState<Set<number>>(new Set());
  const requestedRef = useRef<Set<number>>(new Set());
  const [paidIOUs, setPaidIOUs] = useState<PaidIOU[]>([]);

  // 按需拉取欠条明细（按数据库ID缓存，去重，避免重复请求）
  const ensureIOULoaded = useCallback(async (iouDbId: number) => {
    if (requestedRef.current.has(iouDbId)) return;
    requestedRef.current.add(iouDbId);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/yif/ious/${iouDbId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIouCache((prev) => ({ ...prev, [iouDbId]: data.iou }));
      } else {
        setIouError((prev) => new Set(prev).add(iouDbId));
      }
    } catch {
      setIouError((prev) => new Set(prev).add(iouDbId));
    }
  }, [getToken]);

  // 展开的付款行 → 确保其对应欠条明细已加载
  useEffect(() => {
    const ids = new Set<number>();
    searchResults.forEach((p) => {
      if (expandedRows.has(p.id)) ids.add(p.ious_id);
    });
    ids.forEach((id) => ensureIOULoaded(id));
  }, [expandedRows, searchResults, ensureIOULoaded]);

  const toggleExpand = (paymentId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(paymentId)) next.delete(paymentId);
      else next.add(paymentId);
      return next;
    });
  };
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPaid, setIsLoadingPaid] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [total, setTotal] = useState(0);
  const [exportFileName, setExportFileName] = useState("");

  // All hooks must be before early returns
  const handleSearch = useCallback(async () => {
    if (!user) return;
    setIsSearching(true);
    setMessage(null);
    try {
      const token = getToken();
      const params = new URLSearchParams();

      if (searchParams.startDate) params.append("start_date", searchParams.startDate);
      if (searchParams.endDate) params.append("end_date", searchParams.endDate);
      if (searchParams.payerName) params.append("payer_name", searchParams.payerName);
      if (searchParams.remark) params.append("remark", searchParams.remark);
      params.append("limit", "200");

      const response = await fetch(`${API_BASE_URL}/api/yif/payments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        const payments: Payment[] = data.payments;
        setSearchResults(payments);
        setTotal(data.total);
        // 重置明细缓存与展开状态
        requestedRef.current = new Set();
        setIouCache({});
        setIouError(new Set());
        setExpandedRows(defaultExpand ? new Set(payments.map((p) => p.id)) : new Set());
      } else {
        setMessage({ type: "error", text: data.detail || "搜索失败" });
      }
    } catch (err) {
      console.error("Search failed:", err);
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setIsSearching(false);
    }
  }, [searchParams, getToken, user, defaultExpand]);


  // Early returns after hooks
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.role === "admin" || user.role === "manager";

  const handleSearchChange = (field: string, value: string) => {
    setSearchParams((prev) => ({ ...prev, [field]: value }));
  };

  const handleExport = async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams();

      if (searchParams.startDate) params.append("start_date", searchParams.startDate);
      if (searchParams.endDate) params.append("end_date", searchParams.endDate);
      if (searchParams.payerName) params.append("payer_name", searchParams.payerName);

      const response = await fetch(`${API_BASE_URL}/api/yif/export/payments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileName = exportFileName.trim() || `payments_export_${new Date().toISOString().slice(0, 10)}`;
      a.download = `${fileName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage({ type: "success", text: "导出完成" });
    } catch (err) {
      console.error("Export failed:", err);
      setMessage({ type: "error", text: "导出失败" });
    }
  };

  const loadPaidIOUs = async () => {
    if (!isAdmin) return;

    setIsLoadingPaid(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/yif/admin/paid-off`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setPaidIOUs(data.ious);
        setMessage({ type: "success", text: `找到 ${data.count} 条已付清欠条` });
      } else {
        setMessage({ type: "error", text: data.detail || "加载已付清欠条失败" });
      }
    } catch (err) {
      console.error("Load failed:", err);
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setIsLoadingPaid(false);
    }
  };

  const handleClearPaid = async () => {
    if (!adminPassword) {
      setMessage({ type: "error", text: "请输入管理员密码" });
      return;
    }

    if (!confirm(`确定要清除 ${paidIOUs.length} 条已付清欠条吗？此操作不可撤销。`)) {
      return;
    }

    setIsClearing(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/yif/admin/clear-paid`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ admin_password: adminPassword }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setMessage({ type: "success", text: data.message });
        setPaidIOUs([]);
        setAdminPassword("");
      } else {
        setMessage({ type: "error", text: data.detail || "清除失败" });
      }
    } catch (err) {
      console.error("Clear failed:", err);
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setIsClearing(false);
    }
  };

  // Calculate totals
  const totalAmount = searchResults.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold">付款搜索与导出</h1>
          <p className="text-muted-foreground mt-1">搜索付款记录并管理已付清欠条</p>
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

        {/* Search Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              搜索条件
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">开始日期</label>
                <Input
                  placeholder="YYMMDD"
                  value={searchParams.startDate}
                  onChange={(e) => handleSearchChange("startDate", e.target.value)}
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">结束日期</label>
                <Input
                  placeholder="YYMMDD"
                  value={searchParams.endDate}
                  onChange={(e) => handleSearchChange("endDate", e.target.value)}
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">付款人</label>
                <Input
                  placeholder="付款人名称"
                  value={searchParams.payerName}
                  onChange={(e) => handleSearchChange("payerName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">备注</label>
                <Input
                  placeholder="备注关键词"
                  value={searchParams.remark}
                  onChange={(e) => handleSearchChange("remark", e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    搜索中...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    搜索
                  </>
                )}
              </Button>
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="文件名（可选）"
                  value={exportFileName}
                  onChange={(e) => setExportFileName(e.target.value)}
                  className="w-[160px]"
                />
                <Button variant="outline" onClick={handleExport} disabled={searchResults.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  导出Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>付款记录</span>
              {searchResults.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {total} 条记录, 合计: ¥{totalAmount.toLocaleString()}
                </span>
              )}
            </CardTitle>
            <CardDescription>符合条件的付款记录</CardDescription>
          </CardHeader>
          <CardContent>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无结果</p>
                <p className="text-sm">请设置搜索条件并点击搜索</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-center py-3 px-2 w-8">明细</th>
                      <th className="text-left py-3 px-2">日期</th>
                      <th className="text-left py-3 px-2">欠条ID</th>
                      <th className="text-left py-3 px-2">付款人</th>
                      <th className="text-right py-3 px-2">金额</th>
                      <th className="text-left py-3 px-2">操作人</th>
                      <th className="text-left py-3 px-2">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((p) => {
                      const isExpanded = expandedRows.has(p.id);
                      const detail = iouCache[p.ious_id];
                      const hasError = iouError.has(p.ious_id);
                      return (
                        <React.Fragment key={p.id}>
                          <tr className="border-b hover:bg-muted/30">
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={() => toggleExpand(p.id)}
                                className="p-1 hover:bg-muted rounded"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="py-2 px-2">{p.payment_date}</td>
                            <td className="py-2 px-2 font-mono">{p.iou_ious_id}</td>
                            <td className="py-2 px-2">{p.payer_name}</td>
                            <td className="py-2 px-2 text-right text-green-600">
                              ¥{p.amount.toLocaleString()}
                            </td>
                            <td className="py-2 px-2">{p.user_code}</td>
                            <td className="py-2 px-2 text-muted-foreground">{p.remark || "-"}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-muted/20">
                              <td colSpan={7} className="p-4">
                                {hasError ? (
                                  <p className="text-sm text-muted-foreground">无法加载明细（可能无权限查看该欠条）</p>
                                ) : !detail ? (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                    加载明细中...
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 欠条明细（子欠条） */}
                                    <div>
                                      <h4 className="font-medium mb-2">
                                        欠条明细 · {detail.ious_id}
                                        <span className="ml-2 text-xs text-muted-foreground">
                                          总额 ¥{detail.total_amount.toLocaleString()} / 剩余 ¥{detail.rest.toLocaleString()}
                                        </span>
                                      </h4>
                                      <div className="space-y-1 text-sm">
                                        {detail.items.map((item, idx) => (
                                          <div key={idx}>
                                            <div className="flex justify-between">
                                              <span>{item.client} | {item.flight || "-"} | {item.ticket_number || "-"}</span>
                                              <span>¥{item.amount.toLocaleString()}</span>
                                            </div>
                                            {item.remark && (
                                              <div className="text-muted-foreground text-xs pl-2">└ {item.remark}</div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* 该欠条的全部付款记录 */}
                                    <div>
                                      <h4 className="font-medium mb-2">付款记录 ({detail.payments?.length || 0})</h4>
                                      {!detail.payments || detail.payments.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">暂无付款</p>
                                      ) : (
                                        <div className="space-y-1 text-sm">
                                          {detail.payments.map((pay, idx) => (
                                            <div key={idx}>
                                              <div className="flex justify-between">
                                                <span>{pay.payment_date} | {pay.payer_name}</span>
                                                <span className="text-green-600">¥{pay.amount.toLocaleString()}</span>
                                              </div>
                                              {pay.remark && (
                                                <div className="text-muted-foreground text-xs pl-2">└ {pay.remark}</div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Functions */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                管理员功能
              </CardTitle>
              <CardDescription>管理已付清欠条记录（仅管理员可用）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">管理员密码</label>
                  <Input
                    type="password"
                    placeholder="请输入您的密码"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadPaidIOUs} disabled={isLoadingPaid}>
                  {isLoadingPaid ? "加载中..." : "查找已付清欠条"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleClearPaid}
                  disabled={isClearing || paidIOUs.length === 0}
                >
                  {isClearing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      清除中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      清除 {paidIOUs.length > 0 ? `${paidIOUs.length} 条` : ""}已付清欠条
                    </>
                  )}
                </Button>
              </div>

              {paidIOUs.length > 0 && (
                <div className="mt-4 border rounded-lg p-4">
                  <h4 className="font-medium mb-2">已付清欠条 ({paidIOUs.length})</h4>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">日期</th>
                          <th className="text-left py-2">欠条ID</th>
                          <th className="text-right py-2">金额</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paidIOUs.map((iou) => (
                          <tr key={iou.id} className="border-b">
                            <td className="py-1">{iou.ious_date}</td>
                            <td className="py-1 font-mono">{iou.ious_id}</td>
                            <td className="py-1 text-right">¥{iou.total_amount?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
