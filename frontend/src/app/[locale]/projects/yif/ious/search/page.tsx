"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useYIFAuth } from "@/hooks/useYIFAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

interface IOUItem {
  client: string;
  amount: number;
  flight: string;
  ticket_number: string;
  remark: string;
}

interface Payment {
  payment_date: string;
  payer_name: string;
  amount: number;
  remark: string;
}

interface IOU {
  id: number;
  ious_id: string;
  user_code: string;
  ious_date: string;
  total_amount: number;
  status: number;
  paid: number;
  rest: number;
  items: IOUItem[];
  payments: Payment[];
}

export default function IOUSearchPage() {
  const { user, loading: authLoading, getToken } = useYIFAuth();
  const [searchParams, setSearchParams] = useState({
    startDate: "",
    endDate: "",
    customer: "",
    ticketNumber: "",
    remainingAmount: "",
    amountMargin: "100",
    initialAmount: "",
    initialMargin: "100",
    flightSegment: "",
    status: "all",
    remark: "",
    iouId: "",
  });
  const [results, setResults] = useState<IOU[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [total, setTotal] = useState(0);
  const [exportFileName, setExportFileName] = useState("");

  // All hooks must be before early returns
  const handleSearch = useCallback(async () => {
    if (!user) return;
    setIsSearching(true);
    try {
      const token = getToken();
      const params = new URLSearchParams();

      if (searchParams.startDate) params.append("start_date", searchParams.startDate);
      if (searchParams.endDate) params.append("end_date", searchParams.endDate);
      if (searchParams.customer) params.append("client", searchParams.customer);
      if (searchParams.ticketNumber) params.append("ticket_number", searchParams.ticketNumber);
      if (searchParams.remainingAmount) {
        params.append("remaining_amount", searchParams.remainingAmount);
        params.append("amount_margin", searchParams.amountMargin || "100");
      }
      if (searchParams.initialAmount) {
        params.append("initial_amount", searchParams.initialAmount);
        params.append("initial_margin", searchParams.initialMargin || "100");
      }
      if (searchParams.flightSegment) params.append("flight", searchParams.flightSegment);
      if (searchParams.status && searchParams.status !== "all") {
        params.append("status", searchParams.status);
      }
      if (searchParams.remark) params.append("remark", searchParams.remark);
      if (searchParams.iouId) params.append("ious_id", searchParams.iouId);
      params.append("limit", "200");

      const response = await fetch(`${API_BASE_URL}/api/yif/ious?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.ious);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  }, [searchParams, getToken, user]);


  // Early returns after hooks
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

  const handleSearchChange = (field: string, value: string) => {
    setSearchParams((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: number) => {
    const statusMap: Record<number, { label: string; className: string }> = {
      0: { label: "未付款", className: "bg-red-100 text-red-800" },
      1: { label: "部分付款", className: "bg-yellow-100 text-yellow-800" },
      2: { label: "已付清", className: "bg-green-100 text-green-800" },
      3: { label: "负数", className: "bg-purple-100 text-purple-800" },
      4: { label: "超额付款", className: "bg-blue-100 text-blue-800" },
    };
    return statusMap[status] || { label: "未知", className: "bg-gray-100 text-gray-800" };
  };

  const handleExport = async (exportType: string) => {
    setIsExporting(true);
    try {
      const token = getToken();
      const params = new URLSearchParams();

      if (searchParams.startDate) params.append("start_date", searchParams.startDate);
      if (searchParams.endDate) params.append("end_date", searchParams.endDate);
      if (searchParams.status && searchParams.status !== "all") {
        params.append("status", searchParams.status);
      }
      params.append("export_type", exportType);

      const response = await fetch(`${API_BASE_URL}/api/yif/export/ious?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const fileName = exportFileName.trim() || `ious_export_${new Date().toISOString().slice(0, 10)}`;
        a.download = `${fileName}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold">欠条搜索与导出</h1>
          <p className="text-muted-foreground mt-1">按条件搜索欠条记录并导出</p>
        </div>

        {/* Search Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              搜索条件
            </CardTitle>
            <CardDescription>状态: 0=未付款, 1=部分付款, 2=已付清, 3=负数, 4=超额付款</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Date Range */}
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
                <label className="text-sm font-medium">客户名</label>
                <Input
                  placeholder="客户名称"
                  value={searchParams.customer}
                  onChange={(e) => handleSearchChange("customer", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">票号</label>
                <Input
                  placeholder="票号"
                  value={searchParams.ticketNumber}
                  onChange={(e) => handleSearchChange("ticketNumber", e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Amounts */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">剩余金额</label>
                <Input
                  type="number"
                  placeholder="金额"
                  value={searchParams.remainingAmount}
                  onChange={(e) => handleSearchChange("remainingAmount", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">误差 (±)</label>
                <Input
                  type="number"
                  placeholder="±范围"
                  value={searchParams.amountMargin}
                  onChange={(e) => handleSearchChange("amountMargin", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">初始金额</label>
                <Input
                  type="number"
                  placeholder="金额"
                  value={searchParams.initialAmount}
                  onChange={(e) => handleSearchChange("initialAmount", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">误差 (±)</label>
                <Input
                  type="number"
                  placeholder="±范围"
                  value={searchParams.initialMargin}
                  onChange={(e) => handleSearchChange("initialMargin", e.target.value)}
                />
              </div>
            </div>

            {/* Row 3: Other filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">航班</label>
                <Input
                  placeholder="航班号"
                  value={searchParams.flightSegment}
                  onChange={(e) => handleSearchChange("flightSegment", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">状态</label>
                <Select
                  value={searchParams.status}
                  onValueChange={(value) => handleSearchChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="0">未付款</SelectItem>
                    <SelectItem value="1">部分付款</SelectItem>
                    <SelectItem value="2">已付清</SelectItem>
                    <SelectItem value="3">负数</SelectItem>
                    <SelectItem value="4">超额付款</SelectItem>
                    <SelectItem value="0,1">未付款 + 部分付款</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">备注</label>
                <Input
                  placeholder="备注关键词"
                  value={searchParams.remark}
                  onChange={(e) => handleSearchChange("remark", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">欠条ID</label>
                <Input
                  placeholder="精确匹配"
                  value={searchParams.iouId}
                  onChange={(e) => handleSearchChange("iouId", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 items-end">
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
                <Select onValueChange={(value) => handleExport(value)} disabled={isExporting}>
                  <SelectTrigger className="w-[180px]">
                    <Download className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="导出Excel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">摘要</SelectItem>
                    <SelectItem value="detailed">详细</SelectItem>
                    <SelectItem value="full">完整 (含付款)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>搜索结果 ({total} 条记录)</CardTitle>
            <CardDescription>点击行展开付款详情</CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无结果</p>
                <p className="text-sm">请设置搜索条件并点击搜索</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 w-8"></th>
                      <th className="text-left py-3 px-2">日期</th>
                      <th className="text-left py-3 px-2">欠条ID</th>
                      <th className="text-left py-3 px-2">客户</th>
                      <th className="text-right py-3 px-2">初始金额</th>
                      <th className="text-right py-3 px-2">剩余金额</th>
                      <th className="text-center py-3 px-2">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((iou) => {
                      const statusInfo = getStatusBadge(iou.status);
                      const isExpanded = expandedRows.has(iou.id);
                      return (
                        <React.Fragment key={iou.id}>
                          <tr
                            className="border-b hover:bg-muted/30 cursor-pointer"
                            onClick={() => toggleRow(iou.id)}
                          >
                            <td className="py-2 px-2">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </td>
                            <td className="py-2 px-2">{iou.ious_date}</td>
                            <td className="py-2 px-2 font-mono">{iou.ious_id}</td>
                            <td className="py-2 px-2">{iou.items[0]?.client || "-"}</td>
                            <td className="py-2 px-2 text-right">¥{iou.total_amount.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right">
                              <span className={iou.rest > 0 ? "text-red-600" : iou.rest < 0 ? "text-blue-600" : "text-green-600"}>
                                ¥{iou.rest.toLocaleString()}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-muted/20">
                              <td colSpan={7} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Items */}
                                  <div>
                                    <h4 className="font-medium mb-2">欠条明细</h4>
                                    <div className="space-y-1 text-sm">
                                      {iou.items.map((item, idx) => (
                                        <div key={idx}>
                                          <div className="flex justify-between">
                                            <span>
                                              {item.client} | {item.flight || "-"} | {item.ticket_number || "-"}
                                            </span>
                                            <span>¥{item.amount.toLocaleString()}</span>
                                          </div>
                                          {item.remark && (
                                            <div className="text-muted-foreground text-xs pl-2">└ {item.remark}</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Payments */}
                                  <div>
                                    <h4 className="font-medium mb-2">付款记录 ({iou.payments.length})</h4>
                                    {iou.payments.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">暂无付款</p>
                                    ) : (
                                      <div className="space-y-1 text-sm">
                                        {iou.payments.map((p, idx) => (
                                          <div key={idx}>
                                            <div className="flex justify-between">
                                              <span>
                                                {p.payment_date} | {p.payer_name}
                                              </span>
                                              <span className="text-green-600">¥{p.amount.toLocaleString()}</span>
                                            </div>
                                            {p.remark && (
                                              <div className="text-muted-foreground text-xs pl-2">└ {p.remark}</div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
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
      </motion.div>
    </div>
  );
}
