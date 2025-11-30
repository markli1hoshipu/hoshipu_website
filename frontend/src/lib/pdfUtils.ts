import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.mjs';
}

export interface ExtractedInfo {
  name: string | null;
  origin: string | null;
  destination: string | null;
  amount: string | null;
  buyer: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  originalFilename: string;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function extractInfo(text: string, originalFilename: string): ExtractedInfo {
  const nameMatch = text.match(/旅客姓名.*?\n\s*([\S]+)/);
  const fromMatch = text.match(/自[：:]\s*(\S+\s+\S+)/);
  const toMatch = text.match(/至[：:]\s*(\S+\s+\S+)/);
  const amountMatch = text.match(/合计.*?\n.*?(\d+\.\d{2})\s*$/m);
  const buyerMatch = text.match(/购买方名称：(\S+)/);
  const invoiceMatch = text.match(/发票号码[：:]\s*(\d+)/);
  const issueDateMatch = text.match(/填开日期[：:]\s*([0-9]{4}[年/-][0-9]{1,2}[月/-][0-9]{1,2}[日]?)/);

  return {
    name: nameMatch ? nameMatch[1] : null,
    origin: fromMatch ? fromMatch[1].replace(/\s+/g, '') : null,
    destination: toMatch ? toMatch[1].replace(/\s+/g, '') : null,
    amount: amountMatch ? amountMatch[1] : null,
    buyer: buyerMatch ? buyerMatch[1] : null,
    invoiceNumber: invoiceMatch ? invoiceMatch[1] : null,
    issueDate: issueDateMatch ? issueDateMatch[1] : null,
    originalFilename: originalFilename.replace(/\.pdf$/i, ''),
  };
}

export function safeFilename(str: string): string {
  return str.replace(/[\\/:*?"<>|]/g, '_');
}

export interface Template {
  name: string;
  pattern: string;
}

export const DEFAULT_TEMPLATES: Template[] = [
  { name: "行程信息", pattern: "{buyer} {name} {origin}-{destination} {amount}.pdf" },
  { name: "仅发票号", pattern: "{invoiceNumber}.pdf" },
];

export function renderFilename(template: string, values: ExtractedInfo): string {
  let result = template;
  
  const replacements: { [key: string]: string } = {
    '{buyer}': values.buyer || '',
    '{name}': values.name || '',
    '{origin}': values.origin || '',
    '{destination}': values.destination || '',
    '{amount}': values.amount || '',
    '{invoiceNumber}': values.invoiceNumber || '',
    '{issueDate}': values.issueDate || '',
    '{originalFilename}': values.originalFilename || '',
  };
  
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key, 'g'), safeFilename(value));
  }
  
  if (!result.toLowerCase().endsWith('.pdf')) {
    result += '.pdf';
  }
  
  return result;
}

export function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\{(\w+)\}/g);
  if (!matches) return [];
  return matches.map(m => m.slice(1, -1));
}

export function validateRequiredFields(values: ExtractedInfo, template: string): { valid: boolean; missing: string[] } {
  const requiredFields = extractPlaceholders(template);
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    const value = (values as any)[field];
    if (!value || value === '') {
      missing.push(field);
    }
  }
  
  return { valid: missing.length === 0, missing };
}
