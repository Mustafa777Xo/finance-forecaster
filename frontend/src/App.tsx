import { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ForecastDisplay } from './components/ForecastDisplay';
import ForecastAPI from './services/api';
import type { ForecastResponse, UploadStatus } from './types/api';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

function App() {
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' });
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Check backend status on load
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await ForecastAPI.healthCheck();
        setBackendStatus('online');
      } catch {
        setBackendStatus('offline');
      }
    };

    checkBackend();
  }, []);

  const handleFileUpload = async (file: File, days: number) => {
    setUploadStatus({ status: 'uploading' });
    setForecastData(null);

    try {
      const response = await ForecastAPI.uploadAndForecast(file, days);
      setForecastData(response);
      setUploadStatus({ status: 'success' });

      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('forecast-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);

    } catch (error) {
      setUploadStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      });
    }
  };

  const resetApp = () => {
    setForecastData(null);
    setUploadStatus({ status: 'idle' });
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-slate-100">Finance Forecaster</h1>
                <p className="text-sm text-slate-300">Upload your transactions and get AI-powered spending forecasts</p>
              </div>
            </div>

            {/* Backend Status Indicator */}
            <div className="flex items-center space-x-2">
              {backendStatus === 'checking' && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Checking backend...</span>
                </div>
              )}
              {backendStatus === 'online' && (
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Backend Online</span>
                </div>
              )}
              {backendStatus === 'offline' && (
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Backend Offline</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Backend Offline Warning */}
        {backendStatus === 'offline' && (
          <div className="mb-8 p-4 bg-red-950 border border-red-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <div>
                <h3 className="font-medium text-red-100">Backend Server Offline</h3>
                <p className="text-sm text-red-200 mt-1">
                  Please ensure the FastAPI backend is running on http://localhost:8000
                </p>
                <p className="text-xs text-red-300 mt-2">
                  Run: <code className="bg-red-900 px-2 py-1 rounded">PYTHONPATH=. poetry run uvicorn backend.api.main:app --reload</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-100 mb-4">
              Get Your Financial Forecast
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Upload your transaction CSV file and our AI will analyze your spending patterns
              to predict future daily spending amounts with confidence intervals.
            </p>
          </div>

          <FileUpload
            onFileUpload={handleFileUpload}
            uploadStatus={uploadStatus}
          />

          {forecastData && (
            <div className="text-center mt-6">
              <button
                onClick={resetApp}
                className="bg-slate-600 hover:bg-slate-500 text-slate-100 px-4 py-2 rounded-lg transition-colors"
              >
                Upload New File
              </button>
            </div>
          )}
        </section>

        {/* Results Section */}
        {forecastData && (
          <section id="forecast-results" className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-100 mb-4">
                Your Forecast Results
              </h2>
              <p className="text-lg text-slate-300">
                Based on your historical spending patterns, here's what we predict for the next{' '}
                {forecastData.model_info.forecast_horizon} days.
              </p>
            </div>

            <ForecastDisplay forecastData={forecastData} />
          </section>
        )}

        {/* How It Works Section */}
        <section className="bg-slate-800 rounded-lg p-8 shadow-lg border border-slate-700">
          <h3 className="text-2xl font-bold text-slate-100 mb-6">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-blue-300">1</span>
              </div>
              <h4 className="font-semibold text-slate-100 mb-2">Upload Your Data</h4>
              <p className="text-slate-300 text-sm">
                Upload a CSV file with your transaction history including date and amount columns.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-green-300">2</span>
              </div>
              <h4 className="font-semibold text-slate-100 mb-2">AI Analysis</h4>
              <p className="text-slate-300 text-sm">
                Our Prophet model analyzes your spending patterns, seasonality, and trends.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-purple-300">3</span>
              </div>
              <h4 className="font-semibold text-slate-100 mb-2">Get Predictions</h4>
              <p className="text-slate-300 text-sm">
                Receive detailed forecasts with confidence intervals for future spending.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-slate-400 text-sm">
            <p>© 2025 Finance Forecaster. Built with React, TypeScript, and Prophet ML.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
