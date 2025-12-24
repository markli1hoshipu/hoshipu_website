"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListOrdered, Search, Upload, FileText, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { useYIFAuth } from "@/hooks/useYIFAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

interface IOU {
  id: number;
  ious_id: string;
  ious_date: string;
  total_amount: number;
  rest: number;
  items: { client: string }[];
}

interface AllocationPreview {
  iou_id: string;
  rest_before: number;
  payment: number;
  rest_after: number;
}

export default function BatchPaymentPage() {
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
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Calculate allocation preview - must be before early returns
  const allocationPreview = useMemo((): AllocationPreview[] => {
    const amount = parseFloat(paymentData.amount) || 0;
    if (amount <= 0 || searchResults.length === 0) return [];

    let remaining = amount;
    const preview: AllocationPreview[] = [];

    for (const iou of searchResults) {
      if (remaining <= 0) break;
      if (iou.rest <= 0) continue;

      const payment = Math.min(iou.rest, remaining);
      preview.push({
        iou_id: iou.ious_id,
        rest_before: iou.rest,
        payment,
        rest_after: iou.rest - payment,
      });
      remaining -= payment;
    }

    return preview;
  }, [paymentData.amount, searchResults]);

  const totalRest = useMemo(() => searchResults.reduce((sum, iou) => sum + iou.rest, 0), [searchResults]);
  const paymentAmount = parseFloat(paymentData.amount) || 0;
  const isPaymentValid = paymentAmount > 0 && paymentAmount <= totalRest;

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
      // Only get unpaid IOUs (exclude negative and paid)
      params.append("status", "0,1");
      params.append("limit", "100");

      const response = await fetch(`${API_BASE_URL}/api/yif/ious?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        // Filter out fully paid and sort by date (newest first)
        const unpaidIOUs = data.ious
          .filter((iou: IOU) => iou.rest > 0)
          .sort((a: IOU, b: IOU) => b.ious_date.localeCompare(a.ious_date) || b.ious_id.localeCompare(a.ious_id));
        setSearchResults(unpaidIOUs);
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
    if (!isPaymentValid) {
      setMessage({ type: "error", text: "付款金额无效" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const token = getToken();
      // Get IOU IDs in order
      const iouDbIds = searchResults.filter((iou) => iou.rest > 0).map((iou) => iou.id);

      const response = await fetch(`${API_BASE_URL}/api/yif/payments/batch`, {
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
        // Clear form
        setPaymentData((prev) => ({
          ...prev,
          amount: "",
          remark: "",
        }));
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
          <h1 className="text-3xl font-bold">批量付款录入</h1>
          <p className="text-muted-foreground mt-1">将一笔付款按顺序分配到多条欠条</p>
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
              <ListOrdered className="h-5 w-5" />
              付款信息
            </CardTitle>
            <CardDescription>输入总金额 - 将按顺序分配到各欠条</CardDescription>
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
                <label className="text-sm font-medium">总金额 *</label>
                <Input
                  type="number"
                  placeholder="输入总付款金额"
                  value={paymentData.amount}
                  onChange={(e) => handlePaymentChange("amount", e.target.value)}
                />
                {searchResults.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    剩余总额: ¥{totalRest.toLocaleString()}
                  </p>
                )}
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

        {/* Search IOU Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              搜索欠条
            </CardTitle>
            <CardDescription>查找欠条以分配付款（将按日期顺序分配）</CardDescription>
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

        {/* Results and Allocation Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>欠条列表与分配预览</span>
              {searchResults.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {searchResults.length} 条欠条, 总计: ¥{totalRest.toLocaleString()}
                </span>
              )}
            </CardTitle>
            <CardDescription>付款将按显示顺序分配</CardDescription>
          </CardHeader>
          <CardContent>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无结果</p>
                <p className="text-sm">搜索欠条以查看分配预览</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">#</th>
                      <th className="text-left py-3 px-2">日期</th>
                      <th className="text-left py-3 px-2">欠条ID</th>
                      <th className="text-left py-3 px-2">客户</th>
                      <th className="text-right py-3 px-2">剩余金额</th>
                      <th className="text-center py-3 px-2">分配金额</th>
                      <th className="text-right py-3 px-2">付后余额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((iou, idx) => {
                      const allocation = allocationPreview.find((a) => a.iou_id === iou.ious_id);
                      return (
                        <tr key={iou.id} className={`border-b hover:bg-muted/30 ${allocation ? "bg-green-50" : ""}`}>
                          <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2 px-2">{iou.ious_date}</td>
                          <td className="py-2 px-2 font-mono">{iou.ious_id}</td>
                          <td className="py-2 px-2">{iou.items[0]?.client || "-"}</td>
                          <td className="py-2 px-2 text-right text-red-600">
                            ¥{iou.rest.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {allocation ? (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <ArrowRight className="h-4 w-4" />
                                ¥{allocation.payment.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {allocation ? (
                              <span className={allocation.rest_after === 0 ? "text-green-600" : "text-orange-600"}>
                                ¥{allocation.rest_after.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary and Submit */}
        {allocationPreview.length > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-medium">分配汇总</p>
                  <p className="text-sm text-muted-foreground">
                    ¥{paymentAmount.toLocaleString()} 将分配到 {allocationPreview.length} 条欠条
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {allocationPreview.filter((a) => a.rest_after === 0).length} 条将全额付清
                  </p>
                </div>
                <Button onClick={handleSubmit} disabled={isSubmitting || !isPaymentValid} size="lg">
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      处理中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      确认批量付款
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
