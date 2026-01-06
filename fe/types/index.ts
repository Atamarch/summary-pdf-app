export interface PDFFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  summary?: string | null;
  language?: string;
  output_type?: string;
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
  files: PDFFile[];
  selectedFile: PDFFile | null;
  onFileSelect: (file: PDFFile) => void;
  onUpload: (file: File) => void;
  onFileDelete: (fileId: PDFFile) => void;
  isOpen: boolean;
  onToggle: () => void;
  onOpenHistory: (file: PDFFile) => void;
}

export interface PDFPreviewProps {
  file: PDFFile | null;
}

export interface SummaryPanelProps {
  summary: Summary;
  onSummarize: (config: { language: string; outputType: string }) => void;
  hasFile: boolean;
}

export interface PDFResponse {
  id: string;
  original_filename: string;
  file_size: number;
  upload_date: string;
  summary?: string | null;
  language?: string;
  output_type?: string;

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
  processing_time_ms?: number;
  generated_at?: string;
}

export interface UploadPDFResponse {
  id: string;
  original_filename: string;
  file_size: number;
  message: string;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export function mapPDFToFile(pdf: PDFResponse): PDFFile {
  return {
    id: pdf.id,
    name: pdf.original_filename,
    size: pdf.file_size,
    uploadedAt: new Date(pdf.upload_date),
    summary: pdf.summary,
    language: pdf.language,
    output_type: pdf.output_type,
  };
}

export interface PDFLog {
  id: string;
  summary: string;
  language: string;
  output_type: 'paragraph' | 'bullet';
  created_at: string;
}
