// API
export interface APIResponse<T> {
  data: T[];
  total: number;
}

// PUE 
export interface PUEData {
  company_name: string;
  pue_value: number;
  time_period_category: string;
  time_period_value: string;
  measurement_category: string;
  pue_type: string;
  facility_scope: string;
  verbatim_geographical_scope: string;
  city: string;
  county: string;
  state_province: string;
  country: string;
  region: string;
  is_pue_self_reported: boolean;
  source_type: string;
  url: string;
  retrieved_date: string;
}

// WUE 
export interface WUEData {
  company_name: string;
  wue_value: number;
  time_period_category: string;
  time_period_value: string;
  measurement_category: string;
  water_input: string;
  category_1_water_inputs: string;
  wue_type: string;
  wue_pue_matching: string;
  facility_scope: string;
  verbatim_geographical_scope: string;
  city: string;
  county: string;
  state_province: string;
  country: string;
  region: string;
  is_wue_self_reported: boolean;
  source_type: string;
  url: string;
  retrieved_date: string;
}

// type 
export interface DropdownData {
  providers: string[];
  countries: string[];
  regions: string[];
}