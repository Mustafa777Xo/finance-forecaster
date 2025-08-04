import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import type { UploadStatus } from '../types/api';

interface FileUploadProps {
  onFileUpload: (file: File, days: number) => Promise<void>;
  uploadStatus: UploadStatus;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, uploadStatus }) => {
  const [forecastDays, setForecastDays] = useState(30);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        await onFileUpload(file, forecastDays);
      }
    },
    [onFileUpload, forecastDays]
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false,
    disabled: uploadStatus.status === 'uploading'
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Forecast Days Selector */}
      <div className="mb-6">
        <label htmlFor="forecast-days" className="block text-sm font-medium text-slate-200 mb-2">
          Forecast Period
        </label>
        <select
          id="forecast-days"
          value={forecastDays}
          onChange={(e) => setForecastDays(Number(e.target.value))}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          disabled={uploadStatus.status === 'uploading'}
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
          <option value={60}>60 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>

      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed transition-colors p-8 rounded-lg text-center cursor-pointer bg-slate-800 ${
          isDragActive ? 'border-blue-400 bg-slate-700' : 'border-slate-600 hover:border-blue-500'
        } ${uploadStatus.status === 'uploading' ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center space-y-4">
          {uploadStatus.status === 'uploading' ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
              <p className="text-lg font-medium text-slate-200">Processing your data...</p>
              <p className="text-sm text-slate-400">Training model and generating forecast</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-slate-400" />
              <div className="text-center">
                {isDragActive ? (
                  <p className="text-lg font-medium text-blue-400">Drop your CSV file here</p>
                ) : (
                  <>
                    <p className="text-lg font-medium text-slate-200">
                      Drag & drop your transaction CSV file here
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      or click to browse files
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          {acceptedFiles.length > 0 && uploadStatus.status !== 'uploading' && (
            <div className="flex items-center space-x-2 text-sm text-green-400">
              <FileText className="w-4 h-4" />
              <span>{acceptedFiles[0].name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Requirements */}
      <div className="mt-4 p-4 bg-blue-950 border border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-200 mb-2">CSV File Requirements:</h4>
        <ul className="text-sm text-blue-300 space-y-1">
          <li>• Must include columns: <code className="bg-blue-900 px-1 rounded">date</code> and <code className="bg-blue-900 px-1 rounded">amount</code></li>
          <li>• Optional: <code className="bg-blue-900 px-1 rounded">category</code> column</li>
          <li>• Date format: YYYY-MM-DD or MM/DD/YYYY</li>
          <li>• Amount should be positive numbers</li>
        </ul>
      </div>

      {/* Status Messages */}
      {uploadStatus.status === 'error' && (
        <div className="mt-4 p-4 bg-red-950 border border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <h4 className="font-medium text-red-200">Upload Failed</h4>
              <p className="text-sm text-red-300 mt-1">{uploadStatus.message}</p>
            </div>
          </div>
        </div>
      )}

      {uploadStatus.status === 'success' && (
        <div className="mt-4 p-4 bg-green-950 border border-green-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-slate-900 rounded-full"></div>
            </div>
            <div>
              <h4 className="font-medium text-green-200">Success!</h4>
              <p className="text-sm text-green-300 mt-1">
                Your forecast has been generated. Scroll down to view results.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
