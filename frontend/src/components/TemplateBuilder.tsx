"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PasswordDialog from "@/components/PasswordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, X } from "lucide-react";

interface Template {
  id?: number;
  name: string;
  template_string: string;
}

interface Segment {
  type: "field" | "custom";
  value: string;
  display: string;
}

const FIELD_OPTIONS = [
  { display: "买家", key: "buyer" },
  { display: "姓名", key: "name" },
  { display: "出发地", key: "origin" },
  { display: "目的地", key: "destination" },
  { display: "金额", key: "amount" },
  { display: "填开日期", key: "issue_date" },
  { display: "发票号", key: "invoice_number" },
  { display: "原文件名", key: "original_filename" },
];

interface TemplateBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: Template, password: string) => void;
  editingTemplate?: Template | null;
}

export default function TemplateBuilder({ isOpen, onClose, onSave, editingTemplate }: TemplateBuilderProps) {
  const [templateName, setTemplateName] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [customText, setCustomText] = useState("");
  const [selectedField, setSelectedField] = useState(FIELD_OPTIONS[0].key);
  const [error, setError] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (editingTemplate) {
      setTemplateName(editingTemplate.name);
      const parsed = parseTemplate(editingTemplate.template_string);
      setSegments(parsed);
    } else {
      resetForm();
    }
  }, [editingTemplate, isOpen]);

  const resetForm = () => {
    setTemplateName("");
    setSegments([]);
    setCustomText("");
    setSelectedField(FIELD_OPTIONS[0].key);
    setError("");
    setShowPasswordDialog(false);
    setPendingTemplate(null);
  };

  const parseTemplate = (templateStr: string): Segment[] => {
    const segments: Segment[] = [];
    let cleanStr = templateStr;
    if (cleanStr.toLowerCase().endsWith('.pdf')) {
      cleanStr = cleanStr.slice(0, -4);
    }

    let i = 0;
    while (i < cleanStr.length) {
      if (cleanStr[i] === '{') {
        const end = cleanStr.indexOf('}', i);
        if (end !== -1) {
          const key = cleanStr.slice(i + 1, end);
          const fieldOption = FIELD_OPTIONS.find(f => f.key === key);
          if (fieldOption) {
            segments.push({
              type: "field",
              value: key,
              display: fieldOption.display
            });
          }
          i = end + 1;
        } else {
          i++;
        }
      } else {
        let start = i;
        while (i < cleanStr.length && cleanStr[i] !== '{') {
          i++;
        }
        const customText = cleanStr.slice(start, i);
        if (customText) {
          segments.push({
            type: "custom",
            value: customText,
            display: customText
          });
        }
      }
    }
    return segments;
  };

  const addField = () => {
    const fieldOption = FIELD_OPTIONS.find(f => f.key === selectedField);
    if (fieldOption) {
      setSegments([...segments, {
        type: "field",
        value: fieldOption.key,
        display: fieldOption.display
      }]);
    }
  };

  const addCustom = () => {
    if (customText.length > 0) {
      const displayText = customText === " " || customText.match(/^\s+$/) 
        ? `[${customText.length}个空格]` 
        : customText;
      setSegments([...segments, {
        type: "custom",
        value: customText,
        display: displayText
      }]);
      setCustomText("");
    }
  };

  const removeSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const buildTemplateString = (): string => {
    let result = segments.map(seg => {
      if (seg.type === "field") {
        return `{${seg.value}}`;
      }
      return seg.value;
    }).join("");
    
    if (!result.toLowerCase().endsWith('.pdf')) {
      result += '.pdf';
    }
    return result;
  };

  const handleSave = () => {
    setError("");
    
    if (!templateName.trim()) {
      setError("请输入模板名称");
      return;
    }
    if (segments.length === 0) {
      setError("模板不能为空");
      return;
    }
    
    const templateStr = buildTemplateString();
    const hasNonPdfContent = templateStr.replace('.pdf', '').trim().length > 0;
    if (!hasNonPdfContent) {
      setError("模板内容不能全为空白");
      return;
    }

    const template: Template = {
      id: editingTemplate?.id,
      name: templateName.trim(),
      template_string: buildTemplateString()
    };

    setPendingTemplate(template);
    setShowPasswordDialog(true);
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!pendingTemplate) return;
    
    await onSave(pendingTemplate, password);
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTemplate ? "编辑模板" : "创建新模板"}</DialogTitle>
          <DialogDescription>
            使用下方工具拼装您的PDF文件名模板
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">模板名称</label>
            <Input
              placeholder="例如: 公司格式A"
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value);
                if (error) setError("");
              }}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">添加字段</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                >
                  {FIELD_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.display}
                    </option>
                  ))}
                </select>
                <Button onClick={addField} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">添加自定义文本</label>
              <div className="flex gap-2">
                <Input
                  placeholder="例如: - 或空格"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustom()}
                />
                <Button onClick={addCustom} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">模板片段</label>
            <div className="border rounded-lg p-4 min-h-[100px] bg-muted/30">
              {segments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  尚未添加任何片段
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {segments.map((segment, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-background border"
                    >
                      <span className="text-sm">
                        {segment.type === "field" ? (
                          <span className="text-primary font-medium">{segment.display}</span>
                        ) : (
                          <span className="text-muted-foreground">{segment.display}</span>
                        )}
                      </span>
                      <button
                        onClick={() => removeSegment(index)}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">预览</label>
            <div className="border rounded-lg p-3 bg-muted/30 font-mono text-sm">
              {segments.length === 0 ? (
                <span className="text-muted-foreground">模板预览将显示在这里</span>
              ) : (
                buildTemplateString()
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSave}>
              保存模板
            </Button>
          </div>
        </div>
      </DialogContent>

      <PasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          setPendingTemplate(null);
        }}
        onSubmit={handlePasswordSubmit}
        title={editingTemplate ? "修改模板" : "创建模板"}
        description="请输入密码以继续操作"
      />
    </Dialog>
  );
}
