'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileText, Loader2, Copy, Download, Check, Clock, Calendar, X, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { PDFData, SummaryPanelProps } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  pdfId,
  onSummarize,
  hasFile,
  isGenerating,
  summaryStatus,
  summaryError,
  onRetry,
  onCancel
}) => {
  const [pdfData, setPdfData] = useState<PDFData | null>(null);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [config, setConfig] = useState({
    language: 'auto',
    outputType: 'paragraph',
  });

  const hasSummary = !!(pdfData?.summary) || summaryStatus === 'completed';

  // Fetch PDF data when pdfId changes
  useEffect(() => {
    if (pdfId) {
      fetchPDFData();
    } else {
      setPdfData(null);
    }
  }, [pdfId]);

  // Update local state when props change
  useEffect(() => {
    if (pdfData && summaryStatus) {
      // Update pdfData dengan status terbaru dari props
      setPdfData(prev => prev ? {
        ...prev,
        summary_status: summaryStatus,
        summary_error: summaryError
      } : null);
      
      // Jika status berubah ke completed, fetch ulang data untuk get summary terbaru
      if (summaryStatus === 'completed' && pdfData.summary_status !== 'completed') {
        fetchPDFData();
      }
    }
  }, [summaryStatus, summaryError]);

  // Handle retry - simple call parent retry
  const handleRetry = async () => {
    if (onRetry) {
      await onRetry();
    } else {
      await handleGenerateSummary();
    }
  };

  const fetchPDFData = async () => {
    if (!pdfId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/v1/pdfs/${pdfId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch PDF data");
      }

      const result = await response.json();
      setPdfData(result);

      // Update config from PDF data
      setConfig({
        language: result.language || 'auto',
        outputType: result.output_type === 'bullet' || result.output_type === 'pointer' ? 'pointer' : 'paragraph',
      });
    } catch (error) {
      console.error("Fetch PDF data error:", error);
      toast.error("Failed to load PDF data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (pdfData?.summary) {
      const cleanText = pdfData.summary.replace(/<mark[^>]*>(.*?)<\/mark>/g, '$1');
      await navigator.clipboard.writeText(cleanText);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (pdfData?.summary) {
      const cleanText = pdfData.summary.replace(/<mark[^>]*>(.*?)<\/mark>/g, '$1');
      const blob = new Blob([cleanText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `summary-${pdfData.original_filename}-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Summary downloaded!");
    }
  };

  const handleGenerateSummary = async () => {
    const result = await onSummarize(config);

    if (result.success && result.data) {
      setProcessingTime(result.data.processing_time_ms ?? null);

      // Update pdfData langsung dari response
      setPdfData(prev => prev ? {
        ...prev,
        summary: result.data!.summary_text,
        language: result.data!.language,
        output_type: result.data!.output_type,
      } : null);
    }
  };

  const formatDate = (date: string) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Parse manual dari string "2026-01-08T12:34"
    const [datePart, timePart] = date.slice(0, 16).split('T');
    const [year, month, day] = datePart.split('-');

    const monthName = months[parseInt(month) - 1];

    return `${parseInt(day)} ${monthName} ${year}, ${timePart}`;
  };

  const renderHighlightedText = (text: string) => {
    const parts = text.split(/(<mark[^>]*>.*?<\/mark>)/g);

    return parts.map((part, index) => {
      const markMatch = part.match(/<mark[^>]*>(.*?)<\/mark>/);
      if (markMatch) {
        return (
          <mark
            key={index}
            className="bg-blue-500 text-white px-1 rounded"
          >
            {markMatch[1]}
          </mark>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const getLanguageLabel = (lang: string) => {
    const labels: Record<string, string> = {
      'auto': 'Auto Detect',
      'id': 'Indonesia',
      'en': 'English',
      'ja': 'Japanese'
    };
    return labels[lang] || lang;
  };

  const getOutputTypeLabel = (type: string) => {
    return type === 'paragraph' ? 'Paragraph' : 'Bullet Points';
  };

  const getButtonConfig = () => {
    // Prioritas: props summaryStatus > pdfData.summary_status
    const currentStatus = summaryStatus || pdfData?.summary_status || 'pending';

    if (currentStatus === 'processing' || isGenerating) {
      return {
        text: 'Cancel Generation',
        onClick: onCancel,
        disabled: false,
        className: 'bg-gradient-to-r from-red-500 via-red-600 to-red-500 hover:from-red-600 hover:to-red-600 text-white transition-colors'
      };
    } else if (currentStatus === 'failed') {
      return {
        text: 'Retry Generate',
        onClick: handleRetry,
        disabled: false,
        className: 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 hover:from-yellow-500 hover:to-yellow-500 text-white transition-colors'
      };
    } else {
      return {
        text: isGenerating ? 'Generating...' : 'Generate Summary',
        onClick: handleGenerateSummary,
        disabled: !hasFile || isGenerating,
        className: !hasFile || isGenerating
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-sky-700 to-blue-500 text-white hover:from-blue-600 hover:to-sky-800'
      };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className="relative w-80 lg:w-150 bg-white border-l border-gray-200 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsOpen(true)}
            disabled={!hasFile}
            className={`p-4 rounded-lg transition-colors ${!hasFile
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
          >
            <Settings className="transition-transform duration-500 hover:rotate-90" />
          </button>
          <button
            onClick={buttonConfig.onClick}
            disabled={buttonConfig.disabled}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${buttonConfig.className}`}
          >
            {buttonConfig.text === 'Generating...' ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {buttonConfig.text}
              </>
            ) : (
              buttonConfig.text
            )}
          </button>
        </div>

        {/* Status Info Panel */}
        {(summaryStatus || pdfData?.summary_status) && (summaryStatus !== 'pending' && pdfData?.summary_status !== 'pending') && (
          <div className="mt-4 p-3 rounded-lg border bg-gray-50">
            {((summaryStatus === 'processing') || (pdfData?.summary_status === 'processing') || isGenerating) && (
              <div className="flex items-center text-blue-600">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm font-medium">Generating summary in progress...</span>
              </div>
            )}
            {((summaryStatus === 'completed') || (pdfData?.summary_status === 'completed')) && (
              <div className="flex items-center text-green-600">
                <Check className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Summary generated successfully</span>
              </div>
            )}
            {((summaryStatus === 'failed') || (pdfData?.summary_status === 'failed')) && (
              <div className="text-red-600">
                <div className="flex items-center mb-1">
                  <X className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Summary generation failed</span>
                </div>
                {(summaryError || pdfData?.summary_error) && (
                  <p className="text-xs text-red-500">{summaryError || pdfData?.summary_error}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
          </div>
        ) : !hasSummary && !isGenerating ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No summary generated yet</p>
            <p className="text-xs mt-2">Click the button above to generate</p>
          </div>
        ) : isGenerating ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Config Info */}
            {pdfData && (pdfData.language || pdfData.output_type) && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <Settings className="w-3.5 h-3.5" />
                  <span>
                    {getLanguageLabel(pdfData.language || 'auto')} • {getOutputTypeLabel(pdfData.output_type || 'paragraph')}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Salin
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>

            {/* Summary Content */}
            {pdfData?.summary && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-gray-700 leading-relaxed space-y-2 text-sm">
                  {pdfData.output_type === 'paragraph' ? (
                    pdfData.summary.split('\n\n').map((paragraph, index) => {
                      if (!paragraph.trim()) return null;
                      return (
                        <p key={index} className="mb-3">
                          {renderHighlightedText(paragraph)}
                        </p>
                      );
                    })
                  ) : (
                    pdfData.summary.split('\n').map((line, index) => {
                      if (!line.trim()) return null;
                      const cleanLine = line.replace(/^-\s*/, '');
                      return (
                        <p key={index} className="flex">
                          <span className="mr-2 text-blue-500 flex-shrink-0">•</span>
                          <span className="flex-1">{renderHighlightedText(cleanLine)}</span>
                        </p>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Processing Info */}
            {(pdfData?.upload_date || processingTime !== null) && (
              <div className="space-y-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
                {pdfData?.upload_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Uploaded: {formatDate(pdfData.upload_date)}</span>
                  </div>
                )}
                {processingTime !== null && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Processing Time: {Math.round(processingTime / 1000)}s</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Settings Modal */}
        {isOpen && (
          <div className="absolute top-35 right-4 z-30">
            <div className="w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Summary Settings
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X />
                </button>
              </div>

              {/* Language */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Language
                </label>
                <select
                  value={config.language}
                  onChange={(e) =>
                    setConfig({ ...config, language: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="auto">Auto (Follow PDF)</option>
                  <option value="id">Indonesia</option>
                  <option value="en">English</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>

              {/* Output Type */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Output Type
                </label>
                <select
                  value={config.outputType}
                  onChange={(e) =>
                    setConfig({ ...config, outputType: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="paragraph">Paragraph</option>
                  <option value="pointer">Bullet / Pointer</option>
                </select>
              </div>

              {/* Footer */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    toast.success('Settings saved');
                  }}
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};