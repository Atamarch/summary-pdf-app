"use client";

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import dynamic from 'next/dynamic';
import { SummaryPanel } from '@/components/SummaryPanel';
import { uploadPDF, getPDFs, deletePDF, summarizePDF } from '@/services/PDFService';
import { toast } from 'sonner';
import { PDFFile, mapPDFToFile } from '@/types';
import { Loader2 } from 'lucide-react';

const PDFPreview = dynamic(
  () => import('@/components/PDFPreview').then(mod => ({ default: mod.PDFPreview })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    )
  }
);

export default function HomePage() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<PDFFile | null>(null);
  const [summary, setSummary] = useState({
    text: '',
    isLoading: false,
    processing_time_ms: undefined,
    generated_at: undefined

  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPDFs();
  }, []);

  const loadPDFs = async () => {
    setIsLoading(true);

    try {
      const result = await getPDFs({ page: 1, limit: 50 });

      if (result.success && result.data?.data) {
        const mappedFiles = result.data.data.map(mapPDFToFile);
        setFiles(mappedFiles);
      } else {
        toast.error(result.error || 'Failed to load PDFs');
      }
    } catch (error) {
      toast.error('An error occurred while loading PDFs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const toastId = toast.loading('Uploading PDF...');

    try {
      const result = await uploadPDF(formData);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      toast.success('PDF uploaded successfully!', { id: toastId });

      await loadPDFs();

      setSelectedFile({
        id: result.data.id,
        name: result.data.original_filename,
        size: result.data.file_size,
        uploadedAt: new Date(),
      });

    } catch (err: any) {
      toast.error(err.message || 'Failed to upload PDF', { id: toastId });
    }
  };

  const handleFileSelect = (file: PDFFile) => {
    setSelectedFile(file);
    setSummary({
      text: '', isLoading: false, processing_time_ms: undefined,
      generated_at: undefined
    });
  };

  const handleFileDelete = (file: PDFFile) => {
    toast.custom((t) => (
      <div className="bg-white rounded-lg shadow-xl p-4 w-[340px]">
        <p className="font-semibold text-gray-900">
          Delete PDF?
        </p>

        <p className="text-sm text-gray-600 mt-2">
          <span className="font-medium text-gray-900">
            “{file.name}”
          </span>{" "}
          will be permanently deleted and cannot be recovered.
        </p>

        <div className="flex justify-end gap-2 mt-4">
          {/* CANCEL */}
          <button
            onClick={() => toast.dismiss(t)}
            className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-sm"
          >
            Cancel
          </button>

          {/* CONFIRM */}
          <button
            onClick={async () => {
              toast.dismiss(t);

              const loadingToast = toast.loading(
                `Deleting “${file.name}”…`
              );

              try {
                const result = await deletePDF(file.id);

                if (!result.success) {
                  throw new Error(result.error || 'Delete failed');
                }

                if (selectedFile?.id === file.id) {
                  setSelectedFile(null);
                  setSummary({
                    text: '', isLoading: false, processing_time_ms: undefined,
                    generated_at: undefined
                  });
                }

                await loadPDFs();

                toast.success(
                  `“${file.name}” deleted successfully`,
                  { id: loadingToast }
                );
              } catch (err: any) {
                toast.error(
                  err.message || `Failed to delete “${file.name}”`,
                  { id: loadingToast }
                );
              }
            }}
            className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    ));
  };

  const handleSummarize = async () => {
    if (!selectedFile) return;

    setSummary({
      text: '', isLoading: true, processing_time_ms: undefined,
      generated_at: undefined
    });

    const result = await summarizePDF(selectedFile.id);

    if (result.success && result.data) {
      setSummary({
        text: result.data.summary_text,
        isLoading: false,
        processing_time_ms: result.data.processing_time_ms,
        generated_at: result.data.generated_at
      });

      const timeInSeconds = (result.data.processing_time_ms / 1000).toFixed(2);
      toast.success(`Summary generated in ${timeInSeconds}s!`);
    } else {
      setSummary({
        text: '', isLoading: false, processing_time_ms: undefined,
        generated_at: undefined
      });
      toast.error(result.error || 'Failed to generate summary');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        files={files}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        onUpload={handleUpload}
        onFileDelete={handleFileDelete}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <PDFPreview file={selectedFile} />

      <SummaryPanel
        summary={summary}
        onSummarize={handleSummarize}
        hasFile={!!selectedFile}
      />

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-700 font-medium">Loading PDFs...</p>
          </div>
        </div>
      )}
    </div>
  );
}
