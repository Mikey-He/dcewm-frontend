// src/lib/api.ts
// Public API helpers, shared types, and constants

export const API_BASE = "https://dcewm-api.hcfmike040210.workers.dev/v1";

export type Resource = "PUE" | "WUE";

export const COLUMNS: Record<Resource, string[]> = {
  PUE: [
    "company_name",
    "pue_value",
    "time_period_category",
    "time_period_value",
    "measurement_category",
    "pue_type",
    "facility_scope",
    "verbatim_geographical_scope",
    "city",
    "county",
    "state_province",
    "country",
    "region",
    "is_pue_self_reported",
    "source_type",
    "url",
    "retrieved_date",
  ],
  WUE: [
    "company_name",
    "wue_value",
    "time_period_category",
    "time_period_value",
    "measurement_category",
    "water_input",
    "category_1_water_inputs",
    "wue_type",
    "facility_scope",
    "verbatim_geographical_scope",
    "city",
    "county",
    "state_province",
    "country",
    "region",
    "is_wue_self_reported",
    "source_type",
    "url",
    "retrieved_date",
  ],
};

export const PERIOD_CATEGORIES = [
  "(Any)",
  "Annual",
  "Quarterly",
  "Monthly",
  "Not evident",
  "Any",
] as const;

export const FORMATS = ["JSON", "CSV"] as const;

export type Filters = {
  resource: Resource;
  provider: string;
  countries: string[]; // OR semantics
  region: string; // "(Any)" means no filter
  periodCategory: string; // "(Any)" means no filter
  valueFrom: string;
  valueTo: string;
  page: number;
  perPage: number; // clamped to 1..50
  format: "JSON" | "CSV";
};

// ---------- helpers ----------

const clampPerPage = (n: number) => Math.max(1, Math.min(50, Math.floor(n || 1)));

/** Split combined strings into atomic items and dedupe/sort. */
const normalizeList = (list: string[]) => {
  const tokens = list
    .flatMap((s) => String(s).split(/[,/|;]|(?:\s+and\s+)|(?:\s*&\s*)/i))
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(tokens)).sort((a, b) => a.localeCompare(b));
};

/** Build PostgREST-style query string. */
export const buildQueryString = (f: Filters) => {
  const params = new URLSearchParams();

  // provider (ilike)
  if (f.provider?.trim()) {
    params.append("company_name", `ilike.*${f.provider.trim()}*`);
  }

  // countries (in)
  if (f.countries?.length) {
    const quoted = f.countries.map((c) => `"${c.replace(/"/g, '\\"')}"`).join(",");
    params.append("country", `in.(${quoted})`);
  }

  // region (eq)
  if (f.region && f.region !== "(Any)") {
    params.append("region", `eq.${f.region}`);
  }

  // period category (eq)
  if (f.periodCategory && f.periodCategory !== "(Any)") {
    params.append("time_period_category", `eq.${f.periodCategory}`);
  }

  // time range
  if (f.valueFrom) params.append("time_period_value", `gte.${f.valueFrom}`);
  if (f.valueTo) params.append("time_period_value", `lte.${f.valueTo}`);

  // pagination
  params.append("page", String(Math.max(1, f.page)));
  params.append("per_page", String(clampPerPage(f.perPage)));

  return params.toString();
};

// ---------- dropdown data ----------

export const fetchDropdownData = async (
  resource: Resource
): Promise<{ providers: string[]; countries: string[]; regions: string[] }> => {
  const r = resource.toLowerCase();

  try {
    const [pRes, cRes, rgRes] = await Promise.all([
      fetch(`${API_BASE}/${r}_providers`),
      fetch(`${API_BASE}/${r}_countries`),
      fetch(`${API_BASE}/${r}_regions`),
    ]);

    if (!pRes.ok || !cRes.ok || !rgRes.ok) {
      console.error("Dropdown endpoints failed", {
        providers: pRes.status,
        countries: cRes.status,
        regions: rgRes.status,
      });
      return { providers: [], countries: [], regions: ["(Any)"] };
    }

    let providers: string[] = [];
    let countries: string[] = [];
    let regions: string[] = ["(Any)"];

    try {
      const d = await pRes.json();
      providers = Array.isArray(d) ? d.map((x: any) => x?.company_name).filter(Boolean) : [];
      providers = Array.from(new Set(providers)).sort((a, b) => a.localeCompare(b));
    } catch (e) {
      console.error("providers json parse", e);
    }

    try {
      const d = await cRes.json();
      const raw = Array.isArray(d) ? d.map((x: any) => x?.country).filter(Boolean) : [];
      countries = normalizeList(raw);
    } catch (e) {
      console.error("countries json parse", e);
    }

    try {
      const d = await rgRes.json();
      const raw = Array.isArray(d) ? d.map((x: any) => x?.region).filter(Boolean) : [];
      regions = ["(Any)", ...normalizeList(raw)];
    } catch (e) {
      console.error("regions json parse", e);
    }

    return { providers, countries, regions };
  } catch (err) {
    console.error("fetchDropdownData error", err);
    return { providers: [], countries: [], regions: ["(Any)"] };
  }
};

// ---------- table data ----------

export const fetchTableData = async (filters: Filters): Promise<{ data: any[]; total: number }> => {
  const resource = filters.resource.toLowerCase();
  const query = buildQueryString(filters);
  const url = `${API_BASE}/${resource}?${query}`;

  // Try to request exact count first; if the server blocks the preflight (CORS),
  // fall back to a plain fetch without custom headers.
  let res: Response | null = null;
  try {
    res = await fetch(url, { headers: { Prefer: "count=exact" } });
  } catch {
    // swallow and retry without custom headers
  }
  if (!res) res = await fetch(url);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch table data: ${res.status} ${text}`);
  }

  const data = await res.json();

  // Parse total from common headers; fallback to page length if missing
  let total: number | null = null;
  const h1 = res.headers.get("x-total");
  const h2 = res.headers.get("x-total-count");
  const h3 = res.headers.get("content-range"); // e.g., "0-49/123"
  const pick = h1 || h2 || h3;
  if (pick) {
    const m = /\/(\d+)$/.exec(pick) || /^(\d+)$/.exec(pick);
    if (m) total = parseInt(m[1], 10);
  }
  if (!Number.isFinite(total as any)) total = Array.isArray(data) ? data.length : 0;

  return { data: Array.isArray(data) ? data : [], total: total as number };
};

// ---------- downloads ----------

export const downloadJSON = async (filters: Filters) => {
  const r = filters.resource.toLowerCase();
  const url = `${API_BASE}/${r}?${buildQueryString(filters)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Download failed");
  const blob = new Blob([await res.text()], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href,
    download: `${r}-${new Date().toISOString().slice(0, 10)}.json`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
};

export const downloadCSV = async (filters: Filters) => {
  const r = filters.resource.toLowerCase();
  const url = `${API_BASE}/${r}.csv?${buildQueryString(filters)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href,
    download: `${r}-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
};
