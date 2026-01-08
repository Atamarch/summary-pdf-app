'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { PDFPreviewProps } from '@/types';

export const PDFPreview: React.FC<PDFPreviewProps> = ({ file }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPdfUrl(null);
      return;
    }

    const fetchPDF = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/v1/pdfs/${file.id}/view`;
        console.log('Fetching PDF from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to load PDF');
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setPdfUrl(blobUrl);
        setLoading(false);
      } catch (err) {
        console.error('PDF fetch error:', err);
        setError('Failed to load PDF');
        setLoading(false);
      }
    };

    fetchPDF();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [file?.id]);

  if (!file) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <FileText className="w-24 h-24 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No file selected</p>
          <p className="text-sm mt-2">Upload and select a PDF to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="font-semibold text-gray-900 truncate">{file.original_filename}</h2>
        <p className="text-sm text-gray-500 mt-1">PDF Preview</p>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex items-center justify-center">
          {loading && !error && (
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-3 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-600">Loading PDF...</p>
            </div>
          )}

          {error && (
            <div className="text-center text-red-500">
              <FileText className="w-16 h-16 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg"
              title="PDF Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
};