const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ProcessedPDFResult {
  original_name: string;
  new_name: string;
  extracted_info: {
    name?: string | null;
    origin?: string | null;
    destination?: string | null;
    amount?: string | null;
    buyer?: string | null;
    invoice_number?: string | null;
    issue_date?: string | null;
  };
  status: 'success' | 'incomplete' | 'error';
  missing_fields?: string[];
  error?: string;
}

export interface ProcessPDFsResponse {
  results: ProcessedPDFResult[];
}

export async function processPDFs(files: File[], template: string): Promise<ProcessPDFsResponse> {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  formData.append('template', template);
  
  const response = await fetch(`${API_BASE_URL}/api/pdf/process`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}

export async function processPDFsAndDownload(files: File[], template: string): Promise<Blob> {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  formData.append('template', template);
  
  const response = await fetch(`${API_BASE_URL}/api/pdf/process-and-download`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.blob();
}

export async function getTemplates(): Promise<{ templates: Record<string, string> }> {
  const response = await fetch(`${API_BASE_URL}/api/pdf/templates`);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}
