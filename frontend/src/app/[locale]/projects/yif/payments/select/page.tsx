"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckSquare, Search, Upload, FileText, CheckCircle, AlertCircle, Square, CheckSquare2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useYIFAuth } from "@/hooks/useYIFAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

interface IOUItem {
  client: string;
  amount: number;
  flight: string;
  ticket_number: string;
  remark: string;
}

interface IOU {
  id: number;
  ious_id: string;
  ious_date: string;
  total_amount: number;
  rest: number;
  items: IOUItem[];
}

interface AllocationPreview {
  iou_id: string;
  db_id: number;
  rest_before: number;
  payment: number;
  rest_after: number;
  is_negative: boolean;
}

export default function SelectivePaymentPage() {
  const { user, loading: authLoading, getToken } = useYIFAuth();
  const [paymentData, setPaymentData] = useState({
    userName: "",
    date: "",
    payerName: "",
    amount: "",
    remark: "",
  });
  const [searchParams, setSearchParams] = useState({
    startDate: "",
    endDate: "",
    customer: "",
    ticketNumber: "",
    remainingAmount: "",
    flightSegment: "",
    remark: "",
  });
  const [searchResults, setSearchResults] = useState<IOU[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Selected IOUs - must be before early returns
  const selectedIOUs = useMemo(() => {
    return searchResults.filter((iou) => selectedIds.has(iou.id));
  }, [searchResults, selectedIds]);

  // Calculate allocation preview - must be before early returns
  const allocationPreview = useMemo((): AllocationPreview[] => {
    const amount = parseFloat(paymentData.amount) || 0;
    if (amount <= 0 || selectedIOUs.length === 0) return [];

    // Separate negative and positive
    const negativeIOUs = selectedIOUs.filter((iou) => iou.rest < 0);
    const positiveIOUs = selectedIOUs.filter((iou) => iou.rest > 0);

    let remaining = amount;
    const preview: AllocationPreview[] = [];

    // First, allocate to negative IOUs (pay their absolute value)
    for (const iou of negativeIOUs) {
      const negativePayment = iou.rest; // This is already negative
      preview.push({
        iou_id: iou.ious_id,
        db_id: iou.id,
        rest_before: iou.rest,
        payment: negativePayment,
        rest_after: 0,
        is_negative: true,
      });
      remaining -= negativePayment; // Subtracting negative = adding
    }

    // Then allocate to positive IOUs
    for (const iou of positiveIOUs) {
      if (remaining <= 0) break;

      const payment = Math.min(iou.rest, remaining);
      preview.push({
        iou_id: iou.ious_id,
        db_id: iou.id,
        rest_before: iou.rest,
        payment,
        rest_after: iou.rest - payment,
        is_negative: false,
      });
      remaining -= payment;
    }

    return preview;
  }, [paymentData.amount, selectedIOUs]);

  // Calculate totals - must be before early returns
  const selectedTotal = useMemo(() => selectedIOUs.reduce((sum, iou) => sum + iou.rest, 0), [selectedIOUs]);
  const negativeTotal = useMemo(() => selectedIOUs.filter((iou) => iou.rest < 0).reduce((sum, iou) => sum + Math.abs(iou.rest), 0), [selectedIOUs]);
  const positiveTotal = useMemo(() => selectedIOUs.filter((iou) => iou.rest > 0).reduce((sum, iou) => sum + iou.rest, 0), [selectedIOUs]);
  const paymentAmount = parseFloat(paymentData.amount) || 0;
  const isPaymentValid = paymentAmount > 0 && paymentAmount <= selectedTotal;

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

  const handlePaymentChange = (field: string, value: string) => {
    setPaymentData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearchChange = (field: string, value: string) => {
    setSearchParams((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setMessage(null);
    try {
      const token = getToken();
      const params = new URLSearchParams();

      if (searchParams.startDate) params.append("start_date", searchParams.startDate);
      if (searchParams.endDate) params.append("end_date", searchParams.endDate);
      if (searchParams.customer) params.append("client", searchParams.customer);
      if (searchParams.ticketNumber) params.append("ticket_number", searchParams.ticketNumber);
      if (searchParams.remainingAmount) {
        params.append("remaining_amount", searchParams.remainingAmount);
        params.append("amount_margin", "100");
      }
      if (searchParams.flightSegment) params.append("flight", searchParams.flightSegment);
      if (searchParams.remark) params.append("remark", searchParams.remark);
      // Get all unpaid IOUs including negative ones
      params.append("status", "0,1,3,4");
      params.append("limit", "100");

      const response = await fetch(`${API_BASE_URL}/api/yif/ious?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        // Filter and sort by date (newest first)
        const ious = data.ious
          .filter((iou: IOU) => iou.rest !== 0)
          .sort((a: IOU, b: IOU) => b.ious_date.localeCompare(a.ious_date) || b.ious_id.localeCompare(a.ious_id));
        setSearchResults(ious);
        setSelectedIds(new Set());
        setExpandedRows(new Set());
      } else {
        setMessage({ type: "error", text: data.detail || "搜索失败" });
      }
    } catch (err) {
      console.error("Search failed:", err);
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === searchResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(searchResults.map((iou) => iou.id)));
    }
  };

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSubmit = async () => {
    // Validation
    if (!paymentData.userName.match(/^[A-Za-z]{2,3}$/)) {
      setMessage({ type: "error", text: "用户名必须是2-3个字母" });
      return;
    }
    if (!paymentData.date.match(/^\d{6}$/)) {
      setMessage({ type: "error", text: "日期必须是YYMMDD格式" });
      return;
    }
    if (!paymentData.payerName.trim()) {
      setMessage({ type: "error", text: "付款人姓名必填" });
      return;
    }
    if (selectedIOUs.length === 0) {
      setMessage({ type: "error", text: "请至少选择一条欠条" });
      return;
    }
    if (!isPaymentValid) {
      setMessage({ type: "error", text: "付款金额无效" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const token = getToken();
      // Get IOU IDs in order (negative first, then positive)
      const iouDbIds = [
        ...selectedIOUs.filter((iou) => iou.rest < 0).map((iou) => iou.id),
        ...selectedIOUs.filter((iou) => iou.rest > 0).map((iou) => iou.id),
      ];

      const response = await fetch(`${API_BASE_URL}/api/yif/payments/selective`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_code: paymentData.userName.toUpperCase(),
          payment_date: paymentData.date,
          payer_name: paymentData.payerName,
          total_amount: paymentAmount,
          ious_db_ids: iouDbIds,
          remark: paymentData.remark || "",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: "success", text: `${data.message}: 创建了 ${data.payments.length} 条付款记录` });
        // Clear form and selection
        setPaymentData((prev) => ({
          ...prev,
          amount: "",
          remark: "",
        }));
        setSelectedIds(new Set());
        // Refresh search
        handleSearch();
      } else {
        setMessage({ type: "error", text: data.detail || "创建付款记录失败" });
      }
    } catch (err) {
      console.error("Submit failed:", err);
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setIsSubmitting(false);
    }
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
          <h1 className="text-3xl font-bold">选择性付款录入</h1>
          <p className="text-muted-foreground mt-1">手动选择欠条 - 负数欠条优先清算</p>
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

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              付款信息
            </CardTitle>
            <CardDescription>输入付款详情，然后在下方选择欠条</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">用户名（2-3个字母）*</label>
                <Input
                  placeholder="如: HSP"
                  value={paymentData.userName}
                  onChange={(e) => handlePaymentChange("userName", e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">日期 (YYMMDD) *</label>
                <Input
                  placeholder="如: 241220"
                  value={paymentData.date}
                  onChange={(e) => handlePaymentChange("date", e.target.value)}
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">付款人姓名 *</label>
                <Input
                  placeholder="输入付款人姓名"
                  value={paymentData.payerName}
                  onChange={(e) => handlePaymentChange("payerName", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">付款金额 *</label>
                <Input
                  type="number"
                  placeholder="输入付款金额"
                  value={paymentData.amount}
                  onChange={(e) => handlePaymentChange("amount", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">备注</label>
                <Input
                  placeholder="可选备注"
                  value={paymentData.remark}
                  onChange={(e) => handlePaymentChange("remark", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              搜索欠条
            </CardTitle>
            <CardDescription>查找欠条以选择付款</CardDescription>
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
                <label className="text-sm font-medium">客户</label>
                <Input
                  placeholder="客户名称"
                  value={searchParams.customer}
                  onChange={(e) => handleSearchChange("customer", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">剩余金额 (±100)</label>
                <Input
                  type="number"
                  placeholder="金额"
                  value={searchParams.remainingAmount}
                  onChange={(e) => handleSearchChange("remainingAmount", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">票号</label>
                <Input
                  placeholder="票号"
                  value={searchParams.ticketNumber}
                  onChange={(e) => handleSearchChange("ticketNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">航班</label>
                <Input
                  placeholder="航班代码"
                  value={searchParams.flightSegment}
                  onChange={(e) => handleSearchChange("flightSegment", e.target.value)}
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
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  搜索中...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  搜索欠条
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Summary and Submit - MOVED ABOVE IOU SELECTION */}
        {selectedIOUs.length > 0 && (
          <Card className={allocationPreview.length > 0 ? "border-green-200 bg-green-50" : ""}>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-lg font-medium">付款汇总</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>已选: <span className="font-bold">{selectedIds.size}</span> 条欠条</p>
                    <p>
                      合计金额: <span className={`font-bold ${selectedTotal < 0 ? "text-blue-600" : "text-red-600"}`}>
                        ¥{selectedTotal.toLocaleString()}
                      </span>
                      {negativeTotal > 0 && (
                        <span className="text-xs ml-2">(负数: -¥{negativeTotal.toLocaleString()}, 正数: ¥{positiveTotal.toLocaleString()})</span>
                      )}
                    </p>
                    {allocationPreview.length > 0 && (
                      <>
                        <p className="text-green-700">
                          ¥{paymentAmount.toLocaleString()} 将分配到 {allocationPreview.length} 条欠条
                        </p>
                        {allocationPreview.filter((a) => a.is_negative).length > 0 && (
                          <p className="text-blue-600">
                            {allocationPreview.filter((a) => a.is_negative).length} 条负数欠条将被清算
                          </p>
                        )}
                        <p className="text-green-600">
                          {allocationPreview.filter((a) => !a.is_negative && a.rest_after === 0).length} 条正数欠条将全额付清
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isPaymentValid || selectedIOUs.length === 0}
                  size="lg"
                  className="whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      处理中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      确认付款
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selection Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>选择欠条</CardTitle>
              <CardDescription>勾选要包含在付款中的欠条，点击展开按钮查看明细</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="gap-2"
              disabled={searchResults.length === 0}
            >
              {selectedIds.size === searchResults.length && searchResults.length > 0 ? (
                <CheckSquare2 className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              全选
            </Button>
          </CardHeader>
          <CardContent>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无结果</p>
                <p className="text-sm">搜索欠条进行选择</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 w-8">选择</th>
                      <th className="text-left py-3 px-2 w-8">明细</th>
                      <th className="text-left py-3 px-2">日期</th>
                      <th className="text-left py-3 px-2">欠条ID</th>
                      <th className="text-left py-3 px-2">客户</th>
                      <th className="text-right py-3 px-2">剩余金额</th>
                      <th className="text-center py-3 px-2">分配金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((iou) => {
                      const isSelected = selectedIds.has(iou.id);
                      const isExpanded = expandedRows.has(iou.id);
                      const allocation = allocationPreview.find((a) => a.db_id === iou.id);
                      const isNegative = iou.rest < 0;

                      return (
                        <React.Fragment key={iou.id}>
                          <tr
                            className={`border-b hover:bg-muted/30 cursor-pointer ${
                              isSelected ? (isNegative ? "bg-blue-50" : "bg-green-50") : ""
                            }`}
                            onClick={() => toggleSelect(iou.id)}
                          >
                            <td className="py-2 px-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(iou.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <button
                                onClick={(e) => toggleExpand(iou.id, e)}
                                className="p-1 hover:bg-muted rounded"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                            <td className="py-2 px-2">{iou.ious_date}</td>
                            <td className="py-2 px-2 font-mono">{iou.ious_id}</td>
                            <td className="py-2 px-2">{iou.items[0]?.client || "-"}</td>
                            <td className={`py-2 px-2 text-right ${isNegative ? "text-blue-600" : "text-red-600"}`}>
                              ¥{iou.rest.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {allocation ? (
                                <span className={`inline-flex items-center gap-1 ${allocation.is_negative ? "text-blue-600" : "text-green-600"}`}>
                                  <ArrowRight className="h-4 w-4" />
                                  ¥{allocation.payment.toLocaleString()}
                                </span>
                              ) : isSelected ? (
                                <span className="text-muted-foreground text-xs">等待中...</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                          {/* Expanded row showing IOU details */}
                          {isExpanded && (
                            <tr className="bg-muted/20">
                              <td colSpan={7} className="p-4">
                                <div className="text-sm">
                                  <h4 className="font-medium mb-2">欠条明细</h4>
                                  <div className="grid grid-cols-1 gap-2">
                                    {iou.items.map((item, idx) => (
                                      <div key={idx} className="flex flex-wrap gap-x-4 gap-y-1 p-2 bg-background rounded border">
                                        <span><strong>客户:</strong> {item.client}</span>
                                        <span><strong>金额:</strong> ¥{item.amount.toLocaleString()}</span>
                                        {item.ticket_number && <span><strong>票号:</strong> {item.ticket_number}</span>}
                                        {item.flight && <span><strong>航班:</strong> {item.flight}</span>}
                                        {item.remark && <span><strong>备注:</strong> {item.remark}</span>}
                                      </div>
                                    ))}
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

        {/* Allocation Logic Info */}
        <div className="flex justify-between items-center text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
          <div>
            <p className="font-medium mb-1">付款分配逻辑:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>负数欠条（蓝色）优先清算，支付其绝对值</li>
              <li>剩余金额按选择顺序分配到正数欠条</li>
            </ol>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
