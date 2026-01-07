'use client';

import React, { useState, useMemo } from 'react';
import { X, Clock, Search, Filter } from 'lucide-react';
import { PDFLog } from '@/types/index';

interface PDFHistoryModalProps {
  isOpen: boolean;
  logs: PDFLog[];
  onClose: () => void;
}

export const PDFHistoryModal: React.FC<PDFHistoryModalProps> = ({
  isOpen,
  logs,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'date_desc' | 'date_asc' | 'a_z' | 'z_a'>('date_desc');
  const [languageFilter, setLanguageFilter] = useState('');
  const [outputTypeFilter, setOutputTypeFilter] = useState('');

  const filteredLogs = useMemo(() => {
    let filtered = logs.filter(log => {
      const matchesSearch = search === '' || log.summary.toLowerCase().includes(search.toLowerCase());
      const matchesLanguage = languageFilter === '' || log.language === languageFilter;
      const matchesOutputType = outputTypeFilter === '' || log.output_type === outputTypeFilter;
      return matchesSearch && matchesLanguage && matchesOutputType;
    });

    filtered.sort((a, b) => {
      switch (sort) {
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'a_z':
          return a.summary.localeCompare(b.summary);
        case 'z_a':
          return b.summary.localeCompare(a.summary);
        default:
          return 0;
      }
    });

    return filtered;
  }, [logs, search, sort, languageFilter, outputTypeFilter]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-[500px] rounded-xl shadow-lg p-5 flex flex-col gap-4 max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Summary History
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-600">
            <X />
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search summaries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="a_z">A-Z</option>
              <option value="z_a">Z-A</option>
            </select>
          </div>
          <div className="flex gap-2">
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Languages</option>
              <option value="auto">Auto</option>
              <option value="id">Indonesia</option>
              <option value="en">English</option>
              <option value="ja">Japanese</option>
            </select>
            <select
              value={outputTypeFilter}
              onChange={(e) => setOutputTypeFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="paragraph">Paragraph</option>
              <option value="pointer">Bullet</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {filteredLogs.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">
              No summary history available
            </p>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border border-gray-200 rounded-lg p-3 bg-gray-50"
              >
                <p className="text-xs text-gray-700">
                  {renderHighlightedText(log.summary)}
                </p>

                <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(log.created_at).toLocaleString('id-ID')}
                  </span>
                  <span>• {log.language}</span>
                  <span>• {log.output_type}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="mt-2 px-4 py-2 text-xs rounded-lg bg-gray-100 hover:bg-gray-200"
        >
          Close
        </button>
      </div>
    </div>
  );
};
