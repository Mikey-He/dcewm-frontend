// from api.ts
export { 
  API_BASE, 
  COLUMNS, 
  PERIOD_CATEGORIES, 
  FORMATS 
} from './api';

// resources
export const RESOURCES = ['PUE', 'WUE'] as const;

// default
export const DEFAULT_FILTERS = {
  resource: 'PUE' as const,
  provider: '',
  countries: [] as string[],
  region: '(Any)',
  periodCategory: '',
  valueFrom: '',
  valueTo: '',
  page: 1,
  perPage: 50,
  format: 'JSON' as const
};

// UI text
export const UI_TEXT = {
  title: 'DCEWM',
  nav: {
    github: 'GitHub',
    apiDocs: 'API Docs'
  },
  filters: {
    title: 'Filters',
    resource: 'Resource',
    provider: 'Provider',
    countries: 'Countries',
    region: 'IEA Region',
    periodCategory: 'Period Category',
    valueFrom: 'Value From',
    valueTo: 'Value To',
    format: 'Format',
    page: 'Page',
    perPage: 'Per Page'
  },
  actions: {
    preview: 'Preview',
    download: 'Download',
    loading: 'Loading...'
  },
  placeholder: {
    provider: 'Type or select provider',
    countries: 'Select countries',
    valueFrom: 'e.g., 2019',
    valueTo: 'e.g., 2024'
  },
  errors: {
    valueRange: 'Value From cannot be greater than Value To',
    downloadFailed: 'Download failed',
    noData: 'No data found. Try adjusting your filters.'
  }
};

// page 
export const PAGINATION = {
  defaultPage: 1,
  defaultPerPage: 50,
  minPage: 1,
  minPerPage: 1,
  maxPerPage: 1000
};