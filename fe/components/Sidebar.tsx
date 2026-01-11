'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, ChevronLeft, ChevronRight, History, Search } from 'lucide-react';
import { toast } from 'sonner';
import { SidebarProps, PDFData } from '@/types';
import { getPDFLogs } from '@/services/PDFService';

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  selectedFile,
  onFileSelect,
  onUpload,
  onFileDelete,
  onOpenHistory,
  onSearch,
  searchQuery,
  isOpen,
  onToggle,
  currentPage,
  totalPages,
  onPageChange
}) => {
  const [filesWithHistory, setFilesWithHistory] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkHistoryData = async () => {
      const newFilesWithHistory = new Set<string>();
      
      for (const file of files) {
        try {
          const result = await getPDFLogs(file.id, { page: 1, limit: 1 });
          if (result.success && result.data?.data && result.data.data.length > 0) {
            newFilesWithHistory.add(file.id);
          }
        } catch (error) {
        }
      }
      
      setFilesWithHistory(newFilesWithHistory);
    };

    if (files.length > 0) {
      checkHistoryData();
    }
  }, [files]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file only.');
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast.error(`File size (${fileSizeMB} MB) exceeds the maximum limit of 10 MB. Please choose a smaller file.`);
      e.target.value = ''; // Reset input
      return;
    }

    onUpload(file);
  };

  const handleDelete = (e: React.MouseEvent, file: PDFData) => {
    e.stopPropagation();
    onFileDelete(file);
  };

  const filteredFiles = files.filter(file =>
    file.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`relative bg-white border-r border-gray-200 h-screen flex flex-col
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-80' : 'w-14'}
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-10 bg-white border-r-3 rounded-full p-1 shadow"
      >
        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* Content */}
      {isOpen && (
        <>
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">
              PDF Summary
            </h1>

            <label className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-sky-700 to-blue-500 text-white rounded-lg hover:bg-gradient-to-r hover:from-blue-600 hover:to-sky-800 cursor-pointer">
              <Upload className="w-5 h-5 mr-2" />
              <span className="font-medium">Upload PDF</span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            
            <p className="text-xs text-gray-500 mt-2 text-center">
              Maximum file size: 10 MB
            </p>

            <div className="relative mt-5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-auto mb-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search PDF Files..."
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              Files ({filteredFiles.length})
            </h2>

            <div className="space-y-2 w-71">
              {filteredFiles.map(file => (
                <div
                  key={file.id}
                  onClick={() => onFileSelect(file)}
                  className={`w-full text-left p-3 rounded-lg transition-colors cursor-pointer
      ${selectedFile?.id === file.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100'}
    `}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.original_filename}</p>
                      <p className="text-xs text-gray-500">
                        {(file.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>

                    {filesWithHistory.has(file.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenHistory(file);
                        }}
                        className="p-1 rounded hover:bg-yellow-300"
                      >
                        <History className="w-4 h-auto text-gray-400 hover:text-yellow-600" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(e, file);
                      }}
                      className="p-1 rounded hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-auto text-gray-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between px-2">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg ${
                    currentPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg ${
                    currentPage === totalPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
