/**
 * EmailTemplatesTab Component
 * Instalily-style template management with list on left, editor on right
 * NO AI - Template-based system only
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/primitives/alert-dialog";
import { Badge } from "@/components/ui/primitives/badge";
import { TemplateEditor } from "./TemplateEditor";
import { templateApi } from "@/services/templateApi";
import { Trash2, Plus, Search, Mail, FileText, TrendingUp, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/auth/hooks/useAuth";

export function EmailTemplatesTab() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [templateType, setTemplateType] = useState('crm');

  useEffect(() => {
    loadTemplates();
    // Clear selected template when switching types to avoid showing wrong template
    setSelectedTemplate(null);
    setIsCreating(false);
  }, [user?.email, templateType]);

  useEffect(() => {
    const filtered = templates.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
    );
    setFilteredTemplates(filtered);
  }, [search, templates]);

  const loadTemplates = async () => {
    if (!user?.email) return;

    try {
      setIsLoading(true);
      const data = await templateApi.listTemplates(user.email, 'email', true, templateType);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete || !user?.email) return;

    try {
      await templateApi.deleteTemplate(templateToDelete.id, user.email);

      // Clear selection if deleted template was selected
      if (selectedTemplate?.id === templateToDelete.id) {
        setSelectedTemplate(null);
      }

      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleSaveTemplate = () => {
    setIsCreating(false);
    setSelectedTemplate(null);
    loadTemplates();
  };

  const handleCancelEdit = () => {
    setIsCreating(false);
    setSelectedTemplate(null);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setIsCreating(true);
  };

  const handleSelectTemplate = (template) => {
    setIsCreating(false);
    setSelectedTemplate(template);
  };

  const openDeleteDialog = (template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="h-full flex gap-6">
      {/* Left Column: Template List */}
      <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-gray-200 pr-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Templates
            </h3>
            <Button onClick={handleNewTemplate} size="sm">
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </div>

          {/* Template Type Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setTemplateType('crm')}
              className={`
                flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all
                ${templateType === 'crm'
                  ? 'bg-red-100 text-red-700 border-2 border-red-300'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-gray-300'
                }
              `}
            >
              CRM
            </button>
            <button
              onClick={() => setTemplateType('leadgen')}
              className={`
                flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all
                ${templateType === 'leadgen'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-gray-300'
                }
              `}
            >
              Lead Gen
            </button>
          </div>

          <p className="text-sm text-gray-600">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <Mail className="mx-auto h-12 w-12 text-gray-300 mb-4 animate-pulse" />
              <p className="text-sm">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-sm">
                {search ? 'No templates found' : 'No templates yet'}
              </p>
              {!search && (
                <Button onClick={handleNewTemplate} variant="outline" size="sm" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first template
                </Button>
              )}
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`
                  p-4 rounded-lg border cursor-pointer transition-all
                  ${selectedTemplate?.id === template.id
                    ? 'bg-purple-50 border-purple-200 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-purple-200 hover:shadow-sm'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 truncate">{template.name}</h4>
                      {template.is_shared && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Shared
                        </Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-gray-600 truncate mt-1">{template.description}</p>
                    )}
                  </div>
                  {/* Delete button always shown for user's own templates */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteDialog(template);
                    }}
                    className="h-8 w-8 p-0 hover:bg-red-50 text-gray-400 hover:text-red-600 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span>{template.performance_stats?.total_sends || 0} sends</span>
                  </div>
                  {template.performance_stats?.total_sends > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>{template.performance_stats.success_rate?.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Editor or Empty State */}
      <div className="flex-1 min-w-0">
        {selectedTemplate || isCreating ? (
          <TemplateEditor
            template={selectedTemplate}
            userEmail={user?.email}
            onSave={handleSaveTemplate}
            templateType={templateType}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <FileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Template Selected</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select a template from the list or create a new one to get started
              </p>
              <Button onClick={handleNewTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Template
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default EmailTemplatesTab;
