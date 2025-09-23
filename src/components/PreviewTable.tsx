// src/components/PreviewTable.tsx
import React from "react";
import { COLUMNS } from "../lib/api";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface PreviewTableProps {
  resource: "PUE" | "WUE";
  data: any[];
  loading: boolean;
  error: string | null;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const PreviewTable: React.FC<PreviewTableProps> = ({
  resource,
  data,
  loading,
  error,
  page,
  perPage,
  total,
  onPageChange,
}) => {
  const cols = COLUMNS[resource];
  const safePerPage = Math.max(1, Math.min(50, perPage));
  const totalPages = Math.max(1, Math.ceil((total || 0) / safePerPage));
  const disablePrev = loading || page <= 1;
  const disableNext = loading || page >= totalPages;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {error && (
        <div className="p-4 text-red-600 text-sm border-b border-red-200 bg-red-50 rounded-t-xl">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {cols.map((key) => (
                <th
                  key={key}
                  className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                >
                  {key.replace(/_/g, " ").toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={cols.length}>
                  Loading…
                </td>
              </tr>
            ) : !data?.length ? (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={cols.length}>
                  No data found.
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {cols.map((key) => {
                    const v = row?.[key];
                    if (key === "url" && typeof v === "string" && v) {
                      return (
                        <td key={key} className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                          <a
                            href={v}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 underline hover:no-underline"
                          >
                            Source <ExternalLink size={14} />
                          </a>
                        </td>
                      );
                    }
                    return (
                      <td key={key} className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                        {v === null || v === undefined || v === "" ? "-" : String(v)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Page {page} of {totalPages}, Total {total || 0} rows
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => !disablePrev && onPageChange(page - 1)}
            disabled={disablePrev}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <button
            onClick={() => !disableNext && onPageChange(page + 1)}
            disabled={disableNext}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
