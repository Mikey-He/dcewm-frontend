import React, { useMemo, useState } from "react";
import { Copy, ExternalLink, Link as LinkIcon, Terminal } from "lucide-react";

type ApiUrlBarProps = {
  jsonUrl: string;
  csvUrl: string;
  compact?: boolean;
};

export default function ApiUrlBar({ jsonUrl, csvUrl, compact = false }: ApiUrlBarProps) {
  const [mode, setMode] = useState<"JSON" | "CSV" | "cURL">("JSON");

  const display = useMemo(() => {
    if (mode === "cURL") {
      // derive curl from the two URLs to avoid extra props
      const url = jsonUrl; // default to JSON curl; user can switch to CSV via the mode
      return `curl -sL '${mode === "CSV" ? csvUrl : url}'`;
    }
    return mode === "CSV" ? csvUrl : jsonUrl;
  }, [mode, jsonUrl, csvUrl]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(display);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = display;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  function openInNew() {
    const url = mode === "CSV" ? csvUrl : jsonUrl;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60 p-3 md:p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <LinkIcon className="w-4 h-4 opacity-70" />
        <span className="text-sm font-medium">API URL</span>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setMode("JSON")}
            className={`px-2 py-1 text-xs rounded-md border ${
              mode === "JSON"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent"
                : "bg-transparent border-zinc-300 dark:border-zinc-700"
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => setMode("CSV")}
            className={`px-2 py-1 text-xs rounded-md border ${
              mode === "CSV"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent"
                : "bg-transparent border-zinc-300 dark:border-zinc-700"
            }`}
          >
            CSV
          </button>
          <button
            onClick={() => setMode("cURL")}
            className={`px-2 py-1 text-xs rounded-md border flex items-center gap-1 ${
              mode === "cURL"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent"
                : "bg-transparent border-zinc-300 dark:border-zinc-700"
            }`}
            title="Show example cURL"
          >
            <Terminal className="w-3.5 h-3.5" />
            cURL
          </button>
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={display}
          className="flex-1 text-xs md:text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2 py-2 overflow-x-auto"
        />
        <button
          onClick={copy}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs md:text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="Copy"
        >
          <Copy className="w-4 h-4" />
          Copy
        </button>
        {mode !== "cURL" && (
          <button
            onClick={openInNew}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs md:text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
            Open
          </button>
        )}
      </div>

      {!compact && (
        <p className="mt-2 text-xs opacity-70">
          The URL reflects all current filters (provider, region, countries, period, page, per-page).
        </p>
      )}
    </div>
  );
}
