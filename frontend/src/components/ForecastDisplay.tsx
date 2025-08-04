import React from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';
import { Calendar, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import type { ForecastResponse } from '../types/api';

// TypeScript interfaces for better type safety
interface ChartDataPoint {
  date: string;
  dateObj: Date;
  amount: number;
  lowerBound: number;
  upperBound: number;
  isForecast: boolean;
}

interface TooltipPayload {
  payload: ChartDataPoint;
  value: number;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

interface ForecastDisplayProps {
  forecastData: ForecastResponse;
}

export const ForecastDisplay: React.FC<ForecastDisplayProps> = ({ forecastData }) => {
  const { forecast_data, model_info, data_summary } = forecastData;

  // Format data for chart
  const chartData: ChartDataPoint[] = forecast_data.map((point) => ({
    date: new Date(point.date).toLocaleDateString(),
    dateObj: new Date(point.date),
    amount: point.predicted_amount,
    lowerBound: point.lower_bound,
    upperBound: point.upper_bound,
    isForecast: point.is_forecast,
  }));

  // Split data into historical and forecast
  const forecastChartData = chartData.filter(d => d.isForecast);

  // Calculate forecast summary
  const totalForecast = forecastChartData.reduce((sum, point) => sum + point.amount, 0);
  const avgDailyForecast = totalForecast / forecastChartData.length;
  const maxForecast = Math.max(...forecastChartData.map(d => d.amount));
  const minForecast = Math.min(...forecastChartData.map(d => d.amount));

  // Custom tooltip for chart
  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 p-3 border border-slate-600 rounded-lg shadow-lg">
          <p className="font-medium text-slate-100">{label}</p>
          <p className="text-blue-400">
            Amount: ${data.amount.toFixed(2)}
          </p>
          {data.isForecast && (
            <>
              <p className="text-slate-400 text-sm">
                Range: ${data.lowerBound.toFixed(2)} - ${data.upperBound.toFixed(2)}
              </p>
              <p className="text-xs text-orange-400 font-medium">FORECAST</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Transactions</p>
              <p className="text-2xl font-bold text-slate-100">
                {data_summary.total_transactions.toLocaleString()}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Avg Daily Forecast</p>
              <p className="text-2xl font-bold text-green-400">
                ${avgDailyForecast.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Forecast Period</p>
              <p className="text-2xl font-bold text-orange-400">
                {model_info.forecast_horizon} days
              </p>
            </div>
            <Calendar className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Forecast</p>
              <p className="text-2xl font-bold text-purple-400">
                ${totalForecast.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Daily Spending Forecast
        </h3>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.6} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#cbd5e1' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#cbd5e1' }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Confidence interval area for forecasts - Fixed accessibility */}
              <Area
                dataKey="upperBound"
                stroke="none"
                fill="rgba(59, 130, 246, 0.3)"
                fillOpacity={0.5}
                connectNulls={false}
                name="upperBound"
              />
              <Area
                dataKey="lowerBound"
                stroke="none"
                fill="rgba(15, 23, 42, 0.9)"
                fillOpacity={1}
                connectNulls={false}
                name="lowerBound"
              />

              {/* Main line */}
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#1E40AF"
                strokeWidth={3}
                dot={false}
                connectNulls={false}
                name="Daily Amount"
              />

              {/* Forecast line with different style */}
              <Line
                type="monotone"
                dataKey={(data: ChartDataPoint) => data.isForecast ? data.amount : null}
                stroke="#D97706"
                strokeWidth={3}
                strokeDasharray="8 4"
                dot={{ fill: '#D97706', strokeWidth: 2, r: 4 }}
                connectNulls={false}
                name="Forecast"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-1 bg-blue-400 rounded"></div>
            <span className="text-slate-300 font-medium">Historical Data</span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="w-6 h-1 bg-orange-400 rounded"
              style={{
                background: 'repeating-linear-gradient(to right, #fb923c 0px, #fb923c 8px, transparent 8px, transparent 12px)'
              }}
            ></div>
            <span className="text-slate-300 font-medium">Forecast</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-3 bg-gradient-to-b from-blue-500 to-slate-700 rounded border border-slate-500"></div>
            <span className="text-slate-300 font-medium">Confidence Interval</span>
          </div>
        </div>
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
          <h4 className="font-semibold text-slate-100 mb-3">Data Summary</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Date Range:</span>
              <span className="font-medium text-slate-200">
                {new Date(data_summary.date_range.start).toLocaleDateString()} - {' '}
                {new Date(data_summary.date_range.end).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Amount:</span>
              <span className="font-medium text-slate-200">${data_summary.amount_stats.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Average Daily:</span>
              <span className="font-medium text-slate-200">${data_summary.amount_stats.mean.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Min Daily:</span>
              <span className="font-medium text-slate-200">${data_summary.amount_stats.min.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Max Daily:</span>
              <span className="font-medium text-slate-200">${data_summary.amount_stats.max.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
          <h4 className="font-semibold text-slate-100 mb-3">Model Information</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Model Type:</span>
              <span className="font-medium text-slate-200">{model_info.model_type}</span>
            </div>
            {model_info.training_days && (
              <div className="flex justify-between">
                <span className="text-slate-400">Training Days:</span>
                <span className="font-medium text-slate-200">{model_info.training_days}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Forecast Horizon:</span>
              <span className="font-medium text-slate-200">{model_info.forecast_horizon} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Generated:</span>
              <span className="font-medium text-slate-200">
                {new Date(model_info.generated_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Range Summary */}
      <div className="card">
        <h4 className="font-semibold text-slate-100 mb-3">Forecast Range Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-950 border border-green-800 rounded-lg">
            <p className="text-sm text-green-400 font-medium">Minimum Daily</p>
            <p className="text-2xl font-bold text-green-300">${minForecast.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 bg-blue-950 border border-blue-800 rounded-lg">
            <p className="text-sm text-blue-400 font-medium">Average Daily</p>
            <p className="text-2xl font-bold text-blue-300">${avgDailyForecast.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 bg-red-950 border border-red-800 rounded-lg">
            <p className="text-sm text-red-400 font-medium">Maximum Daily</p>
            <p className="text-2xl font-bold text-red-300">${maxForecast.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
