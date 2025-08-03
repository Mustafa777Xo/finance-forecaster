"""
Prefect flow: train + register Prophet baseline
Run with:  poetry run prefect deploy flows/training_flow.py
"""

from pathlib import Path

import pandas as pd
from prefect import flow, get_run_logger, task

from backend.models.baseline_prophet import save_model, train_prophet

DATA_DIR = Path("data/processed")
MODEL_DIR = Path("artifacts/models")


@task
def load_latest_snapshot() -> pd.DataFrame:
    """Load the most recent processed transaction data."""
    latest = max(DATA_DIR.glob("transactions_*.parquet"))
    return pd.read_parquet(latest)


@task
def split(df: pd.DataFrame, cutoff: str = "2024-12-31"):
    """Split data into train/test based on date cutoff."""
    train = df[df["date"] <= cutoff]
    test = df[df["date"] > cutoff]
    return train, test


@flow(name="baseline_training_pipeline")
def training_flow():
    """Main training pipeline for Prophet baseline model."""
    log = get_run_logger()

    # Load and split data
    df = load_latest_snapshot()
    train, test = split(df)
    log.info("Train rows=%s  Test rows=%s", len(train), len(test))

    # Train and save model
    model = train_prophet(train)
    model_path = save_model(model, MODEL_DIR)
    log.info("Saved model ➜ %s", model_path)


if __name__ == "__main__":
    training_flow()
