# Finance Forecaster 📈

A modern, AI-powered financial forecasting web application that predicts future spending patterns using machine learning.

## 🌟 Features

- **Web Interface**: Clean, intuitive React + TypeScript frontend
- **AI Forecasting**: Prophet-based time series forecasting
- **Real-time Processing**: Upload CSV and get instant predictions
- **Interactive Charts**: Visualize forecasts with confidence intervals
- **No Authentication**: Simple, hassle-free usage
- **RESTful API**: FastAPI backend with automatic documentation

## 🚀 Quick Start (Web App)

### Option 1: One-Command Development Setup
```bash
# Start both frontend and backend
./scripts/dev.sh
```
Then open http://localhost:5173 in your browser!

### Option 2: Manual Setup
```bash
# Terminal 1: Start Backend
PYTHONPATH=. poetry run uvicorn backend.api.main:app --reload

# Terminal 2: Start Frontend
cd frontend && npm install && npm run dev
```

### Option 3: Production Build
```bash
# Build for production
./scripts/build.sh

# Deploy
cd dist && ./start.sh
```

## 📊 Using the Web App

1. **Upload CSV**: Drag & drop your transaction file
2. **Choose Forecast Period**: Select 7-90 days
3. **Get Predictions**: View interactive charts and summaries
4. **Download Results**: Save forecasts for future reference

### CSV File Format
Your CSV file should include:
- `date` column (YYYY-MM-DD or MM/DD/YYYY)
- `amount` column (positive numbers)
- Optional: `category` column

## 🛠️ Development

### Backend API
- **Framework**: FastAPI with automatic OpenAPI docs
- **Endpoints**: http://localhost:8000/docs
- **CORS**: Enabled for frontend development

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **File Upload**: React Dropzone

## 📖 Documentation

- [Success Metrics](docs/metrics.md) - Model performance criteria
- [Model Training](docs/model_training.md) - Training pipeline details
- [EDA Report](docs/eda_2025-08-02.html) - Data analysis results

## 🔧 CLI Tools (Advanced)

```bash
# Process transaction data
poetry run python backend/scripts/ingest.py data/raw/transactions.csv

# Train baseline model
PYTHONPATH=. poetry run python flows/training_flow.py

# Deploy Prefect flow
poetry run prefect deploy flows/training_flow.py
```

## 🏗️ Architecture

```
├── backend/
│   ├── api/          # FastAPI web server
│   ├── models/       # Prophet forecasting models
│   └── scripts/      # Data processing utilities
├── frontend/         # React + TypeScript web app
├── flows/           # Prefect training pipelines
├── docs/            # Documentation and reports
└── scripts/         # Development and deployment scripts
```

## 📦 Dependencies

- **Backend**: Python 3.12+, FastAPI, Prophet, Prefect
- **Frontend**: Node.js 18+, React, TypeScript, Tailwind CSS
- **ML**: Prophet (Facebook), Pandas, NumPy

## 🚀 Deployment

The application is designed for easy deployment:
- **Development**: Hot reload for both frontend and backend
- **Production**: Single-command build and deploy
- **Docker**: Ready for containerization (Dockerfile included)
- **Cloud**: Deploy to Vercel, Netlify, or any cloud provider
