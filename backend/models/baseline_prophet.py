"""
Lightweight Prophet baseline — univariate on daily spend total
"""

from pathlib import Path
from typing import Union

import joblib
import pandas as pd
from prophet import Prophet  # `poetry add prophet`


def _prep(df: pd.DataFrame) -> pd.DataFrame:
    """Prepare data for Prophet: aggregate to daily total and rename columns."""
    # aggregate to daily total
    daily = (
        df.assign(date=lambda d: d["date"].dt.date)
        .groupby("date", as_index=False)["amount"]
        .sum()
        .rename(columns={"date": "ds", "amount": "y"})
    )
    return daily


def train_prophet(df: pd.DataFrame, **kwargs) -> Prophet:
    """Train a Prophet model on daily spending totals."""
    m = Prophet(
        growth="linear", yearly_seasonality=True, daily_seasonality=False, **kwargs
    )
    m.fit(_prep(df))
    return m


def save_model(model: Prophet, out_dir: Union[str, Path]) -> Path:
    """Save trained Prophet model to disk with timestamp."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    timestamp = pd.Timestamp.utcnow().strftime("%Y%m%d_%H%M%S")
    path = out_dir / f"prophet_{timestamp}.pkl"

    joblib.dump(model, path)
    return path
