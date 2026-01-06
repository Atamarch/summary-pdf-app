"use client";

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SummaryPanel } from '@/components/SummaryPanel';
import { PDFPreview } from '@/components/PDFPreview';
import { PDFHistoryModal } from '@/components/PDFModal';
import { uploadPDF, getPDFs, deletePDF, summarizePDF, getPDFLogs } from '@/services/PDFService';
import { toast } from 'sonner';
import { PDFFile, mapPDFToFile, PDFLog } from '@/types';

export default function HomePage() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<PDFFile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFile, setHistoryFile] = useState<PDFFile | null>(null);
  const [historyLogs, setHistoryLogs] = useState<PDFLog[]>([]);

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
  };

  const handleFileDelete = (file: PDFFile) => {
    toast.custom((t) => (
      <div className="bg-white rounded-lg shadow-xl p-4 w-[340px] border border-gray-200">
        <p className="font-semibold text-gray-900">
          Delete PDF?
        </p>

        <p className="text-sm text-gray-600 mt-2">
          <span className="font-medium text-gray-900">
            "{file.name}"
          </span>{" "}
          will be permanently deleted and cannot be recovered.
        </p>

        <div className="flex justify-end gap-2 mt-4">
          {/* CANCEL */}
          <button
            onClick={() => toast.dismiss(t)}
            className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-sm text-gray-700 font-medium"
          >
            Cancel
          </button>

          {/* CONFIRM */}
          <button
            onClick={async () => {
              toast.dismiss(t);

              const loadingToast = toast.loading(
                `Deleting "${file.name}"…`
              );

              try {
                const result = await deletePDF(file.id);

                if (!result.success) {
                  throw new Error(result.error || 'Delete failed');
                }

                if (selectedFile?.id === file.id) {
                  setSelectedFile(null);
                }

                await loadPDFs();

                toast.success(
                  `"${file.name}" deleted successfully`,
                  { id: loadingToast }
                );
              } catch (err: any) {
                toast.error(
                  err.message || `Failed to delete "${file.name}"`,
                  { id: loadingToast }
                );
              }
            }}
            className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    ));
  };

  const handleSummarize = async (config: { language: string; outputType: string }) => {
    if (!selectedFile) return;

    setIsGenerating(true);

    try {
      const result = await summarizePDF(selectedFile.id, {
        language: config.language,
        output_type: config.outputType
      });

      if (result.success && result.data) {
        const timeInSeconds = (result.data.processing_time_ms / 1000).toFixed(2);
        toast.success(`Summary generated in ${timeInSeconds}s!`);

        // Trigger refresh di SummaryPanel via pdfId change
        setSelectedFile({ ...selectedFile });
      } else {
        toast.error(result.error || 'Failed to generate summary');
      }
    } catch (error) {
      toast.error('An error occurred while generating summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenHistory = async (file: PDFFile) => {
    try {
      setHistoryOpen(true);
      setHistoryFile(file);

      const res = await getPDFLogs(file.id);

      if (res.success) {
        setHistoryLogs(res.data.data);
      } else {
        toast.error('Failed to load summary history');
      }
    } catch {
      toast.error('Failed to load summary history');
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
        onOpenHistory={handleOpenHistory}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <PDFPreview file={selectedFile} />

      <SummaryPanel
        pdfId={selectedFile?.id || null}
        onSummarize={handleSummarize}
        hasFile={!!selectedFile}
        isGenerating={isGenerating}
      />

      <PDFHistoryModal
        isOpen={historyOpen}
        logs={historyLogs}
        onClose={() => {
          setHistoryOpen(false);
          setHistoryFile(null);
          setHistoryLogs([]);
        }}
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