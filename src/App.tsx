// src/App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FORMATS,
  PERIOD_CATEGORIES,
  fetchDropdownData,
  fetchTableData,
  downloadCSV,
  downloadJSON,
} from "./lib/api";
import type { Filters } from "./lib/api";
import { Dropdown } from "./components/Dropdown";
import { PreviewTable } from "./components/PreviewTable";
import { Header } from "./components/Header";

const clampPerPage = (n: number) => Math.max(1, Math.min(50, Math.floor(n || 1)));

const DEFAULT_FILTERS: Filters = {
  resource: "PUE",
  provider: "",
  countries: [],
  region: "(Any)",
  periodCategory: "(Any)",
  valueFrom: "",
  valueTo: "",
  page: 1,
  perPage: 10,
  format: "JSON",
};

const App: React.FC = () => {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // dropdown data
  const [providers, setProviders] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>(["(Any)"]);

  // table state
  const [rows, setRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // prevent out-of-order updates when clicking fast
  const reqSeqRef = useRef(0);

  // load dropdowns whenever resource changes
  useEffect(() => {
    (async () => {
      const { providers, countries, regions } = await fetchDropdownData(filters.resource);
      setProviders(providers);
      setCountries(countries);
      setRegions(regions);
      // reset provider/countries/region on resource change
      setFilters((f) => ({ ...f, provider: "", countries: [], region: "(Any)" }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.resource]);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  /** Main fetch with optional overrides (e.g. { page: 2 }) */
  const handlePreview = async (overrides?: Partial<Filters>) => {
    const eff: Filters = {
      ...filters,
      ...overrides,
      page: Math.max(1, overrides?.page ?? filters.page),
      perPage: clampPerPage(overrides?.perPage ?? filters.perPage),
    };

    setLoading(true);
    setError(null);
    const seq = ++reqSeqRef.current;

    try {
      const { data, total } = await fetchTableData(eff);
      if (seq !== reqSeqRef.current) return; // drop stale
      setRows(data);
      setTotalRows(total);
      if (overrides && Object.keys(overrides).length) setFilters(eff);
    } catch (e: any) {
      if (seq !== reqSeqRef.current) return;
      setRows([]);
      setTotalRows(0);
      setError(e?.message || "Failed to fetch");
    } finally {
      if (seq === reqSeqRef.current) setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (filters.format === "CSV") await downloadCSV(filters);
      else await downloadJSON(filters);
    } catch (e: any) {
      setError(e?.message || "Download failed");
      setTimeout(() => setError(null), 4000);
    }
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setRows([]);
    setTotalRows(0);
    setError(null);
  };

  const formatButtonText = useMemo(
    () => (filters.format === "CSV" ? "Download CSV" : "Download JSON"),
    [filters.format]
  );

  // Active filter chips
  const chips: Array<{ label: string; onClear: () => void }> = [];
  if (filters.provider) chips.push({ label: `Provider: ${filters.provider}`, onClear: () => updateFilter("provider", "") });
  if (filters.countries.length)
    filters.countries.forEach((c) => chips.push({
      label: `Country: ${c}`,
      onClear: () => updateFilter("countries", filters.countries.filter((x) => x !== c)),
    }));
  if (filters.region !== "(Any)") chips.push({ label: `IEA Region: ${filters.region}`, onClear: () => updateFilter("region", "(Any)") });
  if (filters.periodCategory !== "(Any)")
    chips.push({ label: `Period: ${filters.periodCategory}`, onClear: () => updateFilter("periodCategory", "(Any)") });
  if (filters.valueFrom) chips.push({ label: `From: ${filters.valueFrom}`, onClear: () => updateFilter("valueFrom", "") });
  if (filters.valueTo) chips.push({ label: `To: ${filters.valueTo}`, onClear: () => updateFilter("valueTo", "") });

  const totalPill =
    totalRows > 0 ? (
      <span className="inline-flex items-center text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full px-2 py-1">
        {totalRows} matches
      </span>
    ) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Filters Card */}
        <section className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            {totalPill}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePreview();
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Row 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Resource</label>
                <select
                  value={filters.resource}
                  onChange={(e) => {
                    updateFilter("resource", e.target.value as Filters["resource"]);
                    updateFilter("page", 1);
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="PUE">PUE</option>
                  <option value="WUE">WUE</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Provider</label>
                <Dropdown
                  value={filters.provider}
                  onChange={(v) => {
                    const next = Array.isArray(v) ? v[0] ?? "" : v;
                    updateFilter("provider", next);
                    updateFilter("page", 1);
                  }}
                  options={providers}
                  placeholder="Type or select provider"
                  searchable
                  multiple={false}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Countries</label>
                <Dropdown
                  value={filters.countries}
                  onChange={(v) => {
                    const next = Array.isArray(v) ? v : v ? [v] : [];
                    updateFilter("countries", next);
                    updateFilter("page", 1);
                  }}
                  options={countries}
                  placeholder="Select countries"
                  searchable
                  multiple
                  className="mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">IEA Region</label>
                <select
                  value={filters.region}
                  onChange={(e) => {
                    updateFilter("region", e.target.value);
                    updateFilter("page", 1);
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                >
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Period Category</label>
                <select
                  value={filters.periodCategory}
                  onChange={(e) => {
                    updateFilter("periodCategory", e.target.value);
                    updateFilter("page", 1);
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                >
                  {PERIOD_CATEGORIES.map((opt: any) => {
                    const value = typeof opt === "string" ? opt : opt.value;
                    const label = typeof opt === "string" ? opt : opt.label;
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value From</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g., 2019"
                  value={filters.valueFrom}
                  onChange={(e) => {
                    updateFilter("valueFrom", e.target.value);
                    updateFilter("page", 1);
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value To</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g., 2024"
                  value={filters.valueTo}
                  onChange={(e) => {
                    updateFilter("valueTo", e.target.value);
                    updateFilter("page", 1);
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Format</label>
                <select
                  value={filters.format}
                  onChange={(e) => updateFilter("format", e.target.value as Filters["format"])}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                >
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Page</label>
                <input
                  type="number"
                  min={1}
                  value={filters.page}
                  onChange={(e) => updateFilter("page", Math.max(1, parseInt(e.target.value || "1", 10)))}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Per Page</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={filters.perPage}
                  onChange={(e) => {
                    const v = clampPerPage(parseInt(e.target.value || "1", 10));
                    updateFilter("perPage", v);
                    updateFilter("page", 1);
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="md:col-span-2 flex items-end gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white font-medium shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-60"
                >
                  {loading ? "Loading…" : "Preview"}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-white font-medium shadow-sm hover:bg-green-700 focus:outline-none"
                >
                  {formatButtonText}
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  title="Reset all filters"
                >
                  Reset
                </button>
              </div>
            </div>
          </form>

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    chip.onClear();
                    // do not auto-fetch; user can press Preview, or:
                    // handlePreview(); // uncomment to auto-refresh
                  }}
                  className="inline-flex items-center gap-2 text-xs rounded-full px-2 py-1 border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
                  title="Clear this filter"
                >
                  {chip.label}
                  <span aria-hidden="true">✕</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Table */}
        <section className="mt-6">
          <PreviewTable
            resource={filters.resource}
            data={rows}
            loading={loading}
            error={error}
            page={filters.page}
            perPage={filters.perPage}
            total={totalRows}
            onPageChange={(newPage) => {
              const next = Math.max(1, newPage);
              handlePreview({ page: next });
            }}
          />
        </section>
      </main>
    </div>
  );
};

export default App;
