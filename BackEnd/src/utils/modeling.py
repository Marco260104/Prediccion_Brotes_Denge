from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    mean_absolute_error,
    precision_recall_fscore_support,
    r2_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


def build_temporal_splits(
    df: pd.DataFrame,
    *,
    order_column: str = "period_order",
    val_fraction: float = 0.15,
    test_fraction: float = 0.15,
) -> dict[str, list[int]]:
    unique_periods = sorted(df[order_column].dropna().astype(int).unique().tolist())
    n_periods = len(unique_periods)
    if n_periods < 12:
        raise ValueError("No hay suficientes semanas para construir train/validation/test temporales.")

    test_size = max(1, int(round(n_periods * test_fraction)))
    val_size = max(1, int(round(n_periods * val_fraction)))
    train_size = n_periods - val_size - test_size

    if train_size < 6:
        raise ValueError("El segmento de entrenamiento es demasiado pequeno para entrenar el modelo.")

    return {
        "train": unique_periods[:train_size],
        "validation": unique_periods[train_size : train_size + val_size],
        "test": unique_periods[train_size + val_size :],
    }


def build_preprocessor(numeric_features: list[str], categorical_features: list[str]) -> ColumnTransformer:
    try:
        encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=True)
    except TypeError:
        encoder = OneHotEncoder(handle_unknown="ignore", sparse=True)

    return ColumnTransformer(
        transformers=[
            ("numeric", "passthrough", numeric_features),
            ("categorical", encoder, categorical_features),
        ],
        sparse_threshold=1.0,
    )


def regression_metrics(y_true: pd.Series, y_pred: np.ndarray) -> dict[str, float]:
    try:
        from sklearn.metrics import root_mean_squared_error

        rmse = float(root_mean_squared_error(y_true, y_pred))
    except ImportError:
        from sklearn.metrics import mean_squared_error

        rmse = float(mean_squared_error(y_true, y_pred, squared=False))

    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": rmse,
        "r2": float(r2_score(y_true, y_pred)),
    }


def classification_metrics(y_true: pd.Series, y_pred: np.ndarray, labels: list[str]) -> dict[str, Any]:
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true,
        y_pred,
        labels=labels,
        average="weighted",
        zero_division=0,
    )
    matrix = confusion_matrix(y_true, y_pred, labels=labels)
    report = classification_report(y_true, y_pred, labels=labels, output_dict=True, zero_division=0)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_weighted": float(precision),
        "recall_weighted": float(recall),
        "f1_weighted": float(f1),
        "labels": labels,
        "confusion_matrix": matrix.tolist(),
        "classification_report": report,
    }


def extract_feature_importance(model_pipeline: Pipeline) -> pd.DataFrame:
    preprocessor = model_pipeline.named_steps["preprocessor"]
    model = model_pipeline.named_steps["model"]
    feature_names = preprocessor.get_feature_names_out()
    importance = model.feature_importances_
    importance_df = pd.DataFrame({"feature": feature_names, "importance": importance})
    return importance_df.sort_values("importance", ascending=False).reset_index(drop=True)
