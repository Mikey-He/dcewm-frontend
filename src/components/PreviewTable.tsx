// src/components/PreviewTable.tsx
import React, { useMemo, useState } from "react";
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

  // Density toggle (local; UI-only)
  const [compact, setCompact] = useState(false);
  const cellPad = compact ? "px-3 py-1.5" : "px-4 py-2";

  const safePerPage = Math.max(1, Math.min(50, perPage));
  const totalPages = Math.max(1, Math.ceil((total || 0) / safePerPage));
  const disablePrev = loading || page <= 1;
  const disableNext = loading || page >= totalPages;

  const headerCells = useMemo(
    () =>
      cols.map((key) => (
        <th
          key={key}
          className={`text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap ${cellPad}`}
        >
          {key.replace(/_/g, " ").toUpperCase()}
        </th>
      )),
    [cols, cellPad]
  );

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
      {error && (
        <div className="p-4 text-red-600 dark:text-red-400 text-sm border-b border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 rounded-t-2xl">
          {error}
        </div>
      )}

      {/* Table toolbar */}
      <div className="flex items-center justify-end gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Density:
          <button
            type="button"
            onClick={() => setCompact(false)}
            className={`ml-2 rounded-md px-2 py-1 border text-xs ${
              !compact
                ? "border-blue-600 text-blue-700 dark:text-blue-300"
                : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Comfortable
          </button>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <button
            type="button"
            onClick={() => setCompact(true)}
            className={`rounded-md px-2 py-1 border text-xs ${
              compact
                ? "border-blue-600 text-blue-700 dark:text-blue-300"
                : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Compact
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
            <tr>{headerCells}</tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-100 dark:divide-gray-900">
            {loading ? (
              <tr>
                <td className={`${cellPad} text-sm text-gray-500 dark:text-gray-400`} colSpan={cols.length}>
                  Loading…
                </td>
              </tr>
            ) : !data?.length ? (
              <tr>
                <td className={`${cellPad} text-sm text-gray-500 dark:text-gray-400`} colSpan={cols.length}>
                  No data found.
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  className="odd:bg-white even:bg-gray-50 dark:odd:bg-transparent dark:even:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  {cols.map((key) => {
                    const v = row?.[key];
                    const base = `text-sm text-gray-800 dark:text-gray-200 ${cellPad} whitespace-nowrap`;
                    // right-align numeric value columns
                    const align = /_value$/.test(key) ? "text-right" : "text-left";
                    if (key === "url" && typeof v === "string" && v) {
                      return (
                        <td key={key} className={`${base} ${align}`}>
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
                    // clamp long text to single line for visual stability
                    const truncated =
                      key === "verbatim_geographical_scope" || key === "facility_scope" || key === "region";
                    return (
                      <td key={key} className={`${base} ${align}`}>
                        <span className={truncated ? "block max-w-[420px] truncate" : undefined} title={String(v ?? "")}>
                          {v === null || v === undefined || v === "" ? "-" : String(v)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Page {page} of {totalPages}, Total {total || 0} rows
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => !disablePrev && onPageChange(page - 1)}
            disabled={disablePrev}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <button
            onClick={() => !disableNext && onPageChange(page + 1)}
            disabled={disableNext}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
