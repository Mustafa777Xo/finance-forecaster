// API service for Finance Forecaster

import axios from 'axios';
import type { ForecastResponse, ApiError } from '../types/api';

// Configure axios instance
const api = axios.create({
  baseURL: 'http://localhost:8000', // FastAPI backend URL
  timeout: 120000, // 2 minutes timeout for model training
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error(error.message || 'An unexpected error occurred');
  }
);

export class ForecastAPI {
  /**
   * Upload CSV file and generate forecast
   */
  static async uploadAndForecast(file: File, days: number = 30): Promise<ForecastResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('days', days.toString());

    const response = await api.post<ForecastResponse>('/api/upload-and-forecast', formData);
    return response.data;
  }

  /**
   * Generate forecast using existing model
   */
  static async forecastWithModel(
    file: File,
    modelFilename?: string,
    days: number = 30
  ): Promise<ForecastResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (modelFilename) {
      formData.append('model_filename', modelFilename);
    }
    formData.append('days', days.toString());

    const response = await api.post<ForecastResponse>('/api/forecast-with-model', formData);
    return response.data;
  }

  /**
   * Get list of available models
   */
  static async listModels(): Promise<{ models: Array<{ filename: string; created_at: string; size_kb: number }> }> {
    const response = await api.get('/api/models');
    return response.data;
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{ status: string; timestamp: string; message: string }> {
    const response = await api.get('/');
    return response.data;
  }
}

export default ForecastAPI;
