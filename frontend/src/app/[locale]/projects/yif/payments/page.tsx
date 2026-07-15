"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, Search, Upload, FileText, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useYIFAuth } from "@/hooks/useYIFAuth";
import { useDefaultExpandDetails } from "@/components/yif/DetailViewSettings";
import { useIOUDetailCache, IOUDetailPanel } from "@/components/yif/IOUDetail";

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
  remark?: string;
}

interface IOU {
  id: number;
  ious_id: string;
  ious_date: string;
  total_amount: number;
  rest: number;
  items: IOUItem[];
  payments?: Payment[];
}

interface CreatedPayment {
  id: number;
  ious_id: string;
  iou_db_id: number; // 关联欠条数据库ID，用于展开明细
  amount: number;
  new_rest: number;
}

// 生成备注：{票号}: {金额}
// 票号取已勾选的子欠条；若未勾选，则取该欠条全部子欠条的票号（去重、以、连接）
const buildRemark = (amountStr: string, targetIOU: IOU | undefined, selectedIdxs: Set<number>): string => {
  if (!targetIOU) return "";
  const idxs = selectedIdxs.size > 0
    ? [...selectedIdxs].sort((a, b) => a - b)
    : targetIOU.items.map((_, i) => i);
  const tickets = [...new Set(idxs.map((i) => targetIOU.items[i]?.ticket_number).filter(Boolean))];
  const ticketStr = tickets.join("、");

  const amount = parseFloat(amountStr);
  const amountText = amountStr !== "" && !isNaN(amount) ? amount.toLocaleString() : "";

  if (ticketStr && amountText) return `${ticketStr}: ${amountText}`;
  return ticketStr || amountText;
};

export default function PaymentEntryPage() {
  const { user, loading: authLoading, getToken } = useYIFAuth();
  const [defaultExpand] = useDefaultExpandDetails();
  const [paymentData, setPaymentData] = useState({
    iouDbId: "",
    iouId: "",
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
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  // 已勾选的子欠条（仅属于当前付款目标欠条），仅用于自动填充备注
  const [selectedItemIdxs, setSelectedItemIdxs] = useState<Set<number>>(new Set());
  // 备注是否处于自动生成模式（用户手动编辑后关闭）
  const [remarkAuto, setRemarkAuto] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [createdPayments, setCreatedPayments] = useState<CreatedPayment[]>([]);
  // 最近付款记录的明细展开
  const [expandedPayments, setExpandedPayments] = useState<Set<number>>(new Set());
  const { cache: iouCache, errors: iouErrors, ensureLoaded } = useIOUDetailCache(getToken);

  const targetIOU = searchResults.find((iou) => iou.id.toString() === paymentData.iouDbId);

  // 展开的最近付款 → 确保对应欠条明细已加载（懒加载）
  useEffect(() => {
    createdPayments.forEach((p) => {
      if (expandedPayments.has(p.id)) ensureLoaded(p.iou_db_id);
    });
  }, [expandedPayments, createdPayments, ensureLoaded]);

  // 自动生成备注：当目标欠条 / 金额 / 子欠条选择变化时（且处于自动模式）
  useEffect(() => {
    if (!remarkAuto || !paymentData.iouDbId) return;
    const generated = buildRemark(paymentData.amount, targetIOU, selectedItemIdxs);
    setPaymentData((prev) => (prev.remark === generated ? prev : { ...prev, remark: generated }));
  }, [remarkAuto, paymentData.iouDbId, paymentData.amount, selectedItemIdxs, targetIOU]);

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

  // 手动编辑备注 → 关闭自动模式，尊重用户输入
  const handleRemarkChange = (value: string) => {
    setRemarkAuto(false);
    setPaymentData((prev) => ({ ...prev, remark: value }));
  };

  const handleSearchChange = (field: string, value: string) => {
    setSearchParams((prev) => ({ ...prev, [field]: value }));
  };

  const toggleExpandPayment = (paymentId: number) => {
    setExpandedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(paymentId)) next.delete(paymentId);
      else next.add(paymentId);
      return next;
    });
  };

  const handleSearch = async () => {
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
        params.append("amount_margin", "100");
      }
      if (searchParams.flightSegment) params.append("flight", searchParams.flightSegment);
      if (searchParams.remark) params.append("remark", searchParams.remark);
      // Exclude fully paid IOUs
      params.append("status", "0,1,3,4");
      params.append("limit", "100");

      const response = await fetch(`${API_BASE_URL}/api/yif/ious?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        const ious: IOU[] = data.ious;
        setSearchResults(ious);
        // 根据"默认展开"偏好设置展开状态
        setExpandedRows(defaultExpand ? new Set(ious.map((iou) => iou.id)) : new Set());
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // 选择付款目标欠条（单选）—— 切换目标时清空子欠条勾选并恢复自动备注
  const selectTargetIOU = (iou: IOU) => {
    if (paymentData.iouDbId === iou.id.toString()) return;
    setSelectedItemIdxs(new Set());
    setRemarkAuto(true);
    setPaymentData((prev) => ({
      ...prev,
      iouDbId: iou.id.toString(),
      iouId: iou.ious_id,
    }));
  };

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 勾选/取消子欠条（仅目标欠条可点），仅影响备注
  const toggleItem = (idx: number) => {
    setRemarkAuto(true); // 勾选子欠条时重新进入自动备注
    setSelectedItemIdxs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!paymentData.iouDbId) {
      setMessage({ type: "error", text: "请先选择一条欠条" });
      return;
    }
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
    if (!paymentData.amount || isNaN(parseFloat(paymentData.amount))) {
      setMessage({ type: "error", text: "请输入有效金额" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/yif/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ious_db_id: parseInt(paymentData.iouDbId),
          user_code: paymentData.userName.toUpperCase(),
          payment_date: paymentData.date,
          payer_name: paymentData.payerName,
          amount: parseFloat(paymentData.amount),
          remark: paymentData.remark || "",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: "success", text: `付款记录成功: ¥${paymentData.amount} 到 ${paymentData.iouId}` });
        setCreatedPayments((prev) => [{ ...data.payment, iou_db_id: parseInt(paymentData.iouDbId) }, ...prev]);
        setPaymentData((prev) => ({
          ...prev,
          iouDbId: "",
          iouId: "",
          amount: "",
          remark: "",
        }));
        setSelectedItemIdxs(new Set());
        setRemarkAuto(true);
        // Refresh search results
        handleSearch();
      } else {
        setMessage({ type: "error", text: data.detail || "创建付款记录失败" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "网络错误，请重试" });
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
          <h1 className="text-3xl font-bold">单笔付款录入</h1>
          <p className="text-muted-foreground mt-1">记录单笔付款到欠条</p>
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

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              付款信息
            </CardTitle>
            <CardDescription>输入付款详情</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">欠条ID *</label>
                <Input
                  placeholder="从下方搜索结果中选择"
                  value={paymentData.iouId}
                  readOnly
                  className="bg-muted"
                />
              </div>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">付款人姓名 *</label>
                <Input
                  placeholder="输入付款人姓名"
                  value={paymentData.payerName}
                  onChange={(e) => handlePaymentChange("payerName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">金额 *</label>
                <Input
                  type="number"
                  placeholder="输入金额"
                  value={paymentData.amount}
                  onChange={(e) => handlePaymentChange("amount", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  备注
                  {remarkAuto && paymentData.remark && (
                    <span className="ml-1 text-xs text-muted-foreground">(自动生成，可编辑)</span>
                  )}
                </label>
                <Input
                  placeholder="可选备注 / 勾选下方子欠条自动填充"
                  value={paymentData.remark}
                  onChange={(e) => handleRemarkChange(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting || !paymentData.iouDbId}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  录入中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  录入付款
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Search IOU Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              搜索欠条
            </CardTitle>
            <CardDescription>查找未付清的欠条以录入付款</CardDescription>
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

        {/* Search Results */}
        <Card>
          <CardHeader>
            <CardTitle>搜索结果</CardTitle>
            <CardDescription>选择要付款的欠条（左侧单选），点击箭头展开明细并可勾选子欠条填入备注</CardDescription>
          </CardHeader>
          <CardContent>
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无结果</p>
                <p className="text-sm">搜索欠条以进行付款</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-center py-3 px-2 w-8">选择</th>
                      <th className="text-center py-3 px-2 w-8">明细</th>
                      <th className="text-left py-3 px-2">日期</th>
                      <th className="text-left py-3 px-2">欠条ID</th>
                      <th className="text-left py-3 px-2">客户</th>
                      <th className="text-right py-3 px-2">原始金额</th>
                      <th className="text-right py-3 px-2">剩余金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((iou) => {
                      const isTarget = paymentData.iouDbId === iou.id.toString();
                      const isExpanded = expandedRows.has(iou.id);
                      return (
                        <React.Fragment key={iou.id}>
                          <tr
                            className={`border-b hover:bg-muted/30 cursor-pointer ${isTarget ? "bg-primary/10" : ""}`}
                            onClick={() => selectTargetIOU(iou)}
                          >
                            <td className="py-2 px-2 text-center">
                              <input
                                type="radio"
                                name="targetIOU"
                                checked={isTarget}
                                onChange={() => selectTargetIOU(iou)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={(e) => toggleExpand(iou.id, e)}
                                className="p-1 hover:bg-muted rounded"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="py-2 px-2">{iou.ious_date}</td>
                            <td className="py-2 px-2 font-mono">{iou.ious_id}</td>
                            <td className="py-2 px-2">{iou.items[0]?.client || "-"}</td>
                            <td className="py-2 px-2 text-right">¥{iou.total_amount.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right text-red-600">¥{iou.rest.toLocaleString()}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-muted/20">
                              <td colSpan={7} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* 欠条明细（子欠条） */}
                                  <div>
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      欠条明细
                                      {isTarget ? (
                                        <span className="text-xs text-muted-foreground">点击子欠条填入备注</span>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">先在左侧选中此欠条为付款目标才能勾选</span>
                                      )}
                                    </h4>
                                    <div className="space-y-1 text-sm">
                                      {iou.items.map((item, idx) => {
                                        const checked = isTarget && selectedItemIdxs.has(idx);
                                        return (
                                          <div
                                            key={idx}
                                            onClick={() => isTarget && toggleItem(idx)}
                                            className={`rounded px-2 py-1 ${
                                              isTarget ? "cursor-pointer hover:bg-muted" : "opacity-70"
                                            } ${checked ? "bg-green-100" : ""}`}
                                          >
                                            <div className="flex justify-between items-center gap-2">
                                              <span className="flex items-center gap-2">
                                                {isTarget && (
                                                  <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    readOnly
                                                    className="h-3.5 w-3.5 pointer-events-none"
                                                  />
                                                )}
                                                {item.client} | {item.flight || "-"} | {item.ticket_number || "-"}
                                              </span>
                                              <span>¥{item.amount.toLocaleString()}</span>
                                            </div>
                                            {item.remark && (
                                              <div className="text-muted-foreground text-xs pl-2">└ {item.remark}</div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* 付款记录 */}
                                  <div>
                                    <h4 className="font-medium mb-2">付款记录 ({iou.payments?.length || 0})</h4>
                                    {!iou.payments || iou.payments.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">暂无付款</p>
                                    ) : (
                                      <div className="space-y-1 text-sm">
                                        {iou.payments.map((payment, idx) => (
                                          <div key={idx}>
                                            <div className="flex justify-between">
                                              <span>{payment.payment_date} | {payment.payer_name}</span>
                                              <span className="text-green-600">¥{payment.amount.toLocaleString()}</span>
                                            </div>
                                            {payment.remark && (
                                              <div className="text-muted-foreground text-xs pl-2">└ {payment.remark}</div>
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

        {/* Recent Payments */}
        {createdPayments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>最近付款记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {createdPayments.map((p) => {
                  const isExpanded = expandedPayments.has(p.id);
                  return (
                    <div key={p.id} className="rounded border border-green-200 bg-green-50/60">
                      <div className="flex items-center gap-2 text-sm p-2">
                        <button
                          onClick={() => toggleExpandPayment(p.id)}
                          className="p-1 hover:bg-muted rounded"
                          title={isExpanded ? "收起明细" : "展开明细"}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <span className="font-mono flex-1">{p.ious_id}</span>
                        <span className="text-green-600">¥{p.amount.toLocaleString()}</span>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-green-200 px-3 py-3 bg-white">
                          <IOUDetailPanel iouDbId={p.iou_db_id} cache={iouCache} errors={iouErrors} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
