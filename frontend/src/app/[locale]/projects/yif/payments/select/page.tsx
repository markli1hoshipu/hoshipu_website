"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckSquare, Search, Upload, FileText, CheckCircle, AlertCircle, Square, CheckSquare2, ArrowRight, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown, Settings2, Plus, X, ListOrdered, GripVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useYIFAuth } from "@/hooks/useYIFAuth";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  status: number;
  user_code: string;
  created_at: string;
  items: IOUItem[];
  payments?: Payment[];
}

interface AllocationPreview {
  iou_id: string;
  db_id: number;
  rest_before: number;
  payment: number;
  rest_after: number;
  is_negative: boolean;
}

// 待清理队列中的欠条（支持排序和手动分配金额）
interface PendingIOU extends IOU {
  manualAmount?: number;  // 手动指定的分配金额（可选）
  order: number;          // 排序顺序
}

// 排序类型
type SortField = 'ious_date' | 'ious_id' | 'rest' | 'total_amount' | 'created_at' | 'status';
type SortOrder = 'asc' | 'desc';

// 可选列定义
const OPTIONAL_COLUMNS = [
  { key: 'status', label: '状态' },
  { key: 'total_amount', label: '总金额' },
  { key: 'user_code', label: '录入人' },
  { key: 'created_at', label: '创建时间' },
] as const;

// 状态标签映射
const getStatusLabel = (status: number) => {
  const labels: Record<number, string> = {
    0: '未付款',
    1: '部分付款',
    2: '已付清',
    3: '负数',
    4: '多付',
  };
  return labels[status] || '未知';
};

// 时间格式化
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
};

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

  // 排序状态
  const [sortField, setSortField] = useState<SortField>('ious_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 可选列显示状态
  const [visibleOptionalColumns, setVisibleOptionalColumns] = useState<Set<string>>(new Set());

  // 待清理欠条队列
  const [pendingQueue, setPendingQueue] = useState<PendingIOU[]>([]);

  // 拖拽排序传感器 - 必须在早期 return 之前
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 排序切换函数
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 排序后的数据
  const sortedIOUs = useMemo(() => {
    return [...searchResults].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'ious_date':
          comparison = a.ious_date.localeCompare(b.ious_date);
          break;
        case 'ious_id':
          comparison = a.ious_id.localeCompare(b.ious_id);
          break;
        case 'rest':
          comparison = a.rest - b.rest;
          break;
        case 'total_amount':
          comparison = a.total_amount - b.total_amount;
          break;
        case 'created_at':
          comparison = (a.created_at || '').localeCompare(b.created_at || '');
          break;
        case 'status':
          comparison = a.status - b.status;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [searchResults, sortField, sortOrder]);

  // Selected IOUs from search results (for adding to pending queue)
  const selectedIOUs = useMemo(() => {
    return sortedIOUs.filter((iou) => selectedIds.has(iou.id));
  }, [sortedIOUs, selectedIds]);

  // Calculate allocation preview based on pendingQueue
  const allocationPreview = useMemo((): AllocationPreview[] => {
    const amount = parseFloat(paymentData.amount) || 0;
    if (amount <= 0 || pendingQueue.length === 0) return [];

    let remaining = amount;
    const preview: AllocationPreview[] = [];

    // 负数欠条优先处理
    const negativeIOUs = pendingQueue.filter((iou) => iou.rest < 0);
    const positiveIOUs = pendingQueue.filter((iou) => iou.rest > 0);

    // 处理负数欠条
    for (const iou of negativeIOUs) {
      const payment = iou.rest; // 负数
      preview.push({
        iou_id: iou.ious_id,
        db_id: iou.id,
        rest_before: iou.rest,
        payment,
        rest_after: 0,
        is_negative: true,
      });
      remaining -= payment; // 减去负数 = 加上绝对值
    }

    // 按队列顺序处理正数欠条
    for (const iou of positiveIOUs) {
      if (remaining <= 0) {
        preview.push({
          iou_id: iou.ious_id,
          db_id: iou.id,
          rest_before: iou.rest,
          payment: 0,
          rest_after: iou.rest,
          is_negative: false,
        });
        continue;
      }

      let payment: number;
      if (iou.manualAmount !== undefined && iou.manualAmount > 0) {
        // 手动指定金额
        payment = Math.min(iou.manualAmount, remaining, iou.rest);
      } else {
        // 自动分配
        payment = Math.min(iou.rest, remaining);
      }

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
  }, [paymentData.amount, pendingQueue]);

  // Calculate totals based on pendingQueue
  const pendingTotal = useMemo(() => pendingQueue.reduce((sum, iou) => sum + iou.rest, 0), [pendingQueue]);
  const negativeTotal = useMemo(() => pendingQueue.filter((iou) => iou.rest < 0).reduce((sum, iou) => sum + Math.abs(iou.rest), 0), [pendingQueue]);
  const positiveTotal = useMemo(() => pendingQueue.filter((iou) => iou.rest > 0).reduce((sum, iou) => sum + iou.rest, 0), [pendingQueue]);
  const paymentAmount = parseFloat(paymentData.amount) || 0;
  const isPaymentValid = paymentAmount > 0 && paymentAmount <= pendingTotal;

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
    if (selectedIds.size === sortedIOUs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedIOUs.map((iou) => iou.id)));
    }
  };

  // 待清理队列操作函数
  const addToPending = (iou: IOU) => {
    if (pendingQueue.some(p => p.id === iou.id)) return;
    setPendingQueue(prev => [
      ...prev,
      { ...iou, order: prev.length, manualAmount: undefined }
    ]);
  };

  const removeFromPending = (id: number) => {
    setPendingQueue(prev => prev.filter(p => p.id !== id).map((item, i) => ({ ...item, order: i })));
  };

  const addSelectedToPending = () => {
    const selected = sortedIOUs.filter(iou => selectedIds.has(iou.id));
    const newItems = selected.filter(iou => !pendingQueue.some(p => p.id === iou.id));
    setPendingQueue(prev => [
      ...prev,
      ...newItems.map((iou, idx) => ({ ...iou, order: prev.length + idx, manualAmount: undefined }))
    ]);
    setSelectedIds(new Set());
  };

  const clearPendingQueue = () => {
    setPendingQueue([]);
  };

  // 拖拽结束处理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPendingQueue((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex).map((item, i) => ({ ...item, order: i }));
      });
    }
  };

  const updateManualAmount = (id: number, value: string) => {
    const amount = value === '' ? undefined : parseFloat(value);
    setPendingQueue(prev =>
      prev.map(iou => iou.id === id ? { ...iou, manualAmount: amount } : iou)
    );
  };

  const getPreviewAllocation = (id: number): number => {
    const preview = allocationPreview.find(p => p.db_id === id);
    return preview?.payment ?? 0;
  };

  const isInPendingQueue = (id: number): boolean => {
    return pendingQueue.some(p => p.id === id);
  };

  // 可拖拽的待清理欠条项组件
  const SortablePendingItem = ({ iou, index }: { iou: PendingIOU; index: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: iou.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 1000 : 'auto',
    };

    const allocation = getPreviewAllocation(iou.id);
    const isNegative = iou.rest < 0;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-3 rounded-lg border ${
          isNegative ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
        } ${isDragging ? "shadow-lg" : ""}`}
      >
        {/* 拖拽手柄 */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* 序号 */}
        <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>

        {/* 欠条信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm">{iou.ious_id}</span>
            <span className="text-sm text-muted-foreground">{iou.items[0]?.client || '-'}</span>
            <span className={`text-sm font-medium ${isNegative ? "text-blue-600" : "text-red-600"}`}>
              ¥{iou.rest.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 手动分配金额 */}
        {!isNegative && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              placeholder="自动"
              className="w-20 h-8 text-sm"
              value={iou.manualAmount ?? ''}
              onChange={(e) => updateManualAmount(iou.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* 预览分配 */}
        <div className={`w-24 text-right text-sm font-medium ${
          allocation > 0 ? (isNegative ? "text-blue-600" : "text-green-600") : "text-muted-foreground"
        }`}>
          {allocation !== 0 ? (
            <>→ ¥{Math.abs(allocation).toLocaleString()}</>
          ) : (
            <span className="text-xs">等待分配</span>
          )}
        </div>

        {/* 移除按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => removeFromPending(iou.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // 可排序表头组件
  const SortableHeader = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`py-3 px-2 cursor-pointer hover:bg-muted/50 select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </th>
  );

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
    if (pendingQueue.length === 0) {
      setMessage({ type: "error", text: "请添加欠条到待清理列表" });
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
      // Get IOU IDs in order (negative first, then positive by queue order)
      const iouDbIds = [
        ...pendingQueue.filter((iou) => iou.rest < 0).map((iou) => iou.id),
        ...pendingQueue.filter((iou) => iou.rest > 0).map((iou) => iou.id),
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
        // Clear form and pending queue
        setPaymentData((prev) => ({
          ...prev,
          amount: "",
          remark: "",
        }));
        setPendingQueue([]);
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

        {/* Pending Queue - 待清理欠条 */}
        <Card className={pendingQueue.length > 0 ? "border-orange-200 bg-orange-50/30" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5" />
                待清理欠条 ({pendingQueue.length})
              </CardTitle>
              <CardDescription>调整顺序控制分配优先级，输入金额手动分配</CardDescription>
            </div>
            {pendingQueue.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearPendingQueue}>
                <X className="h-4 w-4 mr-1" />
                全部清空
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {pendingQueue.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <ListOrdered className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>从下方搜索结果中选择欠条添加到这里</p>
              </div>
            ) : (
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={pendingQueue.map(iou => iou.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {pendingQueue.map((iou, index) => (
                        <SortablePendingItem key={iou.id} iou={iou} index={index} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* 汇总信息 */}
                <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                  <div className="space-y-1">
                    <p>合计: <span className={`font-bold ${pendingTotal < 0 ? "text-blue-600" : "text-red-600"}`}>
                      ¥{pendingTotal.toLocaleString()}
                    </span></p>
                    {negativeTotal > 0 && (
                      <p className="text-xs text-muted-foreground">
                        负数: -¥{negativeTotal.toLocaleString()} | 正数: ¥{positiveTotal.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isPaymentValid || pendingQueue.length === 0}
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
              </>
            )}
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

        {/* Selection Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>选择欠条</CardTitle>
              <CardDescription>勾选要包含在付款中的欠条，点击展开按钮查看明细</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* 添加选中到待清理 */}
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={addSelectedToPending}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  添加 {selectedIds.size} 条到待清理
                </Button>
              )}

              {/* 列选择下拉菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings2 className="h-4 w-4 mr-2" />
                    显示列
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {OPTIONAL_COLUMNS.map(col => (
                    <DropdownMenuCheckboxItem
                      key={col.key}
                      checked={visibleOptionalColumns.has(col.key)}
                      onCheckedChange={(checked) => {
                        const next = new Set(visibleOptionalColumns);
                        checked ? next.add(col.key) : next.delete(col.key);
                        setVisibleOptionalColumns(next);
                      }}
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="gap-2"
                disabled={sortedIOUs.length === 0}
              >
                {selectedIds.size === sortedIOUs.length && sortedIOUs.length > 0 ? (
                  <CheckSquare2 className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                全选
              </Button>
            </div>
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
                      <SortableHeader field="ious_date" label="日期" className="text-left" />
                      <SortableHeader field="ious_id" label="欠条ID" className="text-left" />
                      <th className="text-left py-3 px-2">客户</th>
                      {visibleOptionalColumns.has('status') && <SortableHeader field="status" label="状态" className="text-left" />}
                      {visibleOptionalColumns.has('total_amount') && <SortableHeader field="total_amount" label="总金额" className="text-right" />}
                      {visibleOptionalColumns.has('user_code') && <th className="text-left py-3 px-2">录入人</th>}
                      {visibleOptionalColumns.has('created_at') && <SortableHeader field="created_at" label="创建时间" className="text-left" />}
                      <SortableHeader field="rest" label="剩余金额" className="text-right" />
                      <th className="text-center py-3 px-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedIOUs.map((iou) => {
                      const isSelected = selectedIds.has(iou.id);
                      const isExpanded = expandedRows.has(iou.id);
                      const isNegative = iou.rest < 0;
                      const optionalColCount = visibleOptionalColumns.size;
                      const inQueue = isInPendingQueue(iou.id);

                      return (
                        <React.Fragment key={iou.id}>
                          <tr
                            className={`border-b hover:bg-muted/30 cursor-pointer ${
                              inQueue
                                ? "bg-orange-50 opacity-60"
                                : isSelected
                                ? (isNegative ? "bg-blue-50" : "bg-green-50")
                                : ""
                            }`}
                            onClick={() => !inQueue && toggleSelect(iou.id)}
                          >
                            <td className="py-2 px-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={inQueue}
                                onChange={() => toggleSelect(iou.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 disabled:opacity-30"
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
                            {visibleOptionalColumns.has('status') && (
                              <td className="py-2 px-2">{getStatusLabel(iou.status)}</td>
                            )}
                            {visibleOptionalColumns.has('total_amount') && (
                              <td className="py-2 px-2 text-right">¥{iou.total_amount.toLocaleString()}</td>
                            )}
                            {visibleOptionalColumns.has('user_code') && (
                              <td className="py-2 px-2">{iou.user_code || '-'}</td>
                            )}
                            {visibleOptionalColumns.has('created_at') && (
                              <td className="py-2 px-2">{formatDateTime(iou.created_at)}</td>
                            )}
                            <td className={`py-2 px-2 text-right ${isNegative ? "text-blue-600" : "text-red-600"}`}>
                              ¥{iou.rest.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {inQueue ? (
                                <span className="inline-flex items-center gap-1 text-orange-600 text-xs">
                                  <CheckCircle className="h-3 w-3" />
                                  已添加
                                </span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToPending(iou);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  添加
                                </Button>
                              )}
                            </td>
                          </tr>
                          {/* Expanded row showing IOU details */}
                          {isExpanded && (
                            <tr className="bg-muted/20">
                              <td colSpan={7 + optionalColCount} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* 欠条明细 - 左列 */}
                                  <div>
                                    <h4 className="font-medium mb-2">欠条明细</h4>
                                    <div className="space-y-1 text-sm">
                                      {iou.items.map((item, idx) => (
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

                                  {/* 付款记录 - 右列 */}
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
