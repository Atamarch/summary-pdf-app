'use client';

import React, { useState } from 'react';
import { FileText, Loader2, Copy, Download, Check, Clock, Calendar } from 'lucide-react';
import { SummaryPanelProps } from '@/types';

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  summary,
  onSummarize,
  hasFile
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (summary.text) {
      const cleanText = summary.text.replace(/<mark[^>]*>(.*?)<\/mark>/g, '$1');
      await navigator.clipboard.writeText(cleanText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (summary.text) {
      const cleanText = summary.text.replace(/<mark[^>]*>(.*?)<\/mark>/g, '$1');
      const blob = new Blob([cleanText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `summary-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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

  return (
    <div className="w-80 lg:w-150 bg-white border-l border-gray-200 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>

        <button
          onClick={onSummarize}
          disabled={!hasFile || summary.isLoading}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${!hasFile || summary.isLoading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-sky-700 to-blue-500 text-white rounded-lg hover:bg-gradient-to-r hover:from-blue-600 hover:to-sky-800'
            }`}
        >
          {summary.isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Summary'
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!summary.text && !summary.isLoading ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No summary generated yet</p>
            <p className="text-xs mt-2">Click the button above to generate</p>
          </div>
        ) : summary.isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </div>
        ) : (
          <div className="space-y-4">
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
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-gray-700 leading-relaxed space-y-2 text-sm">
                {summary.text.split('\n').map((line, index) => {
                  if (!line.trim()) return null;
                  const cleanLine = line.replace(/^-\s*/, '');
                  return (
                    <p key={index} className="flex">
                      <span className="mr-2 text-blue-500 flex-shrink-0">•</span>
                      <span className="flex-1">{renderHighlightedText(cleanLine)}</span>
                    </p>
                  );
                })}
              </div>
            </div>
            
            {(summary.processing_time_ms || summary.generated_at) && (
              <div className="space-y-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
                {summary.processing_time_ms && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Loading time: {(summary.processing_time_ms / 1000).toFixed(1)}s</span>
                  </div>
                )}
                {summary.generated_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Generated: {formatDate(new Date(summary.generated_at))}</span>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};