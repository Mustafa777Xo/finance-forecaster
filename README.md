# Finance Forecaster

A machine learning-powered financial transaction forecasting system.

## Features

- Transaction data ingestion and processing
- Prophet-based baseline forecasting model
- Prefect-powered training pipelines
- Comprehensive EDA reporting

## Quick Start

```bash
# Install dependencies
poetry install

# Process transaction data
poetry run python backend/scripts/ingest.py data/raw/transactions.csv

# Train baseline model
poetry run python flows/training_flow.py
```

## Documentation

- [Success Metrics](docs/metrics.md)
- [Model Training](docs/model_training.md)
- [EDA Report](docs/eda_2025-08-02.html)
