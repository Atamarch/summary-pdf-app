"use client";

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SummaryPanel } from '@/components/SummaryPanel';
import { PDFPreview } from '@/components/PDFPreview';
import { PDFHistoryModal } from '@/components/PDFModal';
import { uploadPDF, getPDFs, deletePDF, summarizePDF, getPDFLogs, cancelSummarization } from '@/services/PDFService';
import { toast } from 'sonner';
import { PDFData, mapPDFToFile, PDFLog } from '@/types';

export default function HomePage() {
  const [files, setFiles] = useState<PDFData[]>([]);
  const [selectedFile, setSelectedFile] = useState<PDFData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFile, setHistoryFile] = useState<PDFData | null>(null);
  const [historyLogs, setHistoryLogs] = useState<PDFLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryStatus, setSummaryStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [pollIntervalId, setPollIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [currentProcessingTime, setCurrentProcessingTime] = useState<number | null>(null);

  useEffect(() => {
    loadPDFs();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
      }
    };
  }, [pollIntervalId]);

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

  const handleRetrySummary = async () => {
    if (!selectedFile) return;

    setSummaryStatus('processing');
    setSummaryError(null);
    setIsGenerating(true);
    setCurrentProcessingTime(null); // Reset processing time

    try {
      const result = await summarizePDF(selectedFile.id, {
        language: selectedFile.language || 'auto',
        output_type: selectedFile.output_type || 'paragraph'
      });

      if (result.success && result.data) {
        // Jika ada processing_time_ms, berarti sync response
        if (result.data.processing_time_ms) {
          // Set processing time untuk display
          setCurrentProcessingTime(result.data.processing_time_ms);
          
          // Show immediate success message dengan processing time
          const timeInSeconds = (result.data.processing_time_ms / 1000).toFixed(2);
          toast.success(`Summary generated in ${timeInSeconds}s!`);
          
          // Set status completed langsung
          setSummaryStatus('completed');
          setIsGenerating(false);
          
          // Update selectedFile dengan summary data
          setSelectedFile(prev => prev ? {
            ...prev,
            summary: result.data.summary_text,
            summary_status: 'completed',
            language: result.data.language,
            output_type: result.data.output_type
          } : null);
        } else {
          // Start polling jika async
          pollSummaryStatus(selectedFile.id);
        }
      } else {
        setSummaryStatus('failed');
        setSummaryError(result.error || 'Retry failed');
        toast.error(result.error || 'Retry failed');
      }
    } catch (error) {
      setSummaryStatus('failed');
      setSummaryError('Retry failed');
      toast.error('Retry failed');
    } finally {
      if (summaryStatus !== 'completed') {
        setIsGenerating(false);
      }
    }
  };

  const stopPolling = async () => {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      setPollIntervalId(null);
    }
    
    // Call cancel API if there's a selected file
    if (selectedFile) {
      try {
        const result = await cancelSummarization(selectedFile.id);
        if (result.success) {
          toast.success('Summarization cancelled');
        } else {
          toast.error(result.error || 'Failed to cancel');
        }
      } catch (error) {
        toast.error('Failed to cancel summarization');
      }
    }
    
    setSummaryStatus('pending');
    setSummaryError(null);
    setCurrentProcessingTime(null);
    setIsGenerating(false);
  };

  const pollSummaryStatus = (pdfId: string) => {
    // Clear existing polling first
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
    }

    const intervalId = setInterval(async () => {
      try {
        const result = await getPDFs({ page: 1, limit: 50 });
        if (result.success && result.data?.data) {
          const pdf = result.data.data.find((p: any) => p.id === pdfId);
          if (pdf) {
            console.log('Polling status:', pdf.summary_status, pdf.summary_error); // Debug log
            
            setSummaryStatus(pdf.summary_status);
            if (pdf.summary_error) {
              setSummaryError(pdf.summary_error);
            }
            
            // Update selectedFile dengan data terbaru
            if (selectedFile?.id === pdfId) {
              setSelectedFile(prev => prev ? { ...prev, ...pdf } : null);
            }
            
            // Stop polling jika selesai
            if (pdf.summary_status === 'completed') {
              clearInterval(intervalId);
              setPollIntervalId(null);
              setIsGenerating(false);
              
              // Show success message dengan processing time jika ada
              toast.success('Summary generated successfully!');
            } else if (pdf.summary_status === 'failed') {
              clearInterval(intervalId);
              setPollIntervalId(null);
              setIsGenerating(false);
              
              // Show error message
              toast.error(pdf.summary_error || 'Summary generation failed');
            }
          }
        }
      } catch (error) {
        console.error('Error polling summary status:', error);
      }
    }, 3000); // Poll every 3 seconds

    setPollIntervalId(intervalId);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
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
        original_filename: result.data.original_filename,
        file_size: result.data.file_size,
        upload_date: result.data.upload_date,
      });

    } catch (err: any) {
      toast.error(err.message || 'Failed to upload PDF', { id: toastId });
    }
  };

  const handleFileSelect = (file: PDFData) => {
    // Stop any existing polling when switching files
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      setPollIntervalId(null);
    }
    
    setSelectedFile(file);
    
    // Set initial status based on file data
    setSummaryStatus(file.summary_status || 'pending');
    setSummaryError(file.summary_error || null);
    setCurrentProcessingTime(null); // Reset processing time saat ganti file
    
    // If file is currently processing, start polling
    if (file.summary_status === 'processing') {
      setIsGenerating(true);
      pollSummaryStatus(file.id);
    } else {
      setIsGenerating(false);
    }
  };

  const handleFileDelete = (file: PDFData) => {
    toast.custom((t) => (
      <div className="bg-white rounded-lg shadow-xl p-4 w-[340px] border border-gray-200">
        <p className="font-semibold text-gray-900">
          Delete PDF?
        </p>

        <p className="text-sm text-gray-600 mt-2">
          <span className="font-medium text-gray-900">
            "{file.original_filename}"
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
                `Deleting "${file.original_filename}"…`
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
                  `"${file.original_filename}" deleted successfully`,
                  { id: loadingToast }
                );
              } catch (err: any) {
                toast.error(
                  err.message || `Failed to delete "${file.original_filename}"`,
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
    if (!selectedFile) return { success: false, error: 'No file selected' };

    setSummaryStatus('processing');
    setSummaryError(null);
    setIsGenerating(true);
    setCurrentProcessingTime(null); // Reset processing time

    try {
      const result = await summarizePDF(selectedFile.id, {
        language: config.language,
        output_type: config.outputType
      });

      if (result.success && result.data) {
        // Jika ada processing_time_ms, berarti sync response
        if (result.data.processing_time_ms) {
          // Set processing time untuk display
          setCurrentProcessingTime(result.data.processing_time_ms);
          
          // Show immediate success message dengan processing time
          const timeInSeconds = (result.data.processing_time_ms / 1000).toFixed(2);
          toast.success(`Summary generated in ${timeInSeconds}s!`);
          
          // Set status completed langsung
          setSummaryStatus('completed');
          setIsGenerating(false);
          
          // Update selectedFile dengan summary data
          setSelectedFile(prev => prev ? {
            ...prev,
            summary: result.data.summary_text,
            summary_status: 'completed',
            language: result.data.language,
            output_type: result.data.output_type
          } : null);
          
          // ✅ Return result dengan processing_time_ms untuk SummaryPanel
          return { success: true, data: result.data };
        } else {
          // Jika tidak ada processing_time_ms, berarti async processing
          // Start polling untuk monitor status
          pollSummaryStatus(selectedFile.id);
          return { success: true, data: result.data };
        }
      } else {
        setSummaryStatus('failed');
        setSummaryError(result.error || 'Failed to generate summary');
        toast.error(result.error || 'Failed to generate summary');
        return { success: false, error: result.error || 'Failed to generate summary' };
      }
    } catch (error) {
      setSummaryStatus('failed');
      setSummaryError('An error occurred while generating summary');
      toast.error('An error occurred while generating summary');
      return { success: false, error: 'An error occurred while generating summary' };
    } finally {
      // Only set isGenerating false if not completed above
      if (summaryStatus !== 'completed') {
        setIsGenerating(false);
      }
    }
  };

  const handleOpenHistory = async (file: PDFData) => {
    try {
      setHistoryOpen(true);
      setHistoryFile(file);
      setHistoryLogs([]); // Reset logs

      const res = await getPDFLogs(file.id);

      if (res.success) {
        setHistoryLogs(res.data?.data || []);
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
        onSearch={handleSearch}
        searchQuery={searchQuery}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <PDFPreview file={selectedFile} />

      <SummaryPanel
        pdfId={selectedFile?.id || null}
        onSummarize={handleSummarize}
        hasFile={!!selectedFile}
        isGenerating={isGenerating}
        summaryStatus={summaryStatus}
        summaryError={summaryError}
        onRetry={handleRetrySummary}
        onCancel={stopPolling}
        currentProcessingTime={currentProcessingTime}
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