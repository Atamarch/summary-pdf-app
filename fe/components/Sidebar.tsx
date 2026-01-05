'use client';

import React from 'react';
import { Upload, FileText, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SidebarProps, PDFFile } from '@/types';

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  selectedFile,
  onFileSelect,
  onUpload,
  onFileDelete,
  isOpen,
  onToggle
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    }
  };

  const handleDelete = (e: React.MouseEvent, file: PDFFile) => {
    e.stopPropagation();
    onFileDelete(file);
  };

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
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              Files ({files.length})
            </h2>

            <div className="space-y-2">
              {files.map(file => (
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
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(e, file);
                      }}
                      className="p-1 rounded hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
