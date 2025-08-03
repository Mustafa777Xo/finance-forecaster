"""
FastAPI backend for financial forecasting web application
"""

import io
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import joblib
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.models.baseline_prophet import _prep, train_prophet

# Initialize FastAPI app
app = FastAPI(
    title="Finance Forecaster API",
    description="Upload CSV files and get financial forecasts",
    version="1.0.0",
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Data models
class ForecastRequest(BaseModel):
    days: int = 30  # Number of days to forecast


class ForecastResponse(BaseModel):
    forecast_data: List[Dict[str, Any]]
    model_info: Dict[str, Any]
    data_summary: Dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    message: str


@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        message="Finance Forecaster API is running",
    )


@app.post("/api/upload-and-forecast", response_model=ForecastResponse)
async def upload_and_forecast(file: UploadFile = File(...), days: int = 30):
    """
    Upload CSV file and generate financial forecast

    Args:
        file: CSV file with transaction data (columns: date, amount, category)
        days: Number of days to forecast (default: 30)

    Returns:
        ForecastResponse with predictions and metadata
    """

    # Validate file type
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    try:
        # Read uploaded CSV
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))

        # Validate required columns
        required_columns = ["date", "amount"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {missing_columns}. "
                f"Required: {required_columns}",
            )

        # Clean and prepare data
        df = _clean_data(df)

        # Generate data summary
        data_summary = {
            "total_transactions": len(df),
            "date_range": {
                "start": df["date"].min().isoformat(),
                "end": df["date"].max().isoformat(),
            },
            "amount_stats": {
                "total": float(df["amount"].sum()),
                "mean": float(df["amount"].mean()),
                "min": float(df["amount"].min()),
                "max": float(df["amount"].max()),
            },
            "unique_days": (
                len(df["date"].dt.date.unique()) if "date" in df.columns else 0
            ),
        }

        # Train Prophet model
        model = train_prophet(df)

        # Generate forecast
        future = model.make_future_dataframe(periods=days)
        forecast = model.predict(future)

        # Prepare forecast data for frontend
        forecast_data = []
        for _, row in forecast.tail(days).iterrows():
            forecast_data.append(
                {
                    "date": row["ds"].isoformat(),
                    "predicted_amount": float(row["yhat"]),
                    "lower_bound": float(row["yhat_lower"]),
                    "upper_bound": float(row["yhat_upper"]),
                    "is_forecast": True,
                }
            )

        # Add historical data for context (last 30 days)
        historical_data = _prep(df).tail(30)
        for _, row in historical_data.iterrows():
            forecast_data.insert(
                0,
                {
                    "date": row["ds"].isoformat(),
                    "predicted_amount": float(row["y"]),
                    "lower_bound": float(row["y"]),
                    "upper_bound": float(row["y"]),
                    "is_forecast": False,
                },
            )

        # Model info
        model_info = {
            "model_type": "Prophet",
            "training_days": len(df["date"].dt.date.unique()),
            "forecast_horizon": days,
            "generated_at": datetime.now().isoformat(),
        }

        return ForecastResponse(
            forecast_data=forecast_data,
            model_info=model_info,
            data_summary=data_summary,
        )

    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Invalid CSV format")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Forecast generation failed: {str(e)}"
        )


@app.get("/api/models")
async def list_models():
    """List available saved models"""
    try:
        models_dir = Path("artifacts/models")
        if not models_dir.exists():
            return {"models": []}

        models = []
        for model_file in models_dir.glob("prophet_*.pkl"):
            models.append(
                {
                    "filename": model_file.name,
                    "created_at": datetime.fromtimestamp(
                        model_file.stat().st_mtime
                    ).isoformat(),
                    "size_kb": round(model_file.stat().st_size / 1024, 2),
                }
            )

        return {"models": sorted(models, key=lambda x: x["created_at"], reverse=True)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")


@app.post("/api/forecast-with-model")
async def forecast_with_saved_model(
    file: UploadFile = File(...), model_filename: str = None, days: int = 30
):
    """Generate forecast using a pre-trained model"""

    # Find latest model if none specified
    if not model_filename:
        models_dir = Path("artifacts/models")
        model_files = list(models_dir.glob("prophet_*.pkl"))
        if not model_files:
            raise HTTPException(status_code=404, detail="No trained models found")

        latest_model = max(model_files, key=lambda x: x.stat().st_mtime)
        model_filename = latest_model.name

    try:
        # Load model
        model_path = Path("artifacts/models") / model_filename
        if not model_path.exists():
            raise HTTPException(
                status_code=404, detail=f"Model {model_filename} not found"
            )

        model = joblib.load(model_path)

        # Read and clean data
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
        df = _clean_data(df)

        # Generate forecast using pre-trained model
        future = model.make_future_dataframe(periods=days)
        forecast = model.predict(future)

        # Format response (similar to upload_and_forecast)
        forecast_data = []
        for _, row in forecast.tail(days).iterrows():
            forecast_data.append(
                {
                    "date": row["ds"].isoformat(),
                    "predicted_amount": float(row["yhat"]),
                    "lower_bound": float(row["yhat_lower"]),
                    "upper_bound": float(row["yhat_upper"]),
                    "is_forecast": True,
                }
            )

        return {
            "forecast_data": forecast_data,
            "model_info": {
                "model_file": model_filename,
                "forecast_horizon": days,
                "generated_at": datetime.now().isoformat(),
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast failed: {str(e)}")


def _clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and validate transaction data"""

    # Convert date column to datetime
    df["date"] = pd.to_datetime(df["date"])

    # Ensure amount is numeric
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")

    # Remove rows with invalid data
    df = df.dropna(subset=["date", "amount"])

    # Remove negative amounts (if desired)
    df = df[df["amount"] >= 0]

    # Sort by date
    df = df.sort_values("date")

    return df


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(status_code=404, content={"detail": "Endpoint not found"})


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
