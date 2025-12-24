"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useYIFAuth } from "@/hooks/useYIFAuth";

interface Summary {
  total_ious: number;
  total_amount: number;
  total_paid: number;
  total_rest: number;
  upload_time: string;
}

interface Business {
  date: string;
  ious_id: string;
  user: string;
  client: string;
  total_money: number;
  paid: number;
  rest: number;
  status: string;
  payments_count: number;
}

interface PaymentDetail {
  date: string;
  client: string;
  amount: number;
  remark: string;
}

interface PaymentDetailsResponse {
  success: boolean;
  ious_id: string;
  payments: PaymentDetail[];
  total_payments: number;
  total_paid: number;
}

export default function YIFDataAnalysis() {
  const router = useRouter();
  const locale = useLocale();
  const { user, loading: authLoading, getToken } = useYIFAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);

  // Check admin access
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      router.push(`/${locale}/projects/yif`);
    }
  }, [authLoading, user, router, locale]);

  // 筛选和排序状态
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<Record<string, PaymentDetail[]>>({});
  const [loadingPayments, setLoadingPayments] = useState<Record<string, boolean>>({});

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6101';

  // Helper function to get Authorization header
  const getAuthHeaders = () => {
    const token = getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  useEffect(() => {
    if (authLoading || !user) return;

    // 检查是否曾经上传过数据
    const hasUploaded = localStorage.getItem('yif_data_uploaded');
    if (hasUploaded === 'true') {
      fetchSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, getToken]);

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/yif/data/summary`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        if (data.summary) {
          fetchBusinesses();
        }
      } else if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('yif_access_token');
        localStorage.removeItem('yif_user');
        router.push(`/${locale}/projects/yif/login`);
      }
    } catch (err) {
      console.log("No data uploaded yet");
    }
  };

  const fetchBusinesses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/yif/data/businesses?limit=500`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data.businesses);
        setFilteredBusinesses(data.businesses);
      } else if (response.status === 401) {
        localStorage.removeItem('yif_access_token');
        localStorage.removeItem('yif_user');
        router.push(`/${locale}/projects/yif/login`);
      }
    } catch (err) {
      console.error("Failed to fetch businesses:", err);
    }
  };

  const fetchPaymentDetails = async (iousId: string) => {
    // 如果已经加载过，直接返回
    if (paymentDetails[iousId]) {
      return;
    }

    setLoadingPayments(prev => ({ ...prev, [iousId]: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/yif/data/payments/${iousId}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data: PaymentDetailsResponse = await response.json();
        setPaymentDetails(prev => ({ ...prev, [iousId]: data.payments }));
      } else if (response.status === 401) {
        localStorage.removeItem('yif_access_token');
        localStorage.removeItem('yif_user');
        router.push(`/${locale}/projects/yif/login`);
      }
    } catch (err) {
      console.error("Failed to fetch payment details:", err);
    } finally {
      setLoadingPayments(prev => ({ ...prev, [iousId]: false }));
    }
  };

  // 应用筛选和排序
  useEffect(() => {
    let filtered = [...businesses];

    // 按状态筛选
    if (filterStatus !== 'all') {
      filtered = filtered.filter(b => b.status === filterStatus);
    }

    // 按客户名筛选
    if (filterClient.trim()) {
      filtered = filtered.filter(b =>
        b.client.toLowerCase().includes(filterClient.toLowerCase())
      );
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return b.date.localeCompare(a.date);
        case 'date_asc':
          return a.date.localeCompare(b.date);
        case 'amount_desc':
          return b.total_money - a.total_money;
        case 'amount_asc':
          return a.total_money - b.total_money;
        case 'rest_desc':
          return b.rest - a.rest;
        case 'rest_asc':
          return a.rest - b.rest;
        default:
          return 0;
      }
    });

    setFilteredBusinesses(filtered);
  }, [businesses, filterStatus, filterClient, sortBy]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/yif/data/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        alert(`成功解析 ${data.summary.total_ious} 条欠条记录`);
        setSummary(data.summary);
        localStorage.setItem('yif_data_uploaded', 'true');
        fetchBusinesses();
      } else if (response.status === 401) {
        localStorage.removeItem('yif_access_token');
        localStorage.removeItem('yif_user');
        router.push(`/${locale}/projects/yif/login`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已付清': return 'bg-green-100 text-green-800';
      case '未付清': return 'bg-yellow-100 text-yellow-800';
      case '未付款': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
    return null; // Hook 会自动跳转到登录页
  }

  if (user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">无权访问此页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">外部数据查询</h1>
          {summary && (
            <p className="text-sm text-muted-foreground">
              最后上传: {new Date(summary.upload_time).toLocaleString('zh-CN')}
            </p>
          )}
        </div>

        {/* File Upload */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3 items-center">
              <Input
                type="file"
                accept=".txt,.pkl,.pickle"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Button onClick={handleUpload} disabled={!file || uploading} size="lg">
                {uploading ? '上传中...' : '上传分析'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">欠条总数</div>
                <div className="text-3xl font-bold">{summary.total_ious}</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">总金额</div>
                <div className="text-3xl font-bold">¥{summary.total_amount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">已付</div>
                <div className="text-3xl font-bold text-green-700">¥{summary.total_paid.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">未付</div>
                <div className="text-3xl font-bold text-red-700">¥{summary.total_rest.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Sorting */}
        {businesses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                筛选和排序
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">状态筛选</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="已付清">已付清</SelectItem>
                      <SelectItem value="未付清">未付清</SelectItem>
                      <SelectItem value="未付款">未付款</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">客户搜索</label>
                  <Input
                    placeholder="输入客户名称..."
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">排序方式</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_desc">日期（新→旧）</SelectItem>
                      <SelectItem value="date_asc">日期（旧→新）</SelectItem>
                      <SelectItem value="amount_desc">金额（高→低）</SelectItem>
                      <SelectItem value="amount_asc">金额（低→高）</SelectItem>
                      <SelectItem value="rest_desc">未付（高→低）</SelectItem>
                      <SelectItem value="rest_asc">未付（低→高）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                显示 {filteredBusinesses.length} / {businesses.length} 条记录
              </div>
            </CardContent>
          </Card>
        )}

        {/* Business List */}
        {filteredBusinesses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">业务记录详情</CardTitle>
              <CardDescription>点击行查看付款明细</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-3 px-2 w-8"></th>
                      <th className="text-left py-3 px-2">日期</th>
                      <th className="text-left py-3 px-2">欠条ID</th>
                      <th className="text-left py-3 px-2">客户</th>
                      <th className="text-left py-3 px-2">操作人</th>
                      <th className="text-right py-3 px-2">总额</th>
                      <th className="text-right py-3 px-2">已付</th>
                      <th className="text-right py-3 px-2">未付</th>
                      <th className="text-center py-3 px-2">付款次数</th>
                      <th className="text-center py-3 px-2">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBusinesses.map((biz, index) => (
                      <React.Fragment key={biz.ious_id}>
                        <tr
                          className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => {
                            if (expandedRow === index) {
                              setExpandedRow(null);
                            } else {
                              setExpandedRow(index);
                              fetchPaymentDetails(biz.ious_id);
                            }
                          }}
                        >
                          <td className="py-2 px-2">
                            {expandedRow === index ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </td>
                          <td className="py-2 px-2 font-mono text-xs">{biz.date}</td>
                          <td className="py-2 px-2 font-mono text-xs">{biz.ious_id}</td>
                          <td className="py-2 px-2 font-medium">{biz.client}</td>
                          <td className="py-2 px-2 text-muted-foreground">{biz.user}</td>
                          <td className="py-2 px-2 text-right font-semibold">¥{biz.total_money.toLocaleString()}</td>
                          <td className="py-2 px-2 text-right text-green-700">¥{biz.paid.toLocaleString()}</td>
                          <td className="py-2 px-2 text-right text-red-700">¥{biz.rest.toLocaleString()}</td>
                          <td className="py-2 px-2 text-center">
                            <Badge variant="secondary" className="text-xs">{biz.payments_count}</Badge>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Badge variant="outline" className={getStatusColor(biz.status)}>
                              {biz.status}
                            </Badge>
                          </td>
                        </tr>
                        {expandedRow === index && (
                          <tr className="bg-muted/20">
                            <td colSpan={10} className="py-3 px-6">
                              <div className="text-sm">
                                <div className="font-semibold mb-3">付款明细：</div>
                                {loadingPayments[biz.ious_id] ? (
                                  <div className="text-muted-foreground">加载中...</div>
                                ) : paymentDetails[biz.ious_id] && paymentDetails[biz.ious_id].length > 0 ? (
                                  <div className="space-y-2">
                                    <table className="w-full text-xs border rounded-md">
                                      <thead className="bg-muted/50">
                                        <tr>
                                          <th className="text-left py-2 px-3 font-medium">日期</th>
                                          <th className="text-left py-2 px-3 font-medium">客户</th>
                                          <th className="text-right py-2 px-3 font-medium">金额</th>
                                          <th className="text-left py-2 px-3 font-medium">备注</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {paymentDetails[biz.ious_id].map((payment, idx) => (
                                          <tr key={idx} className="border-t">
                                            <td className="py-2 px-3 font-mono">{payment.date}</td>
                                            <td className="py-2 px-3">{payment.client}</td>
                                            <td className="py-2 px-3 text-right font-semibold text-green-700">
                                              ¥{payment.amount.toLocaleString()}
                                            </td>
                                            <td className="py-2 px-3 text-muted-foreground">{payment.remark || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <div className="text-xs text-muted-foreground pt-1">
                                      共 {paymentDetails[biz.ious_id].length} 次付款
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground">暂无付款记录</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {!summary && !businesses.length && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>请上传 business_data.txt 文件开始分析</p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
