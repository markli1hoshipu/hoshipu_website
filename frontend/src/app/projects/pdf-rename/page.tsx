"use client";

import { useState } from "react";
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
  Settings
} from "lucide-react";
import { saveAs } from "file-saver";
import { processPDFs, processPDFsAndDownload, type ProcessedPDFResult } from "@/lib/apiClient";

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

const DEFAULT_TEMPLATES = [
  { name: "行程信息", pattern: "{buyer} {name} {origin}-{destination} {amount}.pdf" },
  { name: "仅发票号", pattern: "{invoice_number}.pdf" },
];

export default function PDFRenamePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(DEFAULT_TEMPLATES[0].pattern);
  const [customTemplate, setCustomTemplate] = useState("");

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
      const template = customTemplate || selectedTemplate;
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
      alert("Failed to process files. Make sure the backend server is running.");
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = async () => {
    try {
      const template = customTemplate || selectedTemplate;
      const blob = await processPDFsAndDownload(files, template);
      saveAs(blob, "renamed_pdfs.zip");
    } catch (error) {
      console.error("Error downloading files:", error);
      alert("Failed to download files. Make sure the backend server is running.");
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
        <h1 className="text-4xl md:text-5xl font-bold mb-6">GJP PDF Rename</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Intelligent PDF batch renaming tool that extracts invoice information and renames files using customizable templates.
          Upload your PDFs, select a naming template, and download renamed files instantly.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload PDFs</CardTitle>
              <CardDescription>Select one or more PDF files to process</CardDescription>
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
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PDF files only</p>
                </label>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Uploaded Files ({files.length})</h3>
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
                        Processing...
                      </>
                    ) : (
                      "Process Files"
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
                    <CardTitle>Processed Files</CardTitle>
                    <CardDescription>
                      {processedFiles.filter(f => f.status === "success").length} successful,{" "}
                      {processedFiles.filter(f => f.status === "incomplete").length} incomplete,{" "}
                      {processedFiles.filter(f => f.status === "error").length} errors
                    </CardDescription>
                  </div>
                  <Button onClick={downloadAll}>
                    <Download className="mr-2 h-4 w-4" />
                    Download All
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
                            <div>New name: <span className="text-foreground">{pFile.newName}</span></div>
                            {pFile.status === "incomplete" && pFile.missingFields && (
                              <div className="text-amber-600 mt-1">
                                Missing: {pFile.missingFields.join(", ")}
                              </div>
                            )}
                            {pFile.status === "error" && pFile.error && (
                              <div className="text-red-600 mt-1">
                                Error: {pFile.error}
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
              <CardTitle>Template Settings</CardTitle>
              <CardDescription>Choose or create a naming template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Preset Templates</label>
                <div className="space-y-2">
                  {DEFAULT_TEMPLATES.map((template, index) => (
                    <Button
                      key={index}
                      variant={selectedTemplate === template.pattern ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedTemplate(template.pattern);
                        setCustomTemplate("");
                      }}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Custom Template</label>
                <Input
                  placeholder="{buyer} {name} {origin}-{destination}.pdf"
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Available fields: {"{buyer}"}, {"{name}"}, {"{origin}"}, {"{destination}"}, 
                  {"{amount}"}, {"{invoiceNumber}"}, {"{issueDate}"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How it Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  1
                </div>
                <p>Upload PDF invoice files</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  2
                </div>
                <p>Tool extracts invoice information (buyer, passenger, route, amount, etc.)</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  3
                </div>
                <p>Files are renamed based on your template</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  4
                </div>
                <p>Download renamed files individually or as a ZIP</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
