const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6101';

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
    insurance?: string | null;
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

// ---------------------------------------------------------------------------
// GJP 发票导出 — flight e-invoice PDFs -> YUHANG SAP Excel
// ---------------------------------------------------------------------------
export interface GjpInvoiceInfo {
  category?: string | null;
  intl_dom?: string | null;
  name?: string | null;
  depart_date?: string | null;
  routing?: string | null;
  route_cn?: string | null;
  flight_no?: string | null;
  caac_fund?: number | null;
  total?: number | null;
  invoice_number?: string | null;
  buyer?: string | null;
  issue_date?: string | null;
  ticket_number?: string | null;
  unmapped_airports?: string[];
}

export interface GjpInvoiceResult {
  filename: string;
  info: GjpInvoiceInfo;
  status: 'success' | 'incomplete' | 'error';
  missing_fields?: string[];
  error?: string;
}

export interface GjpInvoiceResponse {
  results: GjpInvoiceResult[];
}

export async function processGjpInvoices(files: File[]): Promise<GjpInvoiceResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${API_BASE_URL}/api/gjp-invoice/process`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

export async function exportGjpInvoices(files: File[]): Promise<Blob> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${API_BASE_URL}/api/gjp-invoice/export`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.blob();
}

// ---------------------------------------------------------------------------
// AE 欠条报表 updater — merge QFF daily-IOU files into the AE ledger
// ---------------------------------------------------------------------------
export interface AeQffReport {
  total: number;
  added: number;
  aggregated: number;
  new_debtors: number;
  duplicates: number;
  new_days?: number;
  new_day_list?: string[];
  new_groups?: number;
  new_group_names?: string[];
  skipped: { iou_no: string; reason: string }[];
  new_debtor_names: string[];
}

export interface AeQffMergeResponse {
  report: AeQffReport;
  filename: string;
  file_base64: string;
}

// Hard caps mirrored on the backend; keep in sync with ae_qff_router.py.
export const AE_MAX_BYTES = 512 * 1024; // 512 KB
export const QFF_MAX_BYTES = 256 * 1024; // 256 KB

export async function mergeAeQff(
  aeFile: File,
  qffFiles: File[],
  timeoutMs = 120000,
): Promise<AeQffMergeResponse> {
  const formData = new FormData();
  formData.append('ae_file', aeFile);
  qffFiles.forEach((f) => formData.append('qff_files', f));

  // Abort instead of spinning forever if the backend hangs / is killed.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/ae-qff/merge`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('请求超时：服务器长时间无响应（可能文件过大导致后端繁忙）。请稍后重试，或缩小文件。');
    }
    throw new Error('无法连接后端，请检查网络或稍后重试。');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const err = await response.json();
      detail = err.error || err.detail || detail;
    } catch {}
    throw new Error(detail);
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

export interface PdfTemplate {
  id: number;
  name: string;
  template_string: string;
  created_at: string;
  updated_at: string;
}

export async function getAllPdfTemplates(): Promise<PdfTemplate[]> {
  const response = await fetch(`${API_BASE_URL}/api/pdf-templates`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
}

export async function createPdfTemplate(name: string, template_string: string, password: string): Promise<PdfTemplate> {
  const response = await fetch(`${API_BASE_URL}/api/pdf-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, template_string, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create template');
  }
  return response.json();
}

export async function updatePdfTemplate(id: number, password: string, name?: string, template_string?: string): Promise<PdfTemplate> {
  const response = await fetch(`${API_BASE_URL}/api/pdf-templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, template_string, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update template');
  }
  return response.json();
}

export async function deletePdfTemplate(id: number, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/pdf-templates/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete template');
  }
}

export interface TravelTemplate {
  id: number;
  name: string;
  description?: string;
  config_json: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TravelAirline {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TravelAirport {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getAllTravelTemplates(): Promise<TravelTemplate[]> {
  const response = await fetch(`${API_BASE_URL}/api/qff-travel/templates`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
}

export async function createTravelTemplate(name: string, description: string, config_json: string, password: string): Promise<TravelTemplate> {
  const response = await fetch(`${API_BASE_URL}/api/qff-travel/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, config_json, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create template');
  }
  return response.json();
}

export async function updateTravelTemplate(id: number, password: string, name?: string, description?: string, config_json?: string, is_active?: boolean): Promise<TravelTemplate> {
  const response = await fetch(`${API_BASE_URL}/api/qff-travel/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, config_json, is_active, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update template');
  }
  return response.json();
}

export async function deleteTravelTemplate(id: number, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/qff-travel/templates/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete template');
  }
}

export async function getAllTravelAirlines(): Promise<TravelAirline[]> {
  const response = await fetch(`${API_BASE_URL}/api/qff-travel/airlines`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
}

export async function createTravelAirline(code: string, name: string, password: string): Promise<TravelAirline> {
  const response = await fetch(`${API_BASE_URL}/api/qff-travel/airlines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, name, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create airline');
  }
  return response.json();
}

export async function updateTravelAirline(id: number, password: string, code?: string, name?: string, is_active?: boolean): Promise<TravelAirline> {
  const response = await fetch(`${API_BASE_URL}/api/qff-travel/airlines/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, name, is_active, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update airline');
  }
  return response.json();
}

export async function deleteTravelAirline(id: number, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/qff-travel/airlines/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete airline');
  }
}

export async function getAllTravelAirports(): Promise<TravelAirport[]> {
  const response = await fetch(`${API_BASE_URL}/api/qff-travel/airports`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
}

export async function createTravelAirport(code: string, name: string, password: string): Promise<TravelAirport> {
  const response = await fetch(`${API_BASE_URL}/api/qff-travel/airports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, name, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create airport');
  }
  return response.json();
}

export async function updateTravelAirport(id: number, password: string, code?: string, name?: string, is_active?: boolean): Promise<TravelAirport> {
  const response = await fetch(`${API_BASE_URL}/api/qff-travel/airports/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, name, is_active, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update airport');
  }
  return response.json();
}

export async function deleteTravelAirport(id: number, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/qff-travel/airports/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete airport');
  }
}
