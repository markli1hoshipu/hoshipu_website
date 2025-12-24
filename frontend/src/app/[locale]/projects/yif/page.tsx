"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, CheckCircle, TrendingDown, CreditCard, List } from "lucide-react";
import { useYIFAuth } from "@/hooks/useYIFAuth";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

interface DashboardStats {
  summary: {
    total_ious: number;
    item_count: number;
    payment_count: number;
    total_amount: number;
    total_paid: number;
    total_unpaid: number;
    unpaid_count: number;
    paid_count: number;
    negative_count: number;
    monthly_payments: number;
  };
  two_month_trend: Array<{ date: string; amount: number }>;
  weekly_counts: Array<{ date: string; ious: number; payments: number }>;
  weekly_amounts: Array<{ date: string; ious: number; payments: number }>;
}

export default function YIFDashboard() {
  const { user, loading: authLoading, getToken } = useYIFAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/yif/stats/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setStats(data);
      } else {
        setError(data.detail || "获取统计数据失败");
      }
    } catch (err) {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">验证登录状态...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">YIF 付款管理系统</h1>
          <p className="text-muted-foreground">欢迎回来，{user.username}！</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Summary Cards - Row 1: Counts */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    欠条数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{(stats.summary.total_ious ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-orange-600">未清 {stats.summary.unpaid_count ?? 0}</span>
                    {" / "}
                    <span className="text-green-600">已清 {stats.summary.paid_count ?? 0}</span>
                    {(stats.summary.negative_count ?? 0) > 0 && (
                      <span className="text-purple-600"> / 负数 {stats.summary.negative_count}</span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <List className="h-4 w-4" />
                    明细数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{(stats.summary.item_count ?? 0).toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    付款数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{(stats.summary.payment_count ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    本月 <span className="text-blue-600">¥{(stats.summary.monthly_payments ?? 0).toLocaleString()}</span>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Summary Cards - Row 2: Amounts */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    总金额
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    ¥{(stats.summary.total_amount ?? 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    已付金额
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    ¥{(stats.summary.total_paid ?? 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    未付金额
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    ¥{(stats.summary.total_unpaid ?? 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 2-Month Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>未清欠条总额趋势（近两个月）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height={300} minWidth={300}>
                    <LineChart data={stats.two_month_trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value) => [`¥${(value as number)?.toLocaleString() ?? 0}`, "未清总额"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Count Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>每日新增数量（近一周）</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height={250} minWidth={200}>
                      <BarChart data={stats.weekly_counts}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ious" name="新增欠条" fill="#f97316" />
                        <Bar dataKey="payments" name="新增付款" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Amount Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>每日新增金额（近一周）</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height={250} minWidth={200}>
                      <BarChart data={stats.weekly_amounts}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value) => `¥${(value as number)?.toLocaleString() ?? 0}`}
                        />
                        <Legend />
                        <Bar dataKey="ious" name="欠条金额" fill="#f97316" />
                        <Bar dataKey="payments" name="付款金额" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
