import React from 'react';
import {
  LineChart,
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

interface ForecastDisplayProps {
  forecastData: ForecastResponse;
}

export const ForecastDisplay: React.FC<ForecastDisplayProps> = ({ forecastData }) => {
  const { forecast_data, model_info, data_summary } = forecastData;

  // Format data for chart
  const chartData = forecast_data.map((point) => ({
    date: new Date(point.date).toLocaleDateString(),
    dateObj: new Date(point.date),
    amount: point.predicted_amount,
    lowerBound: point.lower_bound,
    upperBound: point.upper_bound,
    isForecast: point.is_forecast,
  }));

  // Split data into historical and forecast
  const historicalData = chartData.filter(d => !d.isForecast);
  const forecastChartData = chartData.filter(d => d.isForecast);

  // Calculate forecast summary
  const totalForecast = forecastChartData.reduce((sum, point) => sum + point.amount, 0);
  const avgDailyForecast = totalForecast / forecastChartData.length;
  const maxForecast = Math.max(...forecastChartData.map(d => d.amount));
  const minForecast = Math.min(...forecastChartData.map(d => d.amount));

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">
            Amount: ${data.amount.toFixed(2)}
          </p>
          {data.isForecast && (
            <>
              <p className="text-gray-500 text-sm">
                Range: ${data.lowerBound.toFixed(2)} - ${data.upperBound.toFixed(2)}
              </p>
              <p className="text-xs text-orange-600 font-medium">FORECAST</p>
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
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {data_summary.total_transactions.toLocaleString()}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Daily Forecast</p>
              <p className="text-2xl font-bold text-green-600">
                ${avgDailyForecast.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Forecast Period</p>
              <p className="text-2xl font-bold text-orange-600">
                {model_info.forecast_horizon} days
              </p>
            </div>
            <Calendar className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Forecast</p>
              <p className="text-2xl font-bold text-purple-600">
                ${totalForecast.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Daily Spending Forecast
        </h3>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Confidence interval area for forecasts */}
              <Area
                dataKey="upperBound"
                stroke="none"
                fill="rgba(99, 102, 241, 0.1)"
                fillOpacity={0.3}
                connectNulls={false}
              />
              <Area
                dataKey="lowerBound"
                stroke="none"
                fill="white"
                fillOpacity={1}
                connectNulls={false}
              />

              {/* Main line */}
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                name="Daily Amount"
              />

              {/* Forecast line with different style */}
              <Line
                type="monotone"
                dataKey={(data: any) => data.isForecast ? data.amount : null}
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                connectNulls={false}
                name="Forecast"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span className="text-gray-600">Historical Data</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-orange-500" style={{ borderTop: '2px dashed #F59E0B' }}></div>
            <span className="text-gray-600">Forecast</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-blue-100 opacity-50"></div>
            <span className="text-gray-600">Confidence Interval</span>
          </div>
        </div>
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="font-semibold text-gray-900 mb-3">Data Summary</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Date Range:</span>
              <span className="font-medium">
                {new Date(data_summary.date_range.start).toLocaleDateString()} - {' '}
                {new Date(data_summary.date_range.end).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium">${data_summary.amount_stats.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Daily:</span>
              <span className="font-medium">${data_summary.amount_stats.mean.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Min Daily:</span>
              <span className="font-medium">${data_summary.amount_stats.min.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Daily:</span>
              <span className="font-medium">${data_summary.amount_stats.max.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold text-gray-900 mb-3">Model Information</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Model Type:</span>
              <span className="font-medium">{model_info.model_type}</span>
            </div>
            {model_info.training_days && (
              <div className="flex justify-between">
                <span className="text-gray-600">Training Days:</span>
                <span className="font-medium">{model_info.training_days}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Forecast Horizon:</span>
              <span className="font-medium">{model_info.forecast_horizon} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Generated:</span>
              <span className="font-medium">
                {new Date(model_info.generated_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Range Summary */}
      <div className="card">
        <h4 className="font-semibold text-gray-900 mb-3">Forecast Range Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Minimum Daily</p>
            <p className="text-2xl font-bold text-green-700">${minForecast.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Average Daily</p>
            <p className="text-2xl font-bold text-blue-700">${avgDailyForecast.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 font-medium">Maximum Daily</p>
            <p className="text-2xl font-bold text-red-700">${maxForecast.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
