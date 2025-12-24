"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, FileText, ChevronDown, ChevronUp, UserSearch, AlertTriangle, Users } from "lucide-react";
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
  worker_id: number;
  ious_date: string;
  total_amount: number;
  status: number;
  paid: number;
  rest: number;
  items: IOUItem[];
  payments: Payment[];
}

interface TeamUser {
  id: number;
  username: string;
  user_code: string;
  display_name: string;
}

export default function TeamDataQueryPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user, loading: authLoading, getToken } = useYIFAuth();

  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("all");

  const [searchParams, setSearchParams] = useState({
    startDate: "",
    endDate: "",
    customer: "",
    ticketNumber: "",
    remainingAmount: "",
    amountMargin: "100",
    status: "all",
    iouId: "",
  });
  const [results, setResults] = useState<IOU[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [total, setTotal] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Summary stats
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalPaid: 0,
    totalRest: 0,
    iouCount: 0,
  });

  const getAuthHeaders = () => {
    const token = getToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // Check access
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'admin' && user.role !== 'manager') {
        router.push(`/${locale}/projects/yif`);
      }
    }
  }, [authLoading, user, router, locale]);

  // Fetch team users
  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role !== 'admin' && user.role !== 'manager') return;

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/yif/team/users`, {
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          const data = await response.json();
          setTeamUsers(data.users.filter((u: TeamUser & { is_active: boolean }) => u.is_active));
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleSearch = useCallback(async () => {
    if (!user) return;
    setIsSearching(true);
    try {
      const token = getToken();
      const params = new URLSearchParams();

      // Always send target_worker_id - "all" means show all team members' data
      params.append("target_worker_id", selectedWorkerId);

      if (searchParams.startDate) params.append("start_date", searchParams.startDate);
      if (searchParams.endDate) params.append("end_date", searchParams.endDate);
      if (searchParams.customer) params.append("client", searchParams.customer);
      if (searchParams.ticketNumber) params.append("ticket_number", searchParams.ticketNumber);
      if (searchParams.remainingAmount) {
        params.append("remaining_amount", searchParams.remainingAmount);
        params.append("amount_margin", searchParams.amountMargin || "100");
      }
      if (searchParams.status && searchParams.status !== "all") {
        params.append("status", searchParams.status);
      }
      if (searchParams.iouId) params.append("ious_id", searchParams.iouId);
      params.append("limit", "500");

      const response = await fetch(`${API_BASE_URL}/api/yif/ious?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.ious);
        setTotal(data.total);

        // Calculate summary
        const ious = data.ious as IOU[];
        const totalAmount = ious.reduce((sum, iou) => sum + iou.total_amount, 0);
        const totalPaid = ious.reduce((sum, iou) => sum + iou.paid, 0);
        const totalRest = ious.reduce((sum, iou) => sum + iou.rest, 0);
        setSummary({
          totalAmount,
          totalPaid,
          totalRest,
          iouCount: ious.length,
        });
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  }, [searchParams, selectedWorkerId, getToken, user]);

  if (authLoading || loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-muted-foreground">无权访问此页面</p>
        </div>
      </div>
    );
  }

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

      // Always send target_worker_id - "all" means export all team members' data
      params.append("target_worker_id", selectedWorkerId);
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
        a.download = `team_ious_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  const getWorkerDisplayName = (workerId: number) => {
    const teamUser = teamUsers.find(u => u.id === workerId);
    return teamUser ? teamUser.display_name : `Worker #${workerId}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <UserSearch className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">团队数据查询</h1>
            <p className="text-muted-foreground mt-1">查看团队成员的欠条记录</p>
          </div>
        </div>

        {/* Summary Cards */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">欠条数</div>
                <div className="text-2xl font-bold">{summary.iouCount}</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">总金额</div>
                <div className="text-2xl font-bold">¥{summary.totalAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">已付</div>
                <div className="text-2xl font-bold text-green-700">¥{summary.totalPaid.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">未付</div>
                <div className="text-2xl font-bold text-red-700">¥{summary.totalRest.toLocaleString()}</div>
              </CardContent>
            </Card>
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
            {/* Row 1: User & Date */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  团队成员
                </label>
                <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择成员" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部成员</SelectItem>
                    {teamUsers.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>

            {/* Row 2: Other filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">票号</label>
                <Input
                  placeholder="票号"
                  value={searchParams.ticketNumber}
                  onChange={(e) => handleSearchChange("ticketNumber", e.target.value)}
                />
              </div>
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
                    <SelectItem value="0,1">未付款 + 部分付款</SelectItem>
                  </SelectContent>
                </Select>
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

            <div className="flex gap-2 pt-2">
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
              <Select onValueChange={(value) => handleExport(value)} disabled={isExporting || results.length === 0}>
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
                      <th className="text-left py-3 px-2">操作人</th>
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
                            <td className="py-2 px-2">
                              <Badge variant="outline">{getWorkerDisplayName(iou.worker_id)}</Badge>
                            </td>
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
                              <td colSpan={8} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Items */}
                                  <div>
                                    <h4 className="font-medium mb-2">欠条明细</h4>
                                    <div className="space-y-1 text-sm">
                                      {iou.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                          <span>
                                            {item.client} | {item.flight || "-"} | {item.ticket_number || "-"}
                                          </span>
                                          <span>¥{item.amount.toLocaleString()}</span>
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
                                          <div key={idx} className="flex justify-between">
                                            <span>
                                              {p.payment_date} | {p.payer_name}
                                            </span>
                                            <span className="text-green-600">¥{p.amount.toLocaleString()}</span>
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
