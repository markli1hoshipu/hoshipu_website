"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, TrendingUp, DollarSign, Users } from "lucide-react";

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

export default function YIFDataAnalysis() {
  const router = useRouter();
  const locale = useLocale();
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stats, setStats] = useState<any>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6101';

  useEffect(() => {
    const userStr = sessionStorage.getItem('yif_user');
    if (!userStr) {
      router.push(`/${locale}/projects/yif/login`);
      return;
    }
    setUser(JSON.parse(userStr));

    // 检查是否已有上传的数据
    fetchSummary();
  }, [router, locale]);

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/yif/data/summary`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        fetchBusinesses();
        fetchStats();
      }
    } catch (err) {
      console.log("No data uploaded yet");
    }
  };

  const fetchBusinesses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/yif/data/businesses?limit=50`);
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data.businesses);
      }
    } catch (err) {
      console.error("Failed to fetch businesses:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/yif/data/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

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
      const response = await fetch(`${API_BASE_URL}/api/yif/data/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Success! Parsed ${data.summary.total_ious} ious records`);
        setSummary(data.summary);
        fetchBusinesses();
        fetchStats();
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

  if (!user) {
    return <div className="container mx-auto px-4 py-12">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold mb-8">Business Data Analysis</h1>

        {/* File Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Business Data
            </CardTitle>
            <CardDescription>Upload business_data.txt file for analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <Input
                type="file"
                accept=".txt,.pkl,.pickle"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? 'Uploading...' : 'Upload & Analyze'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Total IOUs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_ious}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">¥{summary.total_amount.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">¥{summary.total_paid.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Rest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">¥{summary.total_rest.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Business List */}
        {businesses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Business Records (Top 50)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">IOU ID</th>
                      <th className="text-left p-2">Client</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-right p-2">Paid</th>
                      <th className="text-right p-2">Rest</th>
                      <th className="text-center p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businesses.map((biz, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono text-xs">{biz.ious_id}</td>
                        <td className="p-2">{biz.client}</td>
                        <td className="p-2 text-right">¥{biz.total_money.toFixed(2)}</td>
                        <td className="p-2 text-right text-green-600">¥{biz.paid.toFixed(2)}</td>
                        <td className="p-2 text-right text-red-600">¥{biz.rest.toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <Badge className={getStatusColor(biz.status)}>{biz.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
