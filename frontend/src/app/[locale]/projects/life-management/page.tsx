"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lock, LayoutDashboard, AlertCircle, Upload, Plus, List, Settings,
  Trash2, CheckCircle, X, ChevronLeft, ChevronRight, Eye, ArrowLeft, Columns,
  ClipboardList, Circle, History, Calendar
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  source: string;
  currency: string;
  exchange_rate: number;
  remark: string | null;
}

interface Category {
  id: number;
  category: string;
  keywords: string[];
}

type TabType = "browse" | "import" | "add" | "categories" | "notes";

export default function LifeManagementPage() {
  const [password, setPassword] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("browse");
  const [rememberDevice, setRememberDevice] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const verifyExistingToken = async () => {
      const token = localStorage.getItem("life_mgmt_token");
      if (!token) {
        setIsCheckingToken(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/accounting/verify-token`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          setIsVerified(true);
        } else {
          // Token invalid or expired, remove it
          localStorage.removeItem("life_mgmt_token");
        }
      } catch (err) {
        console.error("Token verification failed:", err);
        localStorage.removeItem("life_mgmt_token");
      } finally {
        setIsCheckingToken(false);
      }
    };

    verifyExistingToken();
  }, []);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError("请输入密码");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/accounting/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, remember_device: rememberDevice }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("life_mgmt_token", data.token);
        setIsVerified(true);
      } else {
        setError(data.detail || "密码错误");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("验证失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("life_mgmt_token");
    setIsVerified(false);
    setPassword("");
  };

  // Loading state while checking token
  if (isCheckingToken) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">验证中...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isVerified) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>生活管理</CardTitle>
              <CardDescription>请输入密码以访问</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberDevice}
                  onCheckedChange={(checked) => setRememberDevice(checked === true)}
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  记住此设备（30天内免登录）
                </label>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <Button onClick={handleLogin} disabled={isLoading} className="w-full">
                {isLoading ? "验证中..." : "进入"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { id: "browse" as TabType, label: "浏览", icon: List },
    { id: "import" as TabType, label: "导入CSV", icon: Upload },
    { id: "add" as TabType, label: "手动添加", icon: Plus },
    { id: "categories" as TabType, label: "分类管理", icon: Settings },
    { id: "notes" as TabType, label: "备忘录", icon: ClipboardList },
  ];

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
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">生活管理</h1>
              <p className="text-muted-foreground">记账 · 任务 · 日程</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            退出登录
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                onClick={() => setActiveTab(tab.id)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "browse" && <BrowseTab />}
        {activeTab === "import" && <ImportTab />}
        {activeTab === "add" && <AddTab />}
        {activeTab === "categories" && <CategoriesTab />}
        {activeTab === "notes" && <NotesTab />}
      </motion.div>
    </div>
  );
}

// ========== Browse Tab ==========
type ColumnKey = "date" | "description" | "amount" | "category" | "source" | "currency" | "remark";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "date", label: "日期" },
  { key: "description", label: "描述" },
  { key: "amount", label: "金额" },
  { key: "category", label: "分类" },
  { key: "source", label: "来源" },
  { key: "currency", label: "货币" },
  { key: "remark", label: "备注" },
];

const PAGE_SIZE_OPTIONS = [
  { value: 0, label: "全部" },
  { value: 20, label: "20" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
];

function BrowseTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(0); // 0 means "all"
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    categories: [] as string[],
    source: "",
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(["date", "description", "amount", "category", "source", "currency", "remark"]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: number; col: ColumnKey } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("start_date", filters.startDate);
      if (filters.endDate) params.append("end_date", filters.endDate);
      if (filters.categories.length > 0) {
        params.append("categories", filters.categories.join(","));
      }
      if (filters.source) params.append("source", filters.source);
      if (pageSize > 0) {
        params.append("limit", pageSize.toString());
        params.append("offset", (page * pageSize).toString());
      }
      // If pageSize is 0 (all), don't send limit/offset to get all records

      const response = await fetch(`${API_BASE_URL}/api/accounting/transactions?${params}`);
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    loadTransactions();
    fetch(`${API_BASE_URL}/api/accounting/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCategories(data.categories);
      });
  }, [loadTransactions]);

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除这条记录？")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounting/transactions/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        loadTransactions();
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const startEdit = (t: Transaction, col: ColumnKey) => {
    let value = "";
    switch (col) {
      case "date": value = t.date; break;
      case "description": value = t.description; break;
      case "amount": value = t.amount.toString(); break;
      case "category": value = t.category || ""; break;
      case "source": value = t.source; break;
      case "currency": value = t.currency; break;
      case "remark": value = t.remark || ""; break;
    }
    setEditingCell({ id: t.id, col });
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const { id, col } = editingCell;
    const updateData: Record<string, string | number | null> = {};

    if (col === "amount") {
      updateData[col] = parseFloat(editValue) || 0;
    } else if (col === "category" || col === "remark") {
      updateData[col] = editValue || null;
    } else {
      updateData[col] = editValue;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/accounting/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (response.ok) {
        // Update local state instead of reloading
        setTransactions((prev) =>
          prev.map((t) => {
            if (t.id === id) {
              const newValue = col === "amount" ? parseFloat(editValue) || 0 : (editValue || null);
              return { ...t, [col]: newValue };
            }
            return t;
          })
        );
      }
    } catch (err) {
      console.error("Failed to save:", err);
    }
    setEditingCell(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      cancelEdit();
    } else if (e.key === "Enter") {
      saveEdit();
    }
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Selection functions
  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length && transactions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条记录？`)) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`${API_BASE_URL}/api/accounting/transactions/${id}`, { method: "DELETE" })
        )
      );
      setSelectedIds(new Set());
      loadTransactions();
    } catch (err) {
      console.error("Failed to bulk delete:", err);
    }
  };

  // Clear selection when page/filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, filters, pageSize]);

  // Reset page when pageSize changes
  useEffect(() => {
    setPage(0);
  }, [pageSize]);

  // Calculate sum of displayed transactions
  const displayedSum = transactions.reduce((sum, t) => sum + t.amount, 0);

  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 1;

  const renderCell = (t: Transaction, col: ColumnKey) => {
    const isEditing = editingCell?.id === t.id && editingCell?.col === col;

    if (isEditing) {
      if (col === "category") {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-7 px-1 border rounded text-sm w-full"
          >
            <option value="">未分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.category}>{c.category}</option>
            ))}
          </select>
        );
      }
      return (
        <input
          type={col === "date" ? "date" : col === "amount" ? "number" : "text"}
          step={col === "amount" ? "0.01" : undefined}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          className={`h-7 px-1 border rounded text-sm w-full ${col === "amount" ? "text-right" : ""}`}
        />
      );
    }

    // Display mode - clickable
    const cellContent = (() => {
      switch (col) {
        case "date": return t.date;
        case "description": return <span className="max-w-[300px] truncate block" title={t.description}>{t.description}</span>;
        case "amount": return (
          <span className={`font-mono ${t.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
            {t.amount >= 0 ? "+" : ""}{t.amount.toFixed(2)}
          </span>
        );
        case "category": return t.category ? <Badge variant="secondary">{t.category}</Badge> : <span className="text-muted-foreground">-</span>;
        case "source": return t.source;
        case "currency": return t.currency;
        case "remark": return t.remark || <span className="text-muted-foreground">-</span>;
        default: return null;
      }
    })();

    return (
      <div
        onClick={() => startEdit(t, col)}
        className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1"
      >
        {cellContent}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>交易记录</CardTitle>
            <CardDescription>
              共 {total} 条记录 · 当前显示 {transactions.length} 条 ·
              合计: <span className={`font-mono font-medium ${displayedSum >= 0 ? "text-green-600" : "text-red-600"}`}>
                {displayedSum >= 0 ? "+" : ""}{displayedSum.toFixed(2)}
              </span>
            </CardDescription>
          </div>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="gap-2"
            >
              <Columns className="h-4 w-4" />
              列设置
            </Button>
            {showColumnSelector && (
              <div className="absolute right-0 top-10 z-10 bg-background border rounded-lg shadow-lg p-3 min-w-[150px]">
                {ALL_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                    />
                    <span className="text-sm">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Input
            type="date"
            placeholder="开始日期"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <Input
            type="date"
            placeholder="结束日期"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full h-10 px-3 border rounded-md text-left text-sm flex items-center justify-between bg-background"
            >
              <span className={filters.categories.length === 0 ? "text-muted-foreground" : ""}>
                {filters.categories.length === 0
                  ? "选择分类"
                  : filters.categories.length === 1
                    ? filters.categories[0]
                    : `已选 ${filters.categories.length} 个`}
              </span>
              <ChevronRight className={`h-4 w-4 transition-transform ${showCategoryDropdown ? "rotate-90" : ""}`} />
            </button>
            {showCategoryDropdown && (
              <div className="absolute z-20 top-11 left-0 w-full bg-background border rounded-lg shadow-lg p-2 max-h-48 overflow-y-auto">
                {filters.categories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, categories: [] })}
                    className="w-full text-left text-sm text-muted-foreground hover:text-foreground py-1 px-2 mb-1"
                  >
                    清除选择
                  </button>
                )}
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-muted/50 rounded">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(c.category)}
                      onChange={() => {
                        const newCategories = filters.categories.includes(c.category)
                          ? filters.categories.filter((cat) => cat !== c.category)
                          : [...filters.categories, c.category];
                        setFilters({ ...filters, categories: newCategories });
                      }}
                    />
                    <span className="text-sm">{c.category}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <Input
            placeholder="来源"
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
          />
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 p-2 bg-muted/50 rounded-lg">
            <span className="text-sm">已选择 {selectedIds.size} 条</span>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              删除选中
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              取消选择
            </Button>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-8">加载中...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">暂无记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-2 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === transactions.length && transactions.length > 0}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  {ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
                    <th
                      key={col.key}
                      className={`py-3 px-2 ${col.key === "amount" ? "text-right" : "text-left"}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className={`border-b hover:bg-muted/30 ${selectedIds.has(t.id) ? "bg-muted/50" : ""}`}>
                    <td className="py-1 px-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    {ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
                      <td
                        key={col.key}
                        className={`py-1 px-2 ${col.key === "amount" ? "text-right" : ""}`}
                      >
                        {renderCell(t, col.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Page Size */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">每页显示:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="h-8 px-2 border rounded text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                第 {page + 1} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ========== Import Tab ==========
interface PreviewItem {
  line: number;
  date: string;
  description: string;
  original_desc: string;
  amount: number;
  category: string | null;
  source: string;
  is_duplicate: boolean;
}

function ImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("CIBC");
  const [currency, setCurrency] = useState("CAD");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    duplicates: Array<{ line: number; description: string; amount: number }>;
    errors: string[];
  } | null>(null);

  const handlePreview = async () => {
    if (!file || !source.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);

      const response = await fetch(`${API_BASE_URL}/api/accounting/preview/csv`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setPreviewItems(data.items);
        setPreviewErrors(data.errors);
        setShowPreview(true);
      }
    } catch (err) {
      console.error("Preview failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);
      formData.append("currency", currency);
      formData.append("skip_duplicates", skipDuplicates.toString());

      const response = await fetch(`${API_BASE_URL}/api/accounting/import/csv`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setResult({
          imported: data.imported,
          duplicates: data.duplicates,
          errors: data.errors,
        });
        setShowPreview(false);
        setPreviewItems([]);
      }
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setShowPreview(false);
    setPreviewItems([]);
    setPreviewErrors([]);
  };

  const duplicateCount = previewItems.filter((p) => p.is_duplicate).length;
  const newCount = previewItems.length - duplicateCount;

  // Preview view
  if (showPreview) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
            <div>
              <CardTitle>预览导入数据</CardTitle>
              <CardDescription>
                共 {previewItems.length} 条 | 新增 {newCount} 条 | 重复 {duplicateCount} 条
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {previewErrors.length > 0 && (
            <div className="border border-red-200 rounded-lg p-3 bg-red-50">
              <h4 className="font-medium text-red-600 mb-1">{previewErrors.length} 个解析错误</h4>
              <div className="text-sm text-red-600 max-h-20 overflow-y-auto">
                {previewErrors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="skipDuplicatesPreview"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
              <label htmlFor="skipDuplicatesPreview" className="text-sm">跳过重复记录</label>
            </div>
            <div className="text-sm text-muted-foreground">
              货币: {currency}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left py-2 px-2">状态</th>
                  <th className="text-left py-2 px-2">日期</th>
                  <th className="text-left py-2 px-2">描述</th>
                  <th className="text-right py-2 px-2">金额</th>
                  <th className="text-left py-2 px-2">分类</th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((item) => (
                  <tr
                    key={item.line}
                    className={`border-b ${item.is_duplicate ? "bg-yellow-50 opacity-60" : ""}`}
                  >
                    <td className="py-2 px-2">
                      {item.is_duplicate ? (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-400">重复</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-400">新增</Badge>
                      )}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">{item.date}</td>
                    <td className="py-2 px-2 max-w-[250px] truncate" title={item.original_desc}>
                      {item.description}
                    </td>
                    <td className={`py-2 px-2 text-right font-mono whitespace-nowrap ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {item.amount >= 0 ? "+" : ""}{item.amount.toFixed(2)}
                    </td>
                    <td className="py-2 px-2">
                      {item.category ? <Badge variant="secondary">{item.category}</Badge> : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={isLoading || (skipDuplicates && newCount === 0)}>
              {isLoading ? "导入中..." : `确认导入 ${skipDuplicates ? newCount : previewItems.length} 条`}
            </Button>
            <Button variant="outline" onClick={handleBack}>取消</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Input view
  return (
    <Card>
      <CardHeader>
        <CardTitle>导入CSV</CardTitle>
        <CardDescription>从银行导出的CSV文件导入交易记录</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">CSV文件 *</label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">来源 *</label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="CIBC, RBC, TD..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">货币</label>
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="CAD, USD, CNY..."
            />
          </div>
        </div>

        <Button onClick={handlePreview} disabled={!file || !source.trim() || isLoading} className="gap-2">
          <Eye className="h-4 w-4" />
          {isLoading ? "解析中..." : "预览"}
        </Button>

        {result && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              成功导入 {result.imported} 条记录
            </div>

            {result.duplicates.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 text-yellow-600">
                  跳过 {result.duplicates.length} 条重复记录
                </h4>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="border border-red-200 rounded-lg p-4">
                <h4 className="font-medium mb-2 text-red-600">
                  {result.errors.length} 个错误
                </h4>
                <div className="max-h-40 overflow-y-auto text-sm text-red-600">
                  {result.errors.map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== Add Tab ==========
function AddTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    category: "",
    source: "",
    currency: "CAD",
    remark: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/accounting/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCategories(data.categories);
      });
  }, []);

  const handlePreview = () => {
    if (!form.date || !form.description || !form.amount || !form.source) {
      setMessage({ type: "error", text: "请填写必填项" });
      return;
    }
    setMessage(null);
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/accounting/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: data.warning ? `添加成功（警告：${data.warning}）` : "添加成功",
        });
        setForm({
          ...form,
          description: "",
          amount: "",
          remark: "",
        });
        setShowPreview(false);
      } else {
        setMessage({ type: "error", text: "添加失败" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const amountNum = parseFloat(form.amount) || 0;

  // Preview view
  if (showPreview) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回编辑
            </Button>
            <div>
              <CardTitle>确认添加</CardTitle>
              <CardDescription>请确认以下信息无误</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">日期</span>
                <p className="font-medium">{form.date}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">金额</span>
                <p className={`font-medium font-mono text-lg ${amountNum >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {amountNum >= 0 ? "+" : ""}{amountNum.toFixed(2)} {form.currency}
                </p>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">描述</span>
              <p className="font-medium">{form.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">分类</span>
                <p>{form.category ? <Badge variant="secondary">{form.category}</Badge> : <span className="text-muted-foreground">未分类</span>}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">来源</span>
                <p className="font-medium">{form.source}</p>
              </div>
            </div>
            {form.remark && (
              <div>
                <span className="text-sm text-muted-foreground">备注</span>
                <p>{form.remark}</p>
              </div>
            )}
          </div>

          {message && (
            <div className={`flex items-center gap-2 ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {message.text}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "添加中..." : "确认添加"}
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              返回修改
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Input view
  return (
    <Card>
      <CardHeader>
        <CardTitle>手动添加</CardTitle>
        <CardDescription>手动添加一条交易记录</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">日期 *</label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">金额 * (支出为负)</label>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="-50.00"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">描述 *</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="交易描述"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">分类</label>
            <select
              className="w-full h-10 px-3 border rounded-md"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">未分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.category}>{c.category}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">来源 *</label>
            <Input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="CIBC, 支付宝, 现金..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">货币</label>
            <Input
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">备注</label>
            <Input
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
              placeholder="可选"
            />
          </div>
        </div>

        {message && (
          <div className={`flex items-center gap-2 ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <Button onClick={handlePreview} className="gap-2">
          <Eye className="h-4 w-4" />
          预览
        </Button>
      </CardContent>
    </Card>
  );
}

// ========== Categories Tab ==========
function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editKeywords, setEditKeywords] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounting/categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditKeywords(category.keywords.join(", "));
  };

  const handleSave = async (id: number) => {
    try {
      const keywords = editKeywords.split(",").map((k) => k.trim()).filter((k) => k);
      const response = await fetch(`${API_BASE_URL}/api/accounting/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      });
      if (response.ok) {
        setEditingId(null);
        loadCategories();
      }
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleCreate = async () => {
    if (!newCategory.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounting/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory.trim(), keywords: [] }),
      });
      if (response.ok) {
        setNewCategory("");
        loadCategories();
      }
    } catch (err) {
      console.error("Failed to create:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除这个分类？")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounting/categories/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        loadCategories();
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>分类管理</CardTitle>
        <CardDescription>管理交易分类和自动匹配关键字</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new category */}
        <div className="flex gap-2">
          <Input
            placeholder="新分类名称"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <Button onClick={handleCreate}>添加分类</Button>
        </div>

        {/* Categories list */}
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{category.category}</h4>
                <div className="flex gap-2">
                  {editingId === category.id ? (
                    <>
                      <Button size="sm" onClick={() => handleSave(category.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                        编辑
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(category.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {editingId === category.id ? (
                <Input
                  value={editKeywords}
                  onChange={(e) => setEditKeywords(e.target.value)}
                  placeholder="关键字用逗号分隔"
                />
              ) : (
                <div className="flex flex-wrap gap-1">
                  {category.keywords.length > 0 ? (
                    category.keywords.map((keyword, i) => (
                      <Badge key={i} variant="secondary">{keyword}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">无关键字</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


// ========== Notes Tab ==========
interface Note {
  id: number;
  type: string;
  content: string;
  is_completed: boolean;
  date: string | null;
  created_at: string;
  completed_at: string | null;
}

interface DailyHistoryItem {
  date: string;
  tasks: { id: number; content: string; is_completed: boolean; completed_at: string | null }[];
  total: number;
  completed: number;
}

interface LongtermHistoryItem {
  id: number;
  content: string;
  completed_at: string;
  created_at: string;
}

function NotesTab() {
  const [dailyNotes, setDailyNotes] = useState<Note[]>([]);
  const [longtermNotes, setLongtermNotes] = useState<Note[]>([]);
  const [newDailyTask, setNewDailyTask] = useState("");
  const [newLongtermTask, setNewLongtermTask] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<"daily" | "longterm">("daily");
  const [dailyHistory, setDailyHistory] = useState<DailyHistoryItem[]>([]);
  const [longtermHistory, setLongtermHistory] = useState<LongtermHistoryItem[]>([]);

  const loadNotes = useCallback(async () => {
    try {
      const [dailyRes, longtermRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/accounting/notes?type=daily`),
        fetch(`${API_BASE_URL}/api/accounting/notes?type=longterm`),
      ]);

      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setDailyNotes(data.notes || []);
      }
      if (longtermRes.ok) {
        const data = await longtermRes.json();
        setLongtermNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const loadHistory = async () => {
    try {
      const [dailyRes, longtermRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/accounting/notes/history/daily?days=30`),
        fetch(`${API_BASE_URL}/api/accounting/notes/history/longterm`),
      ]);

      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setDailyHistory(data.history || []);
      }
      if (longtermRes.ok) {
        const data = await longtermRes.json();
        setLongtermHistory(data.completed_tasks || []);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const handleAddTask = async (type: "daily" | "longterm") => {
    const content = type === "daily" ? newDailyTask : newLongtermTask;
    if (!content.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/accounting/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content: content.trim() }),
      });

      if (response.ok) {
        if (type === "daily") {
          setNewDailyTask("");
        } else {
          setNewLongtermTask("");
        }
        loadNotes();
      }
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  const handleToggle = async (noteId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounting/notes/${noteId}/toggle`, {
        method: "PUT",
      });

      if (response.ok) {
        loadNotes();
      }
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const handleDelete = async (noteId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounting/notes/${noteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        loadNotes();
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: "daily" | "longterm") => {
    if (e.key === "Enter") {
      handleAddTask(type);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "今天";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "昨天";
    } else {
      return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with History Button */}
      <div className="flex justify-end">
        <Dialog open={historyOpen} onOpenChange={(open) => {
          setHistoryOpen(open);
          if (open) loadHistory();
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              查看历史
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>任务完成历史</DialogTitle>
              <DialogDescription>查看每日任务和长期任务的完成记录</DialogDescription>
            </DialogHeader>

            {/* History Tabs */}
            <div className="flex gap-2 border-b pb-2 mb-4">
              <Button
                variant={historyTab === "daily" ? "default" : "ghost"}
                size="sm"
                onClick={() => setHistoryTab("daily")}
              >
                每日任务历史
              </Button>
              <Button
                variant={historyTab === "longterm" ? "default" : "ghost"}
                size="sm"
                onClick={() => setHistoryTab("longterm")}
              >
                长期任务历史
              </Button>
            </div>

            {/* Daily History */}
            {historyTab === "daily" && (
              <div className="space-y-4">
                {dailyHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">暂无历史记录</p>
                ) : (
                  dailyHistory.map((day) => (
                    <div key={day.date} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{formatDate(day.date)}</span>
                          <span className="text-muted-foreground text-sm">({day.date})</span>
                        </div>
                        <Badge variant={day.completed === day.total ? "default" : "secondary"}>
                          完成 {day.completed}/{day.total}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-6">
                        {day.tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-center gap-2 text-sm ${task.is_completed ? "text-muted-foreground line-through" : ""}`}
                          >
                            {task.is_completed ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <Circle className="h-3 w-3" />
                            )}
                            {task.content}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Longterm History */}
            {historyTab === "longterm" && (
              <div className="space-y-2">
                {longtermHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">暂无完成的长期任务</p>
                ) : (
                  longtermHistory.map((task) => (
                    <div key={task.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{task.content}</span>
                      </div>
                      <span className="text-muted-foreground text-sm">
                        完成于 {new Date(task.completed_at).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              每日任务
            </CardTitle>
            <CardDescription>今天的待办事项（每天自动重置）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Add Task Input */}
            <div className="flex gap-2">
              <Input
                placeholder="添加新任务..."
                value={newDailyTask}
                onChange={(e) => setNewDailyTask(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, "daily")}
              />
              <Button onClick={() => handleAddTask("daily")} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Task List */}
            <div className="space-y-2">
              {dailyNotes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">暂无任务</p>
              ) : (
                dailyNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`flex items-center justify-between p-2 rounded-lg border ${note.is_completed ? "bg-muted/50" : ""}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => handleToggle(note.id)}
                        className="hover:scale-110 transition-transform"
                      >
                        {note.is_completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <span className={note.is_completed ? "line-through text-muted-foreground" : ""}>
                        {note.content}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-red-500"
                      onClick={() => handleDelete(note.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Long-term Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              长期任务
            </CardTitle>
            <CardDescription>长期目标和计划</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Add Task Input */}
            <div className="flex gap-2">
              <Input
                placeholder="添加新任务..."
                value={newLongtermTask}
                onChange={(e) => setNewLongtermTask(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, "longterm")}
              />
              <Button onClick={() => handleAddTask("longterm")} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Task List */}
            <div className="space-y-2">
              {longtermNotes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">暂无任务</p>
              ) : (
                longtermNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`flex items-center justify-between p-2 rounded-lg border ${note.is_completed ? "bg-muted/50" : ""}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => handleToggle(note.id)}
                        className="hover:scale-110 transition-transform"
                      >
                        {note.is_completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <span className={note.is_completed ? "line-through text-muted-foreground" : ""}>
                        {note.content}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-red-500"
                      onClick={() => handleDelete(note.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
