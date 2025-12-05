"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
  Plus,
  Edit,
  X
} from "lucide-react";
import { saveAs } from "file-saver";
import { 
  processPDFs, 
  processPDFsAndDownload, 
  type ProcessedPDFResult,
  getAllPdfTemplates,
  createPdfTemplate,
  updatePdfTemplate,
  deletePdfTemplate,
  type PdfTemplate
} from "@/lib/apiClient";
import TemplateBuilder from "@/components/TemplateBuilder";
import PasswordDialog from "@/components/PasswordDialog";

interface ProcessedFile {
  originalFile: File;
  extractedInfo: {
    name?: string | null;
    origin?: string | null;
    destination?: string | null;
    amount?: string | null;
    buyer?: string | null;
    invoice_number?: string | null;
    issue_date?: string | null;
  };
  newName: string;
  status: "success" | "incomplete" | "error";
  missingFields?: string[];
  error?: string;
}

export default function PDFRenamePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [customTemplate, setCustomTemplate] = useState("");
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PdfTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getAllPdfTemplates();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (template: { id?: number; name: string; template_string: string }, password: string) => {
    if (template.id) {
      await updatePdfTemplate(template.id, password, template.name, template.template_string);
    } else {
      await createPdfTemplate(template.name, template.template_string, password);
    }
    await loadTemplates();
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: number) => {
    setPendingDeleteId(id);
    setShowPasswordDialog(true);
  };

  const handlePasswordSubmit = async (password: string) => {
    if (pendingDeleteId === null) return;
    
    await deletePdfTemplate(pendingDeleteId, password);
    await loadTemplates();
    if (selectedTemplateId === pendingDeleteId) {
      setSelectedTemplateId(templates.length > 1 ? templates[0].id : null);
    }
    setPendingDeleteId(null);
  };

  const getSelectedTemplate = (): string => {
    if (customTemplate) return customTemplate;
    const template = templates.find(t => t.id === selectedTemplateId);
    return template?.template_string || "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...uploadedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    setProcessing(true);
    setProcessedFiles([]);

    try {
      const template = getSelectedTemplate();
      const response = await processPDFs(files, template);
      
      const results: ProcessedFile[] = response.results.map((result, index) => ({
        originalFile: files[index],
        extractedInfo: result.extracted_info,
        newName: result.new_name,
        status: result.status,
        missingFields: result.missing_fields,
        error: result.error,
      }));

      setProcessedFiles(results);
    } catch (error) {
      console.error("Error processing files:", error);
      alert("处理文件失败。请确保后端服务器正在运行。");
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = async () => {
    try {
      const template = getSelectedTemplate();
      const blob = await processPDFsAndDownload(files, template);
      saveAs(blob, "renamed_pdfs.zip");
    } catch (error) {
      console.error("Error downloading files:", error);
      alert("下载文件失败。请确保后端服务器正在运行。");
    }
  };

  const downloadSingle = (processedFile: ProcessedFile) => {
    const fileName = processedFile.status === "success" ? processedFile.newName : processedFile.originalFile.name;
    saveAs(processedFile.originalFile, fileName);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6">GJP PDF 重命名工具</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          智能PDF批量重命名工具，可提取发票信息并使用自定义模板重命名文件。
          上传您的PDF文件，选择命名模板，即可立即下载重命名后的文件。
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>上传PDF文件</CardTitle>
              <CardDescription>选择一个或多个PDF文件进行处理</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <Input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    点击上传或拖放文件
                  </p>
                  <p className="text-xs text-muted-foreground">仅支持PDF文件</p>
                </label>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">已上传文件 ({files.length})</h3>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm truncate max-w-xs">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={processFiles}
                    disabled={processing}
                    className="w-full"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      "处理文件"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {processedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>已处理文件</CardTitle>
                    <CardDescription>
                      成功 {processedFiles.filter(f => f.status === "success").length} 个， 
                      不完整 {processedFiles.filter(f => f.status === "incomplete").length} 个， 
                      错误 {processedFiles.filter(f => f.status === "error").length} 个
                    </CardDescription>
                  </div>
                  <Button onClick={downloadAll}>
                    <Download className="mr-2 h-4 w-4" />
                    下载全部
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {processedFiles.map((pFile, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {pFile.status === "success" ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : pFile.status === "error" ? (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="font-medium text-sm">
                              {pFile.originalFile.name}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground ml-6">
                            <div>新文件名: <span className="text-foreground">{pFile.newName}</span></div>
                            {pFile.status === "incomplete" && pFile.missingFields && (
                              <div className="text-amber-600 mt-1">
                                缺少字段: {pFile.missingFields.join(", ")}
                              </div>
                            )}
                            {pFile.status === "error" && pFile.error && (
                              <div className="text-red-600 mt-1">
                                错误: {pFile.error}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadSingle(pFile)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>模板设置</CardTitle>
                  <CardDescription>选择或创建命名模板</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTemplate(null);
                    setShowTemplateBuilder(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  新建
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">模板列表</label>
                {loading ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    加载中...
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    暂无模板，请创建一个
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`flex items-center justify-between p-3 border rounded-lg ${
                          selectedTemplateId === template.id && !customTemplate
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <button
                          className="flex-1 text-left"
                          onClick={() => {
                            setSelectedTemplateId(template.id);
                            setCustomTemplate("");
                          }}
                        >
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-1">
                            {template.template_string}
                          </div>
                        </button>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingTemplate(template);
                              setShowTemplateBuilder(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">自定义模板（临时）</label>
                <Input
                  placeholder="{buyer} {name} {origin}-{destination}.pdf"
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  可用字段: {"{buyer}"}, {"{name}"}, {"{origin}"}, {"{destination}"}, 
                  {"{amount}"}, {"{invoice_number}"}, {"{issue_date}"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  1
                </div>
                <p>上传PDF发票文件</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  2
                </div>
                <p>工具自动提取发票信息（购买方、旅客、路线、金额等）</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  3
                </div>
                <p>根据您选择的模板重命名文件</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  4
                </div>
                <p>单独下载或打包下载为ZIP文件</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TemplateBuilder
        isOpen={showTemplateBuilder}
        onClose={() => {
          setShowTemplateBuilder(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveTemplate}
        editingTemplate={editingTemplate}
      />

      <PasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          setPendingDeleteId(null);
        }}
        onSubmit={handlePasswordSubmit}
        title="删除模板"
        description="请输入密码以删除此模板"
      />
    </div>
  );
}
