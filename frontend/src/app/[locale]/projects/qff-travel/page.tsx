"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Edit, 
  X,
  Plane,
  FileText,
  Building2,
  ArrowRight
} from "lucide-react";
import { 
  getAllTravelTemplates,
  createTravelTemplate,
  updateTravelTemplate,
  deleteTravelTemplate,
  getAllTravelAirlines,
  createTravelAirline,
  updateTravelAirline,
  deleteTravelAirline,
  getAllTravelAirports,
  createTravelAirport,
  updateTravelAirport,
  deleteTravelAirport,
  type TravelTemplate,
  type TravelAirline,
  type TravelAirport
} from "@/lib/apiClient";
import PasswordDialog from "@/components/PasswordDialog";

type TabType = "translate" | "templates" | "airlines" | "airports";

export default function QFFTravelPage() {
  const [activeTab, setActiveTab] = useState<TabType>("translate");
  const [templates, setTemplates] = useState<TravelTemplate[]>([]);
  const [airlines, setAirlines] = useState<TravelAirline[]>([]);
  const [airports, setAirports] = useState<TravelAirport[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [selectedTemplateForTranslate, setSelectedTemplateForTranslate] = useState<number | null>(null);
  const [translating, setTranslating] = useState(false);
  const [autoCopy, setAutoCopy] = useState(false);
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [passwordDialogType, setPasswordDialogType] = useState<"delete" | "save">("delete");
  
  const [editingTemplate, setEditingTemplate] = useState<TravelTemplate | null>(null);
  const [editingAirline, setEditingAirline] = useState<TravelAirline | null>(null);
  const [editingAirport, setEditingAirport] = useState<TravelAirport | null>(null);
  
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showAirlineForm, setShowAirlineForm] = useState(false);
  const [showAirportForm, setShowAirportForm] = useState(false);

  const [templateForm, setTemplateForm] = useState({ name: "", description: "", config_json: "" });
  const [airlineForm, setAirlineForm] = useState({ code: "", name: "" });
  const [airportForm, setAirportForm] = useState({ code: "", name: "" });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await getAllTravelTemplates();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplateForTranslate) {
        setSelectedTemplateForTranslate(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === "templates") {
        const data = await getAllTravelTemplates();
        setTemplates(data);
      } else if (activeTab === "airlines") {
        const data = await getAllTravelAirlines();
        setAirlines(data);
      } else if (activeTab === "airports") {
        const data = await getAllTravelAirports();
        setAirports(data);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      alert("加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      alert("请输入行程信息");
      return;
    }
    if (!selectedTemplateForTranslate) {
      alert("请选择输出模板");
      return;
    }

    setTranslating(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6101'}/api/qff-travel/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: inputText,
          template_id: selectedTemplateForTranslate
        }),
      });

      if (!response.ok) {
        throw new Error('翻译失败');
      }

      const data = await response.json();
      setOutputText(data.output_text);
      
      if (autoCopy && data.output_text) {
        try {
          await navigator.clipboard.writeText(data.output_text);
          alert("翻译完成并已复制到剪贴板！");
        } catch (clipboardError) {
          console.error("Failed to copy to clipboard:", clipboardError);
          alert("翻译完成，但复制到剪贴板失败");
        }
      }
    } catch (error: any) {
      console.error("Translation error:", error);
      alert(error.message || "翻译失败");
    } finally {
      setTranslating(false);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (password !== "qff123") {
      throw new Error("密码错误");
    }
    
    if (pendingAction) {
      try {
        await pendingAction();
        await loadData();
        setShowAirlineForm(false);
        setShowAirportForm(false);
        setShowTemplateForm(false);
      } catch (error: any) {
        throw error;
      } finally {
        setPendingAction(null);
      }
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: "", description: "", config_json: "" });
    setShowTemplateForm(true);
  };

  const handleEditTemplate = (template: TravelTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({ name: template.name, description: template.description || "", config_json: template.config_json });
    setShowTemplateForm(true);
  };

  const handleSaveTemplate = async (password: string) => {
    if (editingTemplate) {
      await updateTravelTemplate(
        editingTemplate.id, 
        password, 
        templateForm.name, 
        templateForm.description, 
        templateForm.config_json
      );
    } else {
      await createTravelTemplate(
        templateForm.name, 
        templateForm.description, 
        templateForm.config_json, 
        password
      );
    }
    setShowTemplateForm(false);
    await loadData();
  };

  const handleDeleteTemplate = (id: number) => {
    setPendingAction(() => async () => {
      await deleteTravelTemplate(id, "qff123");
    });
    setPasswordDialogType("delete");
    setShowPasswordDialog(true);
  };

  const handleCreateAirline = () => {
    setEditingAirline(null);
    setAirlineForm({ code: "", name: "" });
    setShowAirlineForm(true);
  };

  const handleEditAirline = (airline: TravelAirline) => {
    setEditingAirline(airline);
    setAirlineForm({ code: airline.code, name: airline.name });
    setShowAirlineForm(true);
  };

  const handleSaveAirline = async (password: string) => {
    if (editingAirline) {
      await updateTravelAirline(editingAirline.id, password, airlineForm.code, airlineForm.name);
    } else {
      await createTravelAirline(airlineForm.code, airlineForm.name, password);
    }
    setShowAirlineForm(false);
    await loadData();
  };

  const handleDeleteAirline = (id: number) => {
    setPendingAction(() => async () => {
      await deleteTravelAirline(id, "qff123");
    });
    setPasswordDialogType("delete");
    setShowPasswordDialog(true);
  };

  const handleCreateAirport = () => {
    setEditingAirport(null);
    setAirportForm({ code: "", name: "" });
    setShowAirportForm(true);
  };

  const handleEditAirport = (airport: TravelAirport) => {
    setEditingAirport(airport);
    setAirportForm({ code: airport.code, name: airport.name });
    setShowAirportForm(true);
  };

  const handleSaveAirport = async (password: string) => {
    if (editingAirport) {
      await updateTravelAirport(editingAirport.id, password, airportForm.code, airportForm.name);
    } else {
      await createTravelAirport(airportForm.code, airportForm.name, password);
    }
    setShowAirportForm(false);
    await loadData();
  };

  const handleDeleteAirport = (id: number) => {
    setPendingAction(() => async () => {
      await deleteTravelAirport(id, "qff123");
    });
    setPasswordDialogType("delete");
    setShowPasswordDialog(true);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6">QFF 航程信息整理工具</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          管理航程翻译输出模板、航司代码对照表和机场代码对照表
        </p>
      </motion.div>

      <div className="mb-6 flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("translate")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "translate"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowRight className="inline-block mr-2 h-4 w-4" />
          航程翻译
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "templates"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="inline-block mr-2 h-4 w-4" />
          输出模板
        </button>
        <button
          onClick={() => setActiveTab("airlines")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "airlines"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plane className="inline-block mr-2 h-4 w-4" />
          航司对照表
        </button>
        <button
          onClick={() => setActiveTab("airports")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "airports"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="inline-block mr-2 h-4 w-4" />
          机场对照表
        </button>
      </div>

      {activeTab === "translate" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>输入行程信息</CardTitle>
                <CardDescription>粘贴从系统复制的行程信息（包含序号）</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="粘贴行程到此处（包含序号）&#10;例如：&#10;1. ZHANG/SAN &#10;2. CA1234 Y TU 15MAR PEKSHA HK1 0800 1030 E -- T2..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>输出结果</CardTitle>
                <CardDescription>翻译后的航程信息</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={outputText}
                  readOnly
                  placeholder="此处显示输出内容"
                  rows={12}
                  className="font-mono text-sm bg-muted"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>选择输出模板</CardTitle>
                <CardDescription>选择航程信息的输出格式</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {templates.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    暂无模板，请先创建模板
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplateForTranslate(template.id)}
                        className={`w-full text-left p-3 border rounded-lg transition-colors ${
                          selectedTemplateForTranslate === template.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="font-medium text-sm">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <Button 
                  onClick={handleTranslate} 
                  disabled={translating || !inputText.trim() || !selectedTemplateForTranslate}
                  className="w-full"
                  size="lg"
                >
                  {translating ? "翻译中..." : "开始翻译"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>选项设置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoCopy"
                    checked={autoCopy}
                    onChange={(e) => setAutoCopy(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="autoCopy" className="text-sm font-medium cursor-pointer select-none">
                    自动复制到剪贴板
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>使用说明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. 从系统中复制完整的行程信息</p>
                <p>2. 粘贴到输入框中</p>
                <p>3. 选择输出模板格式</p>
                <p>4. 点击"开始翻译"按钮</p>
                <p>5. 复制输出结果使用</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>输出模板</CardTitle>
                <CardDescription>管理航程翻译的输出格式模板</CardDescription>
              </div>
              <Button onClick={handleCreateTemplate}>
                <Plus className="h-4 w-4 mr-1" />
                新建模板
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">加载中...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无模板</div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground mt-1">{template.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground font-mono mt-2 bg-muted p-2 rounded">
                          {template.config_json.substring(0, 100)}...
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          状态: {template.is_active ? "启用" : "禁用"}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditTemplate(template)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "airlines" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>航司对照表</CardTitle>
                <CardDescription>管理航空公司代码与中文名称的对照关系</CardDescription>
              </div>
              <Button onClick={handleCreateAirline}>
                <Plus className="h-4 w-4 mr-1" />
                新建航司
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">加载中...</div>
            ) : airlines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无航司</div>
            ) : (
              <div className="space-y-2">
                {airlines.map((airline) => (
                  <div key={airline.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{airline.code}</span>
                      <span className="mx-2 text-muted-foreground">-</span>
                      <span>{airline.name}</span>
                      <span className="ml-4 text-xs text-muted-foreground">
                        ({airline.is_active ? "启用" : "禁用"})
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditAirline(airline)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAirline(airline.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "airports" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>机场对照表</CardTitle>
                <CardDescription>管理机场代码与中文名称的对照关系</CardDescription>
              </div>
              <Button onClick={handleCreateAirport}>
                <Plus className="h-4 w-4 mr-1" />
                新建机场
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">加载中...</div>
            ) : airports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无机场</div>
            ) : (
              <div className="space-y-2">
                {airports.map((airport) => (
                  <div key={airport.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{airport.code}</span>
                      <span className="mx-2 text-muted-foreground">-</span>
                      <span>{airport.name}</span>
                      <span className="ml-4 text-xs text-muted-foreground">
                        ({airport.is_active ? "启用" : "禁用"})
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditAirport(airport)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAirport(airport.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showTemplateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingTemplate ? "编辑模板" : "新建模板"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">模板名称</label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="如：2023式模板"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">模板描述</label>
                <Input
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="模板说明"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">配置JSON</label>
                <Textarea
                  value={templateForm.config_json}
                  onChange={(e) => setTemplateForm({ ...templateForm, config_json: e.target.value })}
                  placeholder='{"format": "..."}'
                  rows={10}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (!templateForm.name.trim() || !templateForm.config_json.trim()) {
                      alert("请填写完整信息");
                      return;
                    }
                    setPasswordDialogType("save");
                    setShowPasswordDialog(true);
                    setPendingAction(() => async () => {
                      await handleSaveTemplate("qff123");
                    });
                  }}
                >
                  保存
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowTemplateForm(false)}>
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showAirlineForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingAirline ? "编辑航司" : "新建航司"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">航司代码</label>
                <Input
                  value={airlineForm.code}
                  onChange={(e) => setAirlineForm({ ...airlineForm, code: e.target.value })}
                  placeholder="如：CA"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">航司名称</label>
                <Input
                  value={airlineForm.name}
                  onChange={(e) => setAirlineForm({ ...airlineForm, name: e.target.value })}
                  placeholder="如：中国国航"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (!airlineForm.code.trim() || !airlineForm.name.trim()) {
                      alert("请填写完整信息");
                      return;
                    }
                    setPasswordDialogType("save");
                    setShowPasswordDialog(true);
                    setPendingAction(() => async () => {
                      await handleSaveAirline("qff123");
                    });
                  }}
                >
                  保存
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowAirlineForm(false)}>
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showAirportForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingAirport ? "编辑机场" : "新建机场"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">机场代码</label>
                <Input
                  value={airportForm.code}
                  onChange={(e) => setAirportForm({ ...airportForm, code: e.target.value })}
                  placeholder="如：PEK"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">机场名称</label>
                <Input
                  value={airportForm.name}
                  onChange={(e) => setAirportForm({ ...airportForm, name: e.target.value })}
                  placeholder="如：首都国际机场"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (!airportForm.code.trim() || !airportForm.name.trim()) {
                      alert("请填写完整信息");
                      return;
                    }
                    setPasswordDialogType("save");
                    setShowPasswordDialog(true);
                    setPendingAction(() => async () => {
                      await handleSaveAirport("qff123");
                    });
                  }}
                >
                  保存
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowAirportForm(false)}>
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <PasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          setPendingAction(null);
        }}
        onSubmit={handlePasswordSubmit}
        title={passwordDialogType === "delete" ? "确认删除" : "确认保存"}
        description={passwordDialogType === "delete" ? "请输入密码以删除" : "请输入密码以保存"}
      />
    </div>
  );
}
