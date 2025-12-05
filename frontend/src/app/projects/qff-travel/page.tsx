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
  Building2
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

type TabType = "templates" | "airlines" | "airports";

export default function QFFTravelPage() {
  const [activeTab, setActiveTab] = useState<TabType>("templates");
  const [templates, setTemplates] = useState<TravelTemplate[]>([]);
  const [airlines, setAirlines] = useState<TravelAirline[]>([]);
  const [airports, setAirports] = useState<TravelAirport[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  
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

  const handlePasswordSubmit = async (password: string) => {
    if (pendingAction) {
      try {
        await pendingAction();
        await loadData();
      } catch (error: any) {
        alert(error.message || "操作失败");
      }
      setPendingAction(null);
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
                <PasswordDialog
                  isOpen={false}
                  onClose={() => {}}
                  onSubmit={handleSaveTemplate}
                  trigger={<Button className="flex-1">保存</Button>}
                  title={editingTemplate ? "编辑模板" : "新建模板"}
                  description="请输入密码以继续"
                />
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
                <PasswordDialog
                  isOpen={false}
                  onClose={() => {}}
                  onSubmit={handleSaveAirline}
                  trigger={<Button className="flex-1">保存</Button>}
                  title={editingAirline ? "编辑航司" : "新建航司"}
                  description="请输入密码以继续"
                />
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
                <PasswordDialog
                  isOpen={false}
                  onClose={() => {}}
                  onSubmit={handleSaveAirport}
                  trigger={<Button className="flex-1">保存</Button>}
                  title={editingAirport ? "编辑机场" : "新建机场"}
                  description="请输入密码以继续"
                />
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
        title="确认删除"
        description="请输入密码以删除"
      />
    </div>
  );
}
