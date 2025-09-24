// src/lib/api.ts
// Public API helpers for DCEWM

export const API_BASE = "https://dcewm-api.hcfmike040210.workers.dev/v1";

export type Resource = "PUE" | "WUE";

// ----- Table columns (snake_case) -----
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

// ----- UI lists -----
export const PERIOD_CATEGORIES = ["(Any)", "Annual", "Quarterly", "Monthly", "Not evident", "Any"] as const;
export const FORMATS = ["JSON", "CSV"] as const;

export type Filters = {
  resource: Resource;
  provider: string;
  countries: string[];    // multi-select
  region: string;         // single-select; "(Any)" = no filter
  periodCategory: string; // "(Any)" = no filter
  valueFrom: string;
  valueTo: string;
  page: number;
  perPage: number;        // clamp 1..50
  format: "JSON" | "CSV";
};

// ---------------------------------------------------------------------
// Normalizers for dropdowns
// ---------------------------------------------------------------------

/** Split multi-country strings into single countries.
 *  We DO NOT split on '&' so names like "Trinidad & Tobago" stay intact.
 */
function normalizeCountries(list: string[]) {
  const tokens = list
    .flatMap((s) =>
      String(s)
        .split(/[,/|;]|(?:\s+and\s+)/i) // commas, '/', '|', ';', or " and "
        .map((t) => t.trim())
    )
    .filter(Boolean);

  return Array.from(new Set(tokens)).sort((a, b) => a.localeCompare(b));
}

const IEA_REGIONS = [
  "(Any)",
  "Africa",
  "Asia Pacific",
  "Central & South America",
  "Eurasia",
  "Europe",
  "Global",
  "Middle East",
  "North America",
] as const;
const IEA_SET = new Set(IEA_REGIONS.slice(1).map((r) => r.toLowerCase()));

function foldRegionSynonym(v: string): string | null {
  const lc = v.toLowerCase().trim();
  if (!lc) return null;

  // keep CSA as one token (fold common variants)
  if (
    lc === "central & south america" ||
    lc === "central and south america" ||
    lc === "central/south america" ||
    lc === "central south america" ||
    lc === "south america" ||
    lc === "central america"
  ) {
    return "Central & South America";
  }

  if (IEA_SET.has(lc)) {
    const proper = IEA_REGIONS.find((x) => x.toLowerCase() === lc)!;
    return proper;
  }
  return null;
}

/** Normalize the Regions dropdown to 8 IEA regions only. */
function normalizeRegions(list: string[]) {
  const order = new Map(IEA_REGIONS.map((v, i) => [v, i]));
  const CSA_PLACEHOLDER = "__CSA__";

  const items: string[] = [];
  for (const raw of list) {
    let s = String(raw || "");
    if (!s.trim()) continue;

    // protect CSA before splitting
    s = s.replace(
      /(central\s*&\s*south\s*america|central\s+and\s+south\s+america|central\s*\/\s*south\s*america|central\s+south\s+america)/gi,
      CSA_PLACEHOLDER
    );

    const parts = s
      .split(/[,/|;]|(?:\s+and\s+)/i)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t === CSA_PLACEHOLDER ? "Central & South America" : t));

    for (const p of parts) {
      const f = foldRegionSynonym(p);
      if (f) items.push(f);
    }
  }

  const uniq = Array.from(new Set(items));
  uniq.sort((a, b) => {
    const ia = order.get(a) ?? 999;
    const ib = order.get(b) ?? 999;
    return ia - ib || a.localeCompare(b);
  });

  return ["(Any)", ...uniq];
}

// ---------------------------------------------------------------------
// Query builders (contains-any semantics for region & countries)
// ---------------------------------------------------------------------

/** Remove asterisks so they don't break ilike patterns. */
function escapeIlike(value: string) {
  return value.replace(/\*/g, "");
}

/** Build PostgREST query parameters. */
function buildFilterParams(f: Filters) {
  const params = new URLSearchParams();

  // Provider: fuzzy (unchanged)
  if (f.provider?.trim()) {
    params.append("company_name", `ilike.*${escapeIlike(f.provider.trim())}*`);
  }

  // Countries: one OR group of ilike parts → matches ANY selected country
  if (f.countries && f.countries.length > 0) {
    const orParts = f.countries
      .filter(Boolean)
      .map((c) => `country.ilike.*${escapeIlike(c)}*`)
      .join(",");
    params.append("or", `(${orParts})`);
  }

  // Region: contains semantics with ilike
  if (f.region && f.region !== "(Any)") {
    params.append("region", `ilike.*${escapeIlike(f.region)}*`);
  }

  // Period category: exact
  if (f.periodCategory && f.periodCategory !== "(Any)") {
    params.append("time_period_category", `eq.${f.periodCategory}`);
  }

  // Time window (AND)
  if (f.valueFrom) params.append("time_period_value", `gte.${f.valueFrom}`);
  if (f.valueTo)   params.append("time_period_value",   `lte.${f.valueTo}`);

  return params;
}

const clampPerPage = (n: number) => Math.max(1, Math.min(50, Math.floor(n || 1)));

export const buildQueryString = (f: Filters) => {
  const params = buildFilterParams(f);
  params.append("page", String(Math.max(1, f.page)));
  params.append("per_page", String(clampPerPage(f.perPage)));
  return params.toString();
};

// ---------------------------------------------------------------------
// Dropdown loaders
// ---------------------------------------------------------------------

export async function fetchDropdownData(
  resource: Resource
): Promise<{ providers: string[]; countries: string[]; regions: string[] }> {
  const r = resource.toLowerCase();

  try {
    const [pRes, cRes, rgRes] = await Promise.all([
      fetch(`${API_BASE}/${r}_providers`),
      fetch(`${API_BASE}/${r}_countries`),
      fetch(`${API_BASE}/${r}_regions`),
    ]);

    let providers: string[] = [];
    let countries: string[] = [];
    let regions: string[] = ["(Any)"];

    if (pRes.ok) {
      const data = await pRes.json();
      providers = Array.isArray(data) ? data.map((x: any) => x?.company_name).filter(Boolean) : [];
      providers = Array.from(new Set(providers)).sort((a, b) => a.localeCompare(b));
    }

    if (cRes.ok) {
      const data = await cRes.json();
      const raw = Array.isArray(data) ? data.map((x: any) => x?.country).filter(Boolean) : [];
      countries = normalizeCountries(raw);
    }

    if (rgRes.ok) {
      const data = await rgRes.json();
      const raw = Array.isArray(data) ? data.map((x: any) => x?.region).filter(Boolean) : [];
      regions = normalizeRegions(raw);
    }

    return { providers, countries, regions };
  } catch {
    return { providers: [], countries: [], regions: ["(Any)"] };
  }
}

// ---------------------------------------------------------------------
// Table data + downloads
// ---------------------------------------------------------------------

/** Fallback aggregate count when headers are missing. */
async function fetchTotalCount(resource: string, filters: Filters): Promise<number> {
  const params = buildFilterParams(filters);
  params.append("select", "count:count()");
  const url = `${API_BASE}/${resource}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return 0;

  const arr = await res.json();
  const val =
    Array.isArray(arr) && arr.length
      ? Number(arr[0]?.count ?? arr[0]?.COUNT ?? Object.values(arr[0] || {})[0])
      : 0;

  return Number.isFinite(val) ? val : 0;
}

export async function fetchTableData(
  filters: Filters
): Promise<{ data: any[]; total: number }> {
  const resource = filters.resource.toLowerCase();
  const query = buildQueryString(filters);
  const url = `${API_BASE}/${resource}?${query}`;

  let res: Response | null = null;
  try {
    res = await fetch(url, { headers: { Prefer: "count=exact" } });
  } catch {}
  if (!res) res = await fetch(url);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch table data: ${res.status} ${text}`);
  }

  const data = await res.json();

  // Try headers for total
  let total: number | null = null;
  const h1 = res.headers.get("x-total");
  const h2 = res.headers.get("x-total-count");
  const h3 = res.headers.get("content-range"); // e.g., "0-9/92"
  const pick = h1 || h2 || h3;
  if (pick) {
    const m = /\/(\d+)$/.exec(pick) || /^(\d+)$/.exec(pick);
    if (m) total = parseInt(m[1], 10);
  }

  // Fallback aggregation
  if (!Number.isFinite(total as any)) {
    total = await fetchTotalCount(resource, filters);
    if (!Number.isFinite(total as any) || total === 0) {
      total = Array.isArray(data) ? data.length : 0;
    }
  }

  return { data: Array.isArray(data) ? data : [], total: total as number };
}

export async function downloadJSON(filters: Filters) {
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
}

export async function downloadCSV(filters: Filters) {
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
}
