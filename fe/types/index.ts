export interface PDFData {
  id: string;
  original_filename: string;
  file_size: number;
  upload_date: string;
  summary?: string | null;
  language?: string;
  output_type?: string;
  summary_status?: 'pending' | 'processing' | 'completed' | 'failed';
  summary_error?: string | null;
  processing_time_ms?: number;
}

export interface Summary {
  text: string;
  isLoading: boolean;
  processing_time_ms?: number;
  generated_at?: string;
  language?: string;
  output_type?: string;
}

export interface SidebarProps {
  files: PDFData[];
  selectedFile: PDFData | null;
  onFileSelect: (file: PDFData) => void;
  onUpload: (file: File) => void;
  onFileDelete: (fileId: PDFData) => void;
  isOpen: boolean;
  onToggle: () => void;
  onOpenHistory: (file: PDFData) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export interface PDFPreviewProps {
  file: PDFData | null;
}

export interface SummaryPanelProps {
  pdfId: string | null;
  onSummarize: (config: { language: string; outputType: string }) => Promise<{ success: boolean; data?: SummaryResponse; error?: string }>;
  hasFile: boolean;
  isGenerating: boolean;
  summaryStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  summaryError?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
}

export interface PDFResponse {
  id: string;
  original_filename: string;
  file_size: number;
  upload_date: string;
  summary?: string | null;
  language?: string;
  output_type?: string;
  summary_status?: 'pending' | 'processing' | 'completed' | 'failed';
  summary_error?: string | null;
  processing_time_ms?: number;
}

export interface PDFListResponse {
  data: PDFResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface SummaryResponse {
  pdf_id: string;
  original_filename: string;
  summary_text: string;
  language: string;
  output_type: string;
  processing_time_ms?: number;
  generated_at?: string;
}

export interface UploadPDFResponse {
  id: string;
  original_filename: string;
  file_size: number;
  upload_date: string;
  message: string;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: 'date_desc' | 'date_asc' | 'a_z' | 'z_a';
  language?: string;
  output_type?: string;
}

export function mapPDFToFile(pdf: PDFResponse): PDFData {
  return {
    id: pdf.id,
    original_filename: pdf.original_filename,
    file_size: pdf.file_size,
    upload_date: pdf.upload_date,
    summary: pdf.summary,
    language: pdf.language,
    output_type: pdf.output_type,
    summary_status: pdf.summary_status,
    summary_error: pdf.summary_error,
    processing_time_ms: pdf.processing_time_ms,
  };
}

export interface PDFLog {
  id: string;
  summary: string;
  language: string;
  output_type: 'paragraph' | 'bullet';
  created_at: string;
}
