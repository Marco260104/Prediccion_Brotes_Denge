from __future__ import annotations

import json
import math
from datetime import date, timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent
FRONTEND_DATA_DIR = PROJECT_ROOT / "FrontEnd" / "src" / "data"
FRONTEND_DATA_FILE = FRONTEND_DATA_DIR / "backendSnapshot.json"

PROCESSED_DIR = BACKEND_ROOT / "data" / "processed"
REPORTS_DIR = BACKEND_ROOT / "outputs" / "reports"
MODELS_DIR = BACKEND_ROOT / "models"

MONTH_NAMES = {
    1: "Enero",
    2: "Febrero",
    3: "Marzo",
    4: "Abril",
    5: "Mayo",
    6: "Junio",
    7: "Julio",
    8: "Agosto",
    9: "Septiembre",
    10: "Octubre",
    11: "Noviembre",
    12: "Diciembre",
}
RISK_PRIORITY = {"bajo": 0, "medio": 1, "alto": 2}


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def normalize_feature_names(df: pd.DataFrame, top_n: int = 8) -> list[dict]:
    cleaned = df.copy().head(top_n)
    cleaned["feature"] = (
        cleaned["feature"]
        .str.replace("numeric__", "", regex=False)
        .str.replace("categorical__", "", regex=False)
        .str.replace("_", " ", regex=False)
        .str.upper()
    )
    max_importance = cleaned["importance"].max() or 1.0
    cleaned["pct"] = (cleaned["importance"] / max_importance * 100).round().astype(int)
    return cleaned[["feature", "importance", "pct"]].rename(columns={"feature": "name"}).to_dict(orient="records")


def build_variable_examples(model_ready_df: pd.DataFrame) -> list[dict]:
    description_map = {
        "cod_canton": "Codigo normalizado del canton.",
        "provincia": "Provincia del canton.",
        "canton": "Nombre del canton.",
        "anio": "Anio epidemiologico del registro.",
        "semana": "Semana epidemiologica.",
        "casos_total": "Casos observados en la semana actual.",
        "lag_1": "Casos de la semana anterior.",
        "rolling_mean_8": "Promedio movil de 8 semanas.",
        "proporcion_graves": "Proporcion de casos graves en la semana actual.",
        "riesgo_brote": "Etiqueta de riesgo para la semana siguiente.",
        "target_casos_t_plus_1": "Casos objetivo de la siguiente semana.",
    }
    sample_row = model_ready_df.iloc[0].to_dict()
    selected_columns = [
        "cod_canton",
        "provincia",
        "canton",
        "anio",
        "semana",
        "casos_total",
        "lag_1",
        "rolling_mean_8",
        "proporcion_graves",
        "riesgo_brote",
        "target_casos_t_plus_1",
    ]

    records = []
    for column in selected_columns:
        value = sample_row.get(column)
        example = round(value, 4) if isinstance(value, float) else value
        records.append(
            {
                "variable": column,
                "descripcion": description_map[column],
                "tipo": "numerico" if isinstance(value, (int, float)) else "categorico",
                "ejemplo": example,
            }
        )
    return records


def iso_week_start(year: int, week: int) -> date:
    year = int(year)
    week = int(week)
    try:
        return date.fromisocalendar(year, week, 1)
    except ValueError:
        last_iso_week = date(year, 12, 28).isocalendar()[1]
        safe_week = min(week, last_iso_week)
        return date.fromisocalendar(year, safe_week, 1)


def build_future_week_targets(last_year: int, last_week: int, horizon_weeks: int = 60) -> list[date]:
    current_date = iso_week_start(last_year, last_week)
    return [current_date + timedelta(weeks=offset) for offset in range(1, horizon_weeks + 1)]


def month_risk(series: pd.Series) -> str:
    labels = [value for value in series.tolist() if value in RISK_PRIORITY]
    if not labels:
        return "bajo"
    return sorted(labels, key=lambda label: RISK_PRIORITY[label], reverse=True)[0]


def safe_ratio(numerator: float, denominator: float, default: float = 0.0) -> float:
    if denominator <= 0:
        return default
    return float(numerator / denominator)


def week_to_month(year: int, week: int) -> int:
    return iso_week_start(int(year), int(week)).month


def compute_static_profile(canton_history: pd.DataFrame) -> dict[str, float]:
    recent = canton_history.tail(8).copy()
    total_recent_cases = float(recent["casos_total"].sum())
    if total_recent_cases > 0:
        share_sin = float(recent["casos_sin_signos"].sum() / total_recent_cases)
        share_alarm = float(recent["casos_con_alarma"].sum() / total_recent_cases)
        share_grave = float(recent["casos_graves"].sum() / total_recent_cases)
    else:
        share_sin, share_alarm, share_grave = 1.0, 0.0, 0.0

    share_sum = share_sin + share_alarm + share_grave
    if share_sum <= 0:
        share_sin, share_alarm, share_grave = 1.0, 0.0, 0.0
    else:
        share_sin /= share_sum
        share_alarm /= share_sum
        share_grave /= share_sum

    sex_total = float(recent["hombres_total"].sum() + recent["mujeres_total"].sum())
    menores_15 = float(recent[["age_lt_1_total", "age_1_4_total", "age_5_9_total", "age_10_14_total"]].sum().sum())
    mayores_65 = float(recent["age_65_plus_total"].sum())

    return {
        "share_sin": share_sin,
        "share_alarm": share_alarm,
        "share_grave": share_grave,
        "proporcion_hombres": safe_ratio(float(recent["hombres_total"].sum()), sex_total, default=0.5),
        "proporcion_menores_15": safe_ratio(menores_15, sex_total, default=0.0),
        "proporcion_mayores_65": safe_ratio(mayores_65, sex_total, default=0.0),
    }


def build_free_mode_profiles(model_ready_df: pd.DataFrame, weekly_base_df: pd.DataFrame) -> list[dict]:
    history = weekly_base_df.copy()
    history["calendar_month"] = history.apply(lambda row: week_to_month(row["anio"], row["semana"]), axis=1)

    profiles: list[dict] = []
    for _, canton_df in model_ready_df.sort_values(["cod_canton", "period_order"]).groupby("cod_canton"):
        latest = canton_df.iloc[-1]
        canton_history = history[history["cod_canton"].astype(str) == str(latest["cod_canton"])].copy()
        overall_mean = float(canton_history["casos_total"].mean()) if not canton_history.empty else 0.0

        month_factors = {}
        for month in range(1, 13):
            month_mean = float(canton_history[canton_history["calendar_month"] == month]["casos_total"].mean()) if not canton_history.empty else 0.0
            factor = safe_ratio(month_mean, overall_mean, default=1.0) if overall_mean > 0 else 1.0
            month_factors[str(month)] = round(float(np.clip(factor, 0.35, 3.0)), 3)

        profiles.append(
            {
                "provincia": latest["provincia"],
                "canton": latest["canton"],
                "codCanton": str(latest["cod_canton"]),
                "lastObservedYear": int(latest["anio"]),
                "lastObservedWeek": int(latest["semana"]),
                "lastObservedCases": float(latest["casos_total"]),
                "lag1": float(latest["lag_1"]),
                "lag2": float(latest["lag_2"]),
                "lag3": float(latest["lag_3"]),
                "lag4": float(latest["lag_4"]),
                "rollingMean8": float(latest["rolling_mean_8"]),
                "rollingStd8": float(latest["rolling_std_8"]),
                "outbreakThreshold": float(latest["umbral_brote"]),
                "severeShare": float(latest["proporcion_graves"]),
                "alarmShare": float(latest["proporcion_con_alarma"]),
                "monthFactors": month_factors,
            }
        )

    return sorted(profiles, key=lambda item: (item["provincia"], item["canton"]))


def project_future_forecasts(weekly_base_df: pd.DataFrame) -> tuple[list[dict], list[dict]]:
    regression_bundle = joblib.load(MODELS_DIR / "regression_random_forest.joblib")
    classification_bundle = joblib.load(MODELS_DIR / "classification_random_forest.joblib")
    regression_model = regression_bundle["pipeline"]
    classification_model = classification_bundle["pipeline"]
    regression_columns = regression_bundle["numeric_features"] + regression_bundle["categorical_features"]
    classification_columns = classification_bundle["numeric_features"] + classification_bundle["categorical_features"]

    last_row = weekly_base_df.sort_values("period_order").iloc[-1]
    future_dates = build_future_week_targets(int(last_row["anio"]), int(last_row["semana"]))

    states = []
    for _, canton_frame in weekly_base_df.sort_values(["cod_canton", "period_order"]).groupby("cod_canton"):
        history = canton_frame.tail(12).copy().reset_index(drop=True)
        last_observed = history.iloc[-1]
        states.append(
            {
                "cod_provincia": last_observed["cod_provincia"],
                "provincia": last_observed["provincia"],
                "cod_canton": last_observed["cod_canton"],
                "canton": last_observed["canton"],
                "current_date": iso_week_start(int(last_observed["anio"]), int(last_observed["semana"])),
                "cases_history": history["casos_total"].astype(float).tolist(),
                "profile": compute_static_profile(history),
            }
        )

    weekly_records: list[dict] = []

    for target_date in future_dates:
        feature_rows = []
        metadata_rows = []

        for state in states:
            cases_history = state["cases_history"]
            current_date = state["current_date"]
            profile = state["profile"]

            iso_year, iso_week, _ = current_date.isocalendar()
            angle = 2 * math.pi * iso_week / 53.0
            current_total = float(cases_history[-1])
            lag_1 = float(cases_history[-2])
            lag_2 = float(cases_history[-3])
            lag_3 = float(cases_history[-4])
            lag_4 = float(cases_history[-5])
            rolling_3 = float(np.mean(cases_history[-3:]))
            rolling_4 = float(np.mean(cases_history[-4:]))
            rolling_8 = float(np.mean(cases_history[-8:]))
            rolling_std_8 = float(np.std(cases_history[-8:], ddof=0))

            predicted_current_total = max(0.0, round(current_total))
            casos_sin = predicted_current_total * profile["share_sin"]
            casos_alarm = predicted_current_total * profile["share_alarm"]
            casos_graves = predicted_current_total * profile["share_grave"]
            umbral_brote = max(2.0, math.ceil(rolling_8 + rolling_std_8))

            feature_rows.append(
                {
                    "anio": int(iso_year),
                    "semana": int(iso_week),
                    "lag_1": lag_1,
                    "lag_2": lag_2,
                    "lag_3": lag_3,
                    "lag_4": lag_4,
                    "rolling_mean_3": rolling_3,
                    "rolling_mean_4": rolling_4,
                    "rolling_mean_8": rolling_8,
                    "rolling_std_8": rolling_std_8,
                    "casos_sin_signos": casos_sin,
                    "casos_con_alarma": casos_alarm,
                    "casos_graves": casos_graves,
                    "casos_total": predicted_current_total,
                    "proporcion_graves": safe_ratio(casos_graves, predicted_current_total, default=0.0),
                    "proporcion_con_alarma": safe_ratio(casos_alarm, predicted_current_total, default=0.0),
                    "proporcion_hombres": profile["proporcion_hombres"],
                    "proporcion_menores_15": profile["proporcion_menores_15"],
                    "proporcion_mayores_65": profile["proporcion_mayores_65"],
                    "sin_semana": math.sin(angle),
                    "cos_semana": math.cos(angle),
                    "umbral_brote": umbral_brote,
                    "cod_provincia": state["cod_provincia"],
                    "provincia": state["provincia"],
                    "cod_canton": state["cod_canton"],
                    "canton": state["canton"],
                }
            )
            metadata_rows.append(
                {
                    "state": state,
                    "rollingMean8": rolling_8,
                    "rollingStd8": rolling_std_8,
                    "outbreakThreshold": umbral_brote,
                    "lag1": lag_1,
                    "lag2": lag_2,
                    "lag3": lag_3,
                    "lag4": lag_4,
                }
            )

        feature_df = pd.DataFrame(feature_rows)
        predicted_cases_array = regression_model.predict(feature_df[regression_columns])
        predicted_risk_array = classification_model.predict(feature_df[classification_columns])

        for meta, predicted_cases, predicted_risk in zip(metadata_rows, predicted_cases_array, predicted_risk_array):
            state = meta["state"]
            target_year, target_week, _ = target_date.isocalendar()
            predicted_cases = max(0.0, float(predicted_cases))
            predicted_risk = str(predicted_risk).lower()

            weekly_records.append(
                {
                    "provincia": state["provincia"],
                    "canton": state["canton"],
                    "codCanton": str(state["cod_canton"]),
                    "targetYear": int(target_year),
                    "targetWeek": int(target_week),
                    "targetMonth": int(target_date.month),
                    "targetMonthName": MONTH_NAMES[target_date.month],
                    "targetPeriodId": f"{int(target_year)}-W{int(target_week):02d}",
                    "projectedCases": round(predicted_cases, 2),
                    "projectedRisk": predicted_risk,
                    "rollingMean8": round(meta["rollingMean8"], 2),
                    "rollingStd8": round(meta["rollingStd8"], 2),
                    "outbreakThreshold": meta["outbreakThreshold"],
                    "lag1": round(meta["lag1"], 2),
                    "lag2": round(meta["lag2"], 2),
                    "lag3": round(meta["lag3"], 2),
                    "lag4": round(meta["lag4"], 2),
                }
            )

            state["cases_history"].append(predicted_cases)
            state["cases_history"] = state["cases_history"][-8:]
            state["current_date"] = target_date

    weekly_forecasts_df = pd.DataFrame(weekly_records)
    weekly_forecasts_df = weekly_forecasts_df[weekly_forecasts_df["targetYear"] == 2026].copy()

    monthly_forecasts_df = (
        weekly_forecasts_df.groupby(["provincia", "canton", "codCanton", "targetYear", "targetMonth", "targetMonthName"], as_index=False)
        .agg(
            projectedCases=("projectedCases", "sum"),
            avgWeeklyCases=("projectedCases", "mean"),
            maxWeeklyCases=("projectedCases", "max"),
            projectedRisk=("projectedRisk", month_risk),
            outbreakThreshold=("outbreakThreshold", "max"),
            rollingMean8=("rollingMean8", "mean"),
            weeks=("targetPeriodId", "count"),
        )
    )

    monthly_forecasts_df["projectedCases"] = monthly_forecasts_df["projectedCases"].round(2)
    monthly_forecasts_df["avgWeeklyCases"] = monthly_forecasts_df["avgWeeklyCases"].round(2)
    monthly_forecasts_df["maxWeeklyCases"] = monthly_forecasts_df["maxWeeklyCases"].round(2)
    monthly_forecasts_df["rollingMean8"] = monthly_forecasts_df["rollingMean8"].round(2)

    return (
        monthly_forecasts_df.sort_values(["provincia", "canton", "targetYear", "targetMonth"]).to_dict(orient="records"),
        weekly_forecasts_df.sort_values(["provincia", "canton", "targetYear", "targetWeek"]).to_dict(orient="records"),
    )


def main() -> None:
    weekly_base_df = pd.read_csv(PROCESSED_DIR / "weekly_base_dataset.csv")
    model_ready_df = pd.read_csv(PROCESSED_DIR / "model_ready_dataset.csv")

    regression_metrics = load_json(REPORTS_DIR / "regression_metrics.json")
    classification_metrics = load_json(REPORTS_DIR / "classification_metrics.json")

    regression_importance = pd.read_csv(REPORTS_DIR / "regression_feature_importance.csv")
    classification_importance = pd.read_csv(REPORTS_DIR / "classification_feature_importance.csv")
    regression_predictions = pd.read_csv(REPORTS_DIR / "regression_test_predictions.csv")
    classification_predictions = pd.read_csv(REPORTS_DIR / "classification_test_predictions.csv")

    predictions_df = regression_predictions.merge(
        classification_predictions,
        on=["cod_canton", "canton", "provincia", "anio", "semana", "period_id"],
        how="inner",
    ).merge(
        model_ready_df[
            [
                "cod_canton",
                "anio",
                "semana",
                "lag_1",
                "lag_2",
                "lag_3",
                "lag_4",
                "rolling_mean_8",
                "rolling_std_8",
                "umbral_brote",
                "proporcion_graves",
                "proporcion_con_alarma",
            ]
        ],
        on=["cod_canton", "anio", "semana"],
        how="left",
    )

    split_summary = regression_metrics["split_summary"]
    split_total = sum(split_summary.values())
    monthly_forecasts, weekly_forecasts = project_future_forecasts(weekly_base_df)

    payload = {
        "overview": {
            "totalCases": int(weekly_base_df["casos_total"].sum()),
            "casosSinSignos": int(weekly_base_df["casos_sin_signos"].sum()),
            "casosConAlarma": int(weekly_base_df["casos_con_alarma"].sum()),
            "casosGraves": int(weekly_base_df["casos_graves"].sum()),
            "fallecidos": int(weekly_base_df["fallecidos"].sum()),
            "cantons": int(weekly_base_df["cod_canton"].nunique()),
            "periods": int(weekly_base_df["period_id"].nunique()),
            "modelReadyRows": int(model_ready_df.shape[0]),
            "yearMin": int(weekly_base_df["anio"].min()),
            "yearMax": int(weekly_base_df["anio"].max()),
        },
        "yearlyCases": (
            weekly_base_df.groupby("anio", as_index=False)["casos_total"]
            .sum()
            .rename(columns={"anio": "year", "casos_total": "cases"})
            .to_dict(orient="records")
        ),
        "topCantons": (
            weekly_base_df.groupby(["canton", "provincia"], as_index=False)["casos_total"]
            .sum()
            .sort_values("casos_total", ascending=False)
            .head(8)
            .rename(columns={"casos_total": "cases"})
            .to_dict(orient="records")
        ),
        "topProvinces": (
            weekly_base_df.groupby("provincia", as_index=False)["casos_total"]
            .sum()
            .sort_values("casos_total", ascending=False)
            .head(8)
            .rename(columns={"casos_total": "cases", "provincia": "province"})
            .to_dict(orient="records")
        ),
        "ageDistribution": [
            {"group": "<1", "cases": int(weekly_base_df["age_lt_1_total"].sum())},
            {"group": "1-4", "cases": int(weekly_base_df["age_1_4_total"].sum())},
            {"group": "5-9", "cases": int(weekly_base_df["age_5_9_total"].sum())},
            {"group": "10-14", "cases": int(weekly_base_df["age_10_14_total"].sum())},
            {"group": "15-19", "cases": int(weekly_base_df["age_15_19_total"].sum())},
            {"group": "20-49", "cases": int(weekly_base_df["age_20_49_total"].sum())},
            {"group": "50-64", "cases": int(weekly_base_df["age_50_64_total"].sum())},
            {"group": "65+", "cases": int(weekly_base_df["age_65_plus_total"].sum())},
        ],
        "sexDistribution": {
            "hombres": int(weekly_base_df["hombres_total"].sum()),
            "mujeres": int(weekly_base_df["mujeres_total"].sum()),
        },
        "variablesSample": build_variable_examples(model_ready_df),
        "freeModeProfiles": build_free_mode_profiles(model_ready_df, weekly_base_df),
        "training": {
            "split": {
                "trainWeeks": int(split_summary["train"]),
                "validationWeeks": int(split_summary["validation"]),
                "testWeeks": int(split_summary["test"]),
                "trainPct": round(split_summary["train"] / split_total * 100, 1),
                "validationPct": round(split_summary["validation"] / split_total * 100, 1),
                "testPct": round(split_summary["test"] / split_total * 100, 1),
            },
            "regression": {
                **regression_metrics["test_metrics"],
                "modelName": regression_metrics["model_name"],
                "topFeatures": normalize_feature_names(regression_importance),
            },
            "classification": {
                **classification_metrics["test_metrics"],
                "modelName": classification_metrics["model_name"],
                "topFeatures": normalize_feature_names(classification_importance),
            },
        },
        "predictions": predictions_df.sort_values(["canton", "anio", "semana"])
        .rename(
            columns={
                "cod_canton": "codCanton",
                "period_id": "periodId",
                "target_casos_t_plus_1": "actualCases",
                "prediccion_regresion": "predictedCases",
                "riesgo_brote": "actualRisk",
                "prediccion_clasificacion": "predictedRisk",
                "rolling_mean_8": "rollingMean8",
                "rolling_std_8": "rollingStd8",
                "umbral_brote": "outbreakThreshold",
                "proporcion_graves": "severeShare",
                "proporcion_con_alarma": "alarmShare",
            }
        )
        .round({"predictedCases": 2, "rollingMean8": 2, "rollingStd8": 2, "severeShare": 4, "alarmShare": 4})
        .to_dict(orient="records"),
        "futureForecasts": {
            "monthly": monthly_forecasts,
            "weekly": weekly_forecasts,
        },
    }

    FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with FRONTEND_DATA_FILE.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)

    print(f"Snapshot para frontend guardado en: {FRONTEND_DATA_FILE}")


if __name__ == "__main__":
    main()
