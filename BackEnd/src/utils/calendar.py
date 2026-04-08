from __future__ import annotations

import math
from typing import Iterable

import numpy as np
import pandas as pd


def build_week_dimension(pairs: Iterable[tuple[int, int]]) -> pd.DataFrame:
    unique_pairs = sorted({(int(year), int(week)) for year, week in pairs if pd.notna(year) and pd.notna(week)})
    records = []
    for order, (year, week) in enumerate(unique_pairs, start=1):
        records.append(
            {
                "anio": int(year),
                "semana": int(week),
                "period_id": f"{int(year)}-W{int(week):02d}",
                "period_order": order,
            }
        )
    return pd.DataFrame(records)


def add_cyclical_week_features(df: pd.DataFrame, week_column: str = "semana") -> pd.DataFrame:
    result = df.copy()
    angle = 2 * math.pi * result[week_column].astype(float) / 53.0
    result["sin_semana"] = np.sin(angle)
    result["cos_semana"] = np.cos(angle)
    return result
