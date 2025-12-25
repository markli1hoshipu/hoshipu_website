"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Plus, CheckCircle, AlertCircle } from "lucide-react";
import { useYIFAuth } from "@/hooks/useYIFAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

interface CreatedIOU {
  id: number;
  ious_id: string;
  total_amount: number;
  items_count: number;
}

export default function IOUEntryPage() {
  const { user, loading: authLoading, getToken } = useYIFAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    userName: "",
    date: "",
    customer: "",
    amount: "",
    flightRoute: "",
    ticketNumber: "",
    remark: "",
  });
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [createdIOUs, setCreatedIOUs] = useState<CreatedIOU[]>([]);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setExcelFile(file);
  };

  const validateForm = (): string | null => {
    if (!formData.userName || !formData.userName.match(/^[A-Za-z]{2,3}$/)) {
      return "请输入有效的用户名（2-3个字母）";
    }
    if (!formData.date || !formData.date.match(/^\d{6}$/)) {
      return "请输入有效的日期（YYMMDD格式）";
    }
    if (!formData.customer.trim()) {
      return "请输入客户名称";
    }
    if (!formData.amount || isNaN(parseFloat(formData.amount))) {
      return "请输入有效的金额";
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/yif/ious`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_code: formData.userName.toUpperCase(),
          ious_date: formData.date,
          items: [
            {
              client: formData.customer,
              amount: parseFloat(formData.amount),
              flight: formData.flightRoute || "",
              ticket_number: formData.ticketNumber || "",
              remark: formData.remark || "",
            },
          ],
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: "success", text: `欠条 ${data.iou.ious_id} 创建成功` });
        setCreatedIOUs((prev) => [data.iou, ...prev]);
        // Clear form except userName and date
        setFormData((prev) => ({
          ...prev,
          customer: "",
          amount: "",
          flightRoute: "",
          ticketNumber: "",
          remark: "",
        }));
      } else {
        setMessage({ type: "error", text: data.detail || "创建欠条失败" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcelImport = async () => {
    if (!excelFile) {
      setMessage({ type: "error", text: "请选择Excel文件" });
      return;
    }
    if (!sheetName.trim()) {
      setMessage({ type: "error", text: "请输入工作表名称" });
      return;
    }
    if (!formData.userName || !formData.userName.match(/^[A-Za-z]{2,3}$/)) {
      setMessage({ type: "error", text: "请输入有效的用户名（2-3个字母）" });
      return;
    }

    setIsImporting(true);
    setMessage(null);

    try {
      const token = getToken();
      const formDataObj = new FormData();
      formDataObj.append("file", excelFile);

      const params = new URLSearchParams({
        sheet_name: sheetName.trim(),
        user_code: formData.userName.toUpperCase(),
      });

      const response = await fetch(`${API_BASE_URL}/api/yif/ious/import-excel?${params.toString()}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataObj,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: "success",
          text: `${data.message} (Type: ${data.sheet_type}, Date: ${data.date})`,
        });
        if (data.ious) {
          setCreatedIOUs((prev) => [...data.ious, ...prev]);
        }
        // Only clear sheet name, keep Excel file for continuous import
        setSheetName("");
      } else {
        setMessage({ type: "error", text: data.detail || "导入失败" });
      }
    } catch (err) {
      console.error("Import error:", err);
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold">欠条录入</h1>
          <p className="text-muted-foreground mt-1">从Excel导入或手动输入欠条信息</p>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`p-4 rounded-lg flex items-center gap-2 ${
              message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Excel Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Excel文件导入（BSP格式）
            </CardTitle>
            <CardDescription>
              从BSP Excel文件导入。支持：国内BSP (D)、国际BSP (I)、南航 (C)、东航 (M)、外航 (W)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">用户名（2-3个字母）*</label>
                <Input
                  placeholder="如: HSP"
                  value={formData.userName}
                  onChange={(e) => handleInputChange("userName", e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">工作表名称 *</label>
                <Input
                  placeholder="输入精确的工作表名称"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">选择Excel文件 (.xls, .xlsx)</label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
              {excelFile && (
                <p className="text-sm text-muted-foreground">已选择: {excelFile.name}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExcelImport}
                disabled={isImporting || !excelFile || !sheetName.trim() || !formData.userName}
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    导入中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    导入Excel文件
                  </>
                )}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              <p>Excel格式要求:</p>
              <ul className="list-disc list-inside ml-2">
                <li>第1行: 标题 (国内BSP/国际BSP/南航/东航/外航)</li>
                <li>第2行B列: 票数</li>
                <li>第5行A列: 日期 (YYMMDD)</li>
                <li>第5行起数据: 航班(B), 票号(C), 金额(D), 客户(P), 欠条号(Q), 备注(R)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              手动录入欠条
            </CardTitle>
            <CardDescription>逐条输入欠条信息（类型：H 手工录入）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">日期 (YYMMDD) *</label>
                <Input
                  placeholder="如: 241220"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">客户名称 *</label>
                <Input
                  placeholder="输入客户名称"
                  value={formData.customer}
                  onChange={(e) => handleInputChange("customer", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">金额 *</label>
                <Input
                  type="number"
                  placeholder="输入金额"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">航班</label>
                <Input
                  placeholder="如: SHA-PEK"
                  value={formData.flightRoute}
                  onChange={(e) => handleInputChange("flightRoute", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">票号</label>
                <Input
                  placeholder="输入票号"
                  value={formData.ticketNumber}
                  onChange={(e) => handleInputChange("ticketNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">备注</label>
                <Input
                  placeholder="可选备注"
                  value={formData.remark}
                  onChange={(e) => handleInputChange("remark", e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  创建欠条
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle>已创建的欠条</CardTitle>
            <CardDescription>最近创建的欠条记录</CardDescription>
          </CardHeader>
          <CardContent>
            {createdIOUs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无记录</p>
                <p className="text-sm">创建的欠条将显示在这里</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">欠条ID</th>
                      <th className="text-right py-3 px-2">金额</th>
                      <th className="text-center py-3 px-2">明细数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {createdIOUs.map((iou) => (
                      <tr key={iou.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-2 font-mono">{iou.ious_id}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={iou.total_amount < 0 ? "text-red-600" : ""}>
                            ¥{iou.total_amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">{iou.items_count}</td>
                      </tr>
                    ))}
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
