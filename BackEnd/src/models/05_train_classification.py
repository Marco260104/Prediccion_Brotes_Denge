from __future__ import annotations

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline

from src.utils.io import save_dataframe, save_json
from src.utils.modeling import build_preprocessor, build_temporal_splits, classification_metrics, extract_feature_importance
from src.utils.paths import MODELS_DIR, PROCESSED_DATA_DIR, REPORTS_DIR, ensure_directories


NUMERIC_FEATURES = [
    "anio",
    "semana",
    "lag_1",
    "lag_2",
    "lag_3",
    "lag_4",
    "rolling_mean_3",
    "rolling_mean_4",
    "rolling_mean_8",
    "rolling_std_8",
    "casos_sin_signos",
    "casos_con_alarma",
    "casos_graves",
    "casos_total",
    "proporcion_graves",
    "proporcion_con_alarma",
    "proporcion_hombres",
    "proporcion_menores_15",
    "proporcion_mayores_65",
    "sin_semana",
    "cos_semana",
    "umbral_brote",
]

CATEGORICAL_FEATURES = ["cod_provincia", "provincia", "cod_canton", "canton"]
TARGET_COLUMN = "riesgo_brote"
LABELS = ["bajo", "medio", "alto"]
N_ESTIMATORS = 120
MAX_DEPTH = 18
MIN_SAMPLES_LEAF = 3


def main() -> None:
    ensure_directories()
    df = pd.read_csv(PROCESSED_DATA_DIR / "model_ready_dataset.csv")
    splits = build_temporal_splits(df)

    train_df = df[df["period_order"].isin(splits["train"])].copy()
    val_df = df[df["period_order"].isin(splits["validation"])].copy()
    test_df = df[df["period_order"].isin(splits["test"])].copy()

    preprocessor = build_preprocessor(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    model = RandomForestClassifier(
        n_estimators=N_ESTIMATORS,
        max_depth=MAX_DEPTH,
        min_samples_leaf=MIN_SAMPLES_LEAF,
        class_weight="balanced_subsample",
        n_jobs=-1,
        random_state=42,
    )
    pipeline = Pipeline(steps=[("preprocessor", preprocessor), ("model", model)])

    pipeline.fit(train_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES], train_df[TARGET_COLUMN])
    val_predictions = pipeline.predict(val_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES])
    validation_metrics = classification_metrics(val_df[TARGET_COLUMN], val_predictions, LABELS)

    final_train_df = pd.concat([train_df, val_df], ignore_index=True)
    final_pipeline = Pipeline(
        steps=[
            ("preprocessor", build_preprocessor(NUMERIC_FEATURES, CATEGORICAL_FEATURES)),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=N_ESTIMATORS,
                    max_depth=MAX_DEPTH,
                    min_samples_leaf=MIN_SAMPLES_LEAF,
                    class_weight="balanced_subsample",
                    n_jobs=-1,
                    random_state=42,
                ),
            ),
        ]
    )
    final_pipeline.fit(final_train_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES], final_train_df[TARGET_COLUMN])
    test_predictions = final_pipeline.predict(test_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES])
    test_metrics = classification_metrics(test_df[TARGET_COLUMN], test_predictions, LABELS)

    prediction_df = test_df[
        ["cod_canton", "canton", "provincia", "anio", "semana", "period_id", TARGET_COLUMN]
    ].copy()
    prediction_df["prediccion_clasificacion"] = test_predictions

    feature_importance_df = extract_feature_importance(final_pipeline)

    save_dataframe(prediction_df, REPORTS_DIR / "classification_test_predictions.csv")
    save_dataframe(feature_importance_df, REPORTS_DIR / "classification_feature_importance.csv")
    save_json(
        {
            "model_name": "RandomForestClassifier",
            "validation_metrics": validation_metrics,
            "test_metrics": test_metrics,
            "split_summary": {key: len(value) for key, value in splits.items()},
            "numeric_features": NUMERIC_FEATURES,
            "categorical_features": CATEGORICAL_FEATURES,
            "labels": LABELS,
        },
        REPORTS_DIR / "classification_metrics.json",
    )

    joblib.dump(
        {
            "pipeline": final_pipeline,
            "numeric_features": NUMERIC_FEATURES,
            "categorical_features": CATEGORICAL_FEATURES,
            "target_column": TARGET_COLUMN,
            "labels": LABELS,
            "split_summary": splits,
        },
        MODELS_DIR / "classification_random_forest.joblib",
    )
    print(f"Modelo de clasificacion guardado en: {MODELS_DIR / 'classification_random_forest.joblib'}")


if __name__ == "__main__":
    main()
