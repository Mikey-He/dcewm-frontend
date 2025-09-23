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

  /**
   * Fetch preview data.
   * If `overrides` is provided (e.g., { page: 2 }), it will fetch using the merged
   * filters immediately and then commit the merged filters to state when successful.
   */
  const handlePreview = async (overrides?: Partial<Filters>) => {
    // build effective filters for this request
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
      // drop stale responses
      if (seq !== reqSeqRef.current) return;

      setRows(data);
      setTotalRows(total);

      // when overrides are used (paging), persist them to filters after success
      if (overrides && Object.keys(overrides).length) {
        setFilters(eff);
      }
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

  const formatButtonText = useMemo(
    () => (filters.format === "CSV" ? "Download CSV" : "Download JSON"),
    [filters.format]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* top bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">DCEWM</h1>
          <nav className="text-sm text-gray-600 flex gap-6">
            <a href="https://github.com/Mikey-He/dcewm-frontend" target="_blank" rel="noreferrer" className="hover:underline">
              GitHub
            </a>
            <a href="/docs" target="_blank" rel="noreferrer" className="hover:underline">
              API Docs
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Filters Card */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Resource */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Resource</label>
              <select
                value={filters.resource}
                onChange={(e) => {
                  updateFilter("resource", e.target.value as Filters["resource"]);
                  updateFilter("page", 1);
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="PUE">PUE</option>
                <option value="WUE">WUE</option>
              </select>
            </div>

            {/* Provider (single) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Provider</label>
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

            {/* Countries (multi) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Countries</label>
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

            {/* IEA Region (single) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">IEA Region</label>
              <select
                value={filters.region}
                onChange={(e) => {
                  updateFilter("region", e.target.value);
                  updateFilter("page", 1);
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Period Category</label>
              <select
                value={filters.periodCategory}
                onChange={(e) => {
                  updateFilter("periodCategory", e.target.value);
                  updateFilter("page", 1);
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
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

            {/* Value From */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Value From</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g., 2019"
                value={filters.valueFrom}
                onChange={(e) => {
                  updateFilter("valueFrom", e.target.value);
                  updateFilter("page", 1);
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Value To */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Value To</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g., 2024"
                value={filters.valueTo}
                onChange={(e) => {
                  updateFilter("valueTo", e.target.value);
                  updateFilter("page", 1);
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Format</label>
              <select
                value={filters.format}
                onChange={(e) => updateFilter("format", e.target.value as Filters["format"])}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Page */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Page</label>
              <input
                type="number"
                min={1}
                value={filters.page}
                onChange={(e) => updateFilter("page", Math.max(1, parseInt(e.target.value || "1", 10)))}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Per Page (1..50) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Per Page</label>
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
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* actions */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => handlePreview()}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white font-medium shadow-sm hover:bg-blue-700 focus:outline-none"
            >
              🔍 Preview
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-white font-medium shadow-sm hover:bg-green-700 focus:outline-none"
            >
              ⬇️ {formatButtonText}
            </button>
          </div>
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
              // fetch using the new page RIGHT AWAY (no stale state)
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
