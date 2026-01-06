'use client';

import React from 'react';
import { X, Clock } from 'lucide-react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-[420px] rounded-xl shadow-lg p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Summary History
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-600">
            <X />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto space-y-3">
          {logs.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">
              No summary history available
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="border border-gray-200 rounded-lg p-3 bg-gray-50"
              >
                <p className="text-xs text-gray-700 line-clamp-3">
                  {log.summary}
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
