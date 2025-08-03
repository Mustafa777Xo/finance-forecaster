// API Types for Finance Forecaster

export interface ForecastDataPoint {
  date: string;
  predicted_amount: number;
  lower_bound: number;
  upper_bound: number;
  is_forecast: boolean;
}

export interface ModelInfo {
  model_type: string;
  training_days?: number;
  forecast_horizon: number;
  generated_at: string;
  model_file?: string;
}

export interface DataSummary {
  total_transactions: number;
  date_range: {
    start: string;
    end: string;
  };
  amount_stats: {
    total: number;
    mean: number;
    min: number;
    max: number;
  };
  unique_days: number;
}

export interface ForecastResponse {
  forecast_data: ForecastDataPoint[];
  model_info: ModelInfo;
  data_summary: DataSummary;
}

export interface ApiError {
  detail: string;
}

export interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
}
