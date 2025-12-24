'use client'

import React, { useState, ChangeEvent } from 'react';
import { Upload, FileText, Loader2, Download, AlertCircle, Trash2, Languages, HardDrive, NotepadText } from 'lucide-react';

interface SummaryResponse {
  summary: string;
  file_name: string;
  text_length: number;
  detected_language: {
    code: string;
    name: string;
  };
}

export default function PDFSummarizer() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [detectedLanguage, setDetectedLanguage] = useState<{ code: string; name: string } | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setFileSize(selectedFile.size);
      setError('');
      setSummary('');
      setDetectedLanguage(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/summarize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data: SummaryResponse = await response.json();
      setSummary(data.summary);
      setDetectedLanguage(data.detected_language);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace('.pdf', '')}_summary.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, i) => {
      if (line.trim()) {
        const processedLine = line
          .split(/(<mark[^>]*>.*?<\/mark>|\*\*.*?\*\*)/)
          .map((part, j) => {
            if (part.includes('<mark')) {
              const content = part.match(/>(.+?)</)?.[1] || '';
              return (
                <mark
                  key={j}
                  style={{ backgroundColor: '#2196F3', color: 'white' }}
                  className="px-1 py-0.5 rounded"
                >
                  {content}
                </mark>
              );
            }
            return part;
          });

        elements.push(
          <p key={i} className="mb-3 text-gray-700 leading-relaxed">
            {processedLine}
          </p>
        );
        return;
      }

      elements.push(<br key={i} />);
    });

    return elements;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800 to-slate-700">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-b from-slate-700 to-slate-500 rounded-2xl mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">PDF Summarizer</h1>
          <p className="text-slate-400 text-lg">
            Upload a PDF and get an AI-powered summary in seconds
          </p>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl">
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-8">
            <div
              className="bg-slate-500 p-1 mb-2 rounded-xl"
              style={{
                boxShadow:
                  'inset 0 0px 10px rgba(0, 0, 0, 1), inset 0 0px 6px rgba(0, 0, 0, 0.5)',
              }}
            >
              <p className="text-slate-300 text-center font-bold">Upload File</p>
            </div>
            <div
              className="bg-slate-500 p-1 mb-2 rounded-xl"
              style={{
                boxShadow:
                  'inset 0 0px 10px rgba(0, 0, 0, 1), inset 0 0px 6px rgba(0, 0, 0, 0.5)',
              }}
            >
              <p className="text-slate-300 text-center font-bold">Summary Result</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div
              className="bg-gray-100 rounded-2xl p-8 flex flex-col"
              style={{
                boxShadow:
                  'inset 0 0px 10px rgba(0, 0, 0, 1), inset 0 0px 6px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div className="flex-1">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-slate-600 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 m-auto mb-4" />
                    <p className="text-gray-700 font-medium mb-2">
                      {fileName || 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-sm text-gray-500">PDF files only (Max 5MB)</p>
                  </label>
                </div>

                {error && (
                  <div className="mt-4 flex items-center gap-2 bg-red-50 text-red-700 p-4 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4 space-y-4">
                {fileName && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-green-700" />
                        <span className="text-green-900 font-medium text-sm">
                          {fileName}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setFile(null);
                          setFileName('');
                          setFileSize(0);
                          setSummary('');
                          setDetectedLanguage(null);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* File Info */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-4 h-4" />
                        <span>{formatFileSize(fileSize)}</span>
                      </div>
                      {detectedLanguage && (
                        <div className="flex items-center gap-1">
                          <Languages className="w-4 h-4" />
                          <span>{detectedLanguage.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!file || loading}
                  className="w-full bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Summary...
                    </>
                  ) : (
                    'Generate Summary'
                  )}
                </button>
              </div>
            </div>

            {/* Summary Section */}
            <div
              className="bg-gray-100 rounded-2xl shadow-xl p-8 min-h-[500px] max-h-[600px] overflow-y-auto"
              style={{
                boxShadow:
                  'inset 0 0px 10px rgba(0, 0, 0, 1), inset 0 0px 6px rgba(0, 0, 0, 0.5)',
              }}
            >
              {summary ? (
                <>
                  <div className="flex items-center mb-3 top-0 bg-gray-300 p-3 rounded-xl shadow-md">
                    <NotepadText className='text-2xl font-bold text-gray-900'/>
                    <h2 className="text-2xl font-bold text-gray-900">Summary</h2>
                    <button
                      onClick={handleDownload}
                      className="flex items-center ml-auto bg-blue-900 hover:bg-blue-950 text-white font-medium py-2 px-4 rounded-lg"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="prose prose-blue max-w-none">
                    {renderMarkdown(summary)}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-center">
                  <p>Summary will appear here after processing</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}