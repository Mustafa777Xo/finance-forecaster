# Model Training Pipeline

## Overview

This document describes the baseline Prophet model training pipeline for financial transaction forecasting.

## Components

### 1. Baseline Prophet Model (`backend/models/baseline_prophet.py`)

A lightweight Prophet-based forecasting model that:
- Aggregates transaction data to daily spending totals
- Uses Prophet for time series forecasting with yearly seasonality
- Provides a simple baseline for financial forecasting

**Key Functions:**
- `train_prophet()`: Train a Prophet model on daily spending data
- `save_model()`: Save trained model with timestamp
- `_prep()`: Prepare data by aggregating to daily totals

### 2. Training Flow (`flows/training_flow.py`)

A Prefect-based workflow that orchestrates:
- Loading latest transaction data
- Train/test data splitting
- Model training and persistence

**Tasks:**
- `load_latest_snapshot()`: Load most recent processed data
- `split()`: Split data based on date cutoff
- `training_flow()`: Main pipeline orchestration

## Usage

### Prerequisites
```bash
# Install dependencies
poetry install

# Ensure you have processed transaction data
ls data/processed/transactions_*.parquet
```

### Running the Training Pipeline

#### Option 1: Direct Execution
```bash
poetry run python flows/training_flow.py
```

#### Option 2: Prefect Deployment (Recommended)
```bash
# Deploy the flow
poetry run prefect deploy flows/training_flow.py

# Run via Prefect UI or CLI
poetry run prefect deployment run "baseline_training_pipeline/default"
```

### Configuration

**Data Split:**
- Default cutoff: `2024-12-31`
- Customize by modifying the `split()` task parameter

**Model Parameters:**
- Growth: Linear
- Yearly seasonality: Enabled
- Daily seasonality: Disabled
- Additional Prophet parameters can be passed via `**kwargs`

### Output

**Model Artifacts:**
- Saved to: `artifacts/models/prophet_YYYYMMDD_HHMMSS.pkl`
- Format: Joblib pickle file
- Includes full trained Prophet model

**Logging:**
- Training/test split information
- Model save path confirmation
- Prefect flow execution details

## Model Details

### Data Preprocessing
1. **Date Normalization**: Convert timestamps to date-only
2. **Daily Aggregation**: Sum all transactions per day
3. **Prophet Format**: Rename columns to `ds` (date) and `y` (value)

### Prophet Configuration
```python
Prophet(
    growth="linear",           # Linear trend
    yearly_seasonality=True,   # Account for seasonal patterns
    daily_seasonality=False    # No daily patterns (using daily data)
)
```

### Expected Performance
- **Use Case**: Daily spending pattern forecasting
- **Horizon**: 30-day forecasts (as per success metrics)
- **Input**: Historical transaction data
- **Output**: Daily spending predictions with confidence intervals

## Integration with Success Metrics

This baseline model supports the defined success metrics:
- **Primary**: MAE ≤ 5% of average monthly income
- **Secondary**: 90%+ prediction interval coverage
- **Monitoring**: Rolling MAE tracking for retrain triggers

## Next Steps

1. **Model Evaluation**: Implement backtesting framework
2. **Model Serving**: Add prediction endpoint
3. **Advanced Models**: Multivariate forecasting with categories
4. **MLflow Integration**: Model versioning and experiment tracking

---

*For questions or issues, refer to the project documentation or create an issue.*
