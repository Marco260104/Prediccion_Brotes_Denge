from __future__ import annotations

import numpy as np
import pandas as pd

from src.utils.calendar import add_cyclical_week_features
from src.utils.io import save_dataframe, save_json
from src.utils.paths import PROCESSED_DATA_DIR, REPORTS_DIR, ensure_directories


def build_temporal_features(base_df: pd.DataFrame) -> pd.DataFrame:
    df = base_df.sort_values(["cod_canton", "period_order"]).reset_index(drop=True).copy()
    grouped = df.groupby("cod_canton", group_keys=False)

    df["target_casos_t_plus_1"] = grouped["casos_total"].shift(-1)
    df["lag_1"] = grouped["casos_total"].shift(1)
    df["lag_2"] = grouped["casos_total"].shift(2)
    df["lag_3"] = grouped["casos_total"].shift(3)
    df["lag_4"] = grouped["casos_total"].shift(4)

    df["rolling_mean_3"] = grouped["casos_total"].transform(lambda series: series.rolling(window=3, min_periods=3).mean())
    df["rolling_mean_4"] = grouped["casos_total"].transform(lambda series: series.rolling(window=4, min_periods=4).mean())
    df["rolling_mean_8"] = grouped["casos_total"].transform(lambda series: series.rolling(window=8, min_periods=8).mean())
    df["rolling_std_8"] = grouped["casos_total"].transform(
        lambda series: series.rolling(window=8, min_periods=8).std(ddof=0)
    )

    df["history_weeks_available"] = grouped.cumcount() + 1

    df["proporcion_graves"] = np.where(df["casos_total"] > 0, df["casos_graves"] / df["casos_total"], 0.0)
    df["proporcion_con_alarma"] = np.where(df["casos_total"] > 0, df["casos_con_alarma"] / df["casos_total"], 0.0)

    demographic_total = df["hombres_total"] + df["mujeres_total"]
    df["proporcion_hombres"] = np.where(demographic_total > 0, df["hombres_total"] / demographic_total, 0.0)
    df["casos_menores_15"] = df[["age_lt_1_total", "age_1_4_total", "age_5_9_total", "age_10_14_total"]].sum(axis=1)
    df["proporcion_menores_15"] = np.where(demographic_total > 0, df["casos_menores_15"] / demographic_total, 0.0)
    df["proporcion_mayores_65"] = np.where(demographic_total > 0, df["age_65_plus_total"] / demographic_total, 0.0)

    df = add_cyclical_week_features(df, week_column="semana")

    df["umbral_brote"] = np.maximum(2.0, np.ceil(df["rolling_mean_8"].fillna(0.0) + df["rolling_std_8"].fillna(0.0)))

    def assign_risk(row: pd.Series) -> str | None:
        target = row["target_casos_t_plus_1"]
        if pd.isna(target):
            return None
        if target == 0:
            return "bajo"
        if target <= row["umbral_brote"]:
            return "medio"
        return "alto"

    df["riesgo_brote"] = df.apply(assign_risk, axis=1)
    df["riesgo_brote_cod"] = df["riesgo_brote"].map({"bajo": 0, "medio": 1, "alto": 2})

    return df


def build_model_ready_dataset(feature_df: pd.DataFrame) -> pd.DataFrame:
    model_df = feature_df.copy()
    model_df = model_df[model_df["history_weeks_available"] >= 8]
    model_df = model_df[model_df["target_casos_t_plus_1"].notna()]

    lag_columns = ["lag_1", "lag_2", "lag_3", "lag_4", "rolling_mean_3", "rolling_mean_4", "rolling_mean_8", "rolling_std_8"]
    model_df[lag_columns] = model_df[lag_columns].fillna(0.0)
    model_df["target_casos_t_plus_1"] = model_df["target_casos_t_plus_1"].astype(int)

    return model_df.reset_index(drop=True)


def build_feature_report(model_df: pd.DataFrame) -> dict:
    risk_distribution = model_df["riesgo_brote"].value_counts(dropna=False).to_dict()
    return {
        "rows": int(model_df.shape[0]),
        "columns": int(model_df.shape[1]),
        "cantons": int(model_df["cod_canton"].nunique()),
        "periods": int(model_df["period_id"].nunique()),
        "target_summary": {
            "min": int(model_df["target_casos_t_plus_1"].min()),
            "max": int(model_df["target_casos_t_plus_1"].max()),
            "mean": float(model_df["target_casos_t_plus_1"].mean()),
            "median": float(model_df["target_casos_t_plus_1"].median()),
        },
        "risk_distribution": {str(key): int(value) for key, value in risk_distribution.items()},
    }


def main() -> None:
    ensure_directories()
    base_df = pd.read_csv(PROCESSED_DATA_DIR / "weekly_base_dataset.csv")
    feature_df = build_temporal_features(base_df)
    model_df = build_model_ready_dataset(feature_df)

    save_dataframe(feature_df, PROCESSED_DATA_DIR / "weekly_features_dataset.csv")
    save_dataframe(model_df, PROCESSED_DATA_DIR / "model_ready_dataset.csv")
    save_json(build_feature_report(model_df), REPORTS_DIR / "feature_report.json")
    print(f"Dataset de modelado guardado en: {PROCESSED_DATA_DIR / 'model_ready_dataset.csv'}")


if __name__ == "__main__":
    main()
