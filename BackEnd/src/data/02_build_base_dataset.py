from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from src.utils.calendar import build_week_dimension
from src.utils.io import save_dataframe, save_json
from src.utils.paths import (
    MAIN_DATASET_FILENAME,
    PROCESSED_DATA_DIR,
    REPORTS_DIR,
    ensure_directories,
    resolve_input_file,
)
from src.utils.text import clean_code, clean_text_label, standardize_columns


DSSA_RENAME_MAP = {
    "cod_provincia": "cod_provincia",
    "cod_canton": "cod_canton",
    "provincia": "provincia",
    "canton": "canton",
    "anio": "anio",
    "semana": "semana",
    "hombres": "hombres_dssa",
    "mujeres": "mujeres_dssa",
    "total": "casos_sin_signos",
    "lt_1_h": "age_lt_1_h_dssa",
    "lt_1_m": "age_lt_1_m_dssa",
    "n_1_4_h": "age_1_4_h_dssa",
    "n_1_4_m": "age_1_4_m_dssa",
    "n_5_9_h": "age_5_9_h_dssa",
    "n_5_9_m": "age_5_9_m_dssa",
    "n_10_14_h": "age_10_14_h_dssa",
    "n_10_14_m": "age_10_14_m_dssa",
    "n_15_19_h": "age_15_19_h_dssa",
    "n_15_19_m": "age_15_19_m_dssa",
    "n_20_49_h": "age_20_49_h_dssa",
    "n_20_49_m": "age_20_49_m_dssa",
    "n_50_64_h": "age_50_64_h_dssa",
    "n_50_64_m": "age_50_64_m_dssa",
    "n_65_plus_h": "age_65_plus_h_dssa",
    "n_65_plus_m": "age_65_plus_m_dssa",
}

AGE_BIN_ORDER = ["lt_1", "1_4", "5_9", "10_14", "15_19", "20_49", "50_64", "65_plus"]


def safe_mode(series: pd.Series) -> str:
    values = series.dropna().astype(str)
    if values.empty:
        return ""
    mode = values.mode()
    return mode.iloc[0] if not mode.empty else values.iloc[0]


def read_sheet(sheet_name: str) -> pd.DataFrame:
    dataset_path = resolve_input_file(MAIN_DATASET_FILENAME, env_var="DENGUE_MAIN_DATASET")
    return pd.read_excel(dataset_path, sheet_name=sheet_name)


def preprocess_dssa(df: pd.DataFrame) -> pd.DataFrame:
    cleaned = standardize_columns(df).rename(columns=DSSA_RENAME_MAP)
    cleaned["cod_provincia"] = cleaned["cod_provincia"].apply(lambda value: clean_code(value, width=2))
    cleaned["cod_canton"] = cleaned["cod_canton"].apply(lambda value: clean_code(value, width=4))
    cleaned["provincia"] = cleaned["provincia"].apply(clean_text_label)
    cleaned["canton"] = cleaned["canton"].apply(clean_text_label)

    count_columns = [column for column in cleaned.columns if column.endswith("_dssa") or column == "casos_sin_signos"]
    cleaned[count_columns] = cleaned[count_columns].fillna(0)

    group_columns = ["cod_provincia", "provincia", "cod_canton", "canton", "anio", "semana"]
    aggregated = cleaned.groupby(group_columns, as_index=False)[count_columns].sum()
    return aggregated


def convert_age_to_years(value: Any, unit: Any) -> float | None:
    if pd.isna(value):
        return None

    try:
        age_value = float(value)
    except (TypeError, ValueError):
        return None

    normalized_unit = clean_text_label(unit)
    if "MES" in normalized_unit:
        return age_value / 12.0
    if "DIA" in normalized_unit:
        return age_value / 365.0
    if "HORA" in normalized_unit:
        return age_value / (365.0 * 24.0)
    return age_value


def assign_age_bin(age_years: float | None) -> str:
    if age_years is None or np.isnan(age_years):
        return "unknown"
    if age_years < 1:
        return "lt_1"
    if age_years < 5:
        return "1_4"
    if age_years < 10:
        return "5_9"
    if age_years < 15:
        return "10_14"
    if age_years < 20:
        return "15_19"
    if age_years < 50:
        return "20_49"
    if age_years < 65:
        return "50_64"
    return "65_plus"


def preprocess_dcsa(df: pd.DataFrame) -> pd.DataFrame:
    cleaned = standardize_columns(df)
    cleaned["cod_prov_domic"] = cleaned["cod_prov_domic"].apply(lambda value: clean_code(value, width=2))
    cleaned["cod_canton_domic"] = cleaned["cod_canton_domic"].apply(lambda value: clean_code(value, width=4))
    cleaned["prov_domic"] = cleaned["prov_domic"].apply(clean_text_label)
    cleaned["canton_domic"] = cleaned["canton_domic"].apply(clean_text_label)
    cleaned["sexo"] = cleaned["sexo"].apply(clean_text_label)
    cleaned["diagnostico_final"] = cleaned["diagnostico_final"].apply(clean_text_label)
    cleaned["confirmado_por"] = cleaned["confirmado_por"].apply(clean_text_label)
    cleaned["condicion_final"] = cleaned["condicion_final"].apply(clean_text_label)

    cleaned["edad_anios"] = cleaned.apply(lambda row: convert_age_to_years(row.get("edad"), row.get("tipo_edad")), axis=1)
    cleaned["age_bin"] = cleaned["edad_anios"].apply(assign_age_bin)

    cleaned["casos_con_alarma"] = cleaned["diagnostico_final"].str.contains("SIGNOS DE ALARMA", na=False).astype(int)
    cleaned["casos_graves"] = cleaned["diagnostico_final"].str.contains("GRAVE", na=False).astype(int)
    cleaned["casos_dcsa_total"] = 1
    cleaned["fallecidos"] = (
        cleaned["condicion_final"].str.contains("MUERTO", na=False) | cleaned["fec_fallec"].notna()
    ).astype(int)
    cleaned["confirmado_laboratorio"] = cleaned["confirmado_por"].str.contains("LABORATORIO", na=False).astype(int)
    cleaned["hombres_dcsa"] = cleaned["sexo"].str.contains("MASC", na=False).astype(int)
    cleaned["mujeres_dcsa"] = cleaned["sexo"].str.contains("FEM", na=False).astype(int)

    for age_bin in AGE_BIN_ORDER:
        cleaned[f"age_{age_bin}_dcsa"] = (cleaned["age_bin"] == age_bin).astype(int)

    group_columns = ["cod_prov_domic", "prov_domic", "cod_canton_domic", "canton_domic", "anio", "se"]
    aggregate_columns = [
        "casos_con_alarma",
        "casos_graves",
        "casos_dcsa_total",
        "fallecidos",
        "confirmado_laboratorio",
        "hombres_dcsa",
        "mujeres_dcsa",
        *[f"age_{age_bin}_dcsa" for age_bin in AGE_BIN_ORDER],
    ]
    aggregated = cleaned.groupby(group_columns, as_index=False)[aggregate_columns].sum()
    aggregated = aggregated.rename(
        columns={
            "cod_prov_domic": "cod_provincia",
            "prov_domic": "provincia",
            "cod_canton_domic": "cod_canton",
            "canton_domic": "canton",
            "se": "semana",
        }
    )
    return aggregated


def build_canton_dimension(dssa_df: pd.DataFrame, dcsa_df: pd.DataFrame) -> pd.DataFrame:
    source = pd.concat(
        [
            dssa_df[["cod_provincia", "provincia", "cod_canton", "canton"]],
            dcsa_df[["cod_provincia", "provincia", "cod_canton", "canton"]],
        ],
        ignore_index=True,
    )
    source = source.dropna(subset=["cod_canton"])
    dimension = (
        source.groupby("cod_canton", as_index=False)
        .agg(
            cod_provincia=("cod_provincia", safe_mode),
            provincia=("provincia", safe_mode),
            canton=("canton", safe_mode),
        )
        .sort_values("cod_canton")
        .reset_index(drop=True)
    )
    return dimension


def build_base_dataset(dssa_weekly: pd.DataFrame, dcsa_weekly: pd.DataFrame) -> pd.DataFrame:
    canton_dim = build_canton_dimension(dssa_weekly, dcsa_weekly)
    week_dim = build_week_dimension(
        list(zip(dssa_weekly["anio"], dssa_weekly["semana"])) + list(zip(dcsa_weekly["anio"], dcsa_weekly["semana"]))
    )

    full_grid = canton_dim.assign(_key=1).merge(week_dim.assign(_key=1), on="_key").drop(columns="_key")

    merged = full_grid.merge(
        dssa_weekly.drop(columns=["cod_provincia", "provincia", "canton"]),
        on=["cod_canton", "anio", "semana"],
        how="left",
    ).merge(
        dcsa_weekly.drop(columns=["cod_provincia", "provincia", "canton"]),
        on=["cod_canton", "anio", "semana"],
        how="left",
    )

    count_columns = [
        column
        for column in merged.columns
        if column.startswith("casos_")
        or column.endswith("_dssa")
        or column.endswith("_dcsa")
        or column in {"fallecidos", "confirmado_laboratorio"}
    ]
    merged[count_columns] = merged[count_columns].fillna(0)

    merged["hombres_total"] = merged["hombres_dssa"] + merged["hombres_dcsa"]
    merged["mujeres_total"] = merged["mujeres_dssa"] + merged["mujeres_dcsa"]

    for age_bin in AGE_BIN_ORDER:
        merged[f"age_{age_bin}_total"] = (
            merged.get(f"age_{age_bin}_h_dssa", 0)
            + merged.get(f"age_{age_bin}_m_dssa", 0)
            + merged.get(f"age_{age_bin}_dcsa", 0)
        )

    merged["casos_total"] = merged["casos_sin_signos"] + merged["casos_con_alarma"] + merged["casos_graves"]
    merged["anio"] = merged["anio"].astype(int)
    merged["semana"] = merged["semana"].astype(int)
    merged["period_order"] = merged["period_order"].astype(int)

    integer_columns = [
        column
        for column in merged.columns
        if column.startswith("casos_")
        or column.endswith("_dssa")
        or column.endswith("_dcsa")
        or column.endswith("_total")
        or column in {"fallecidos", "confirmado_laboratorio", "anio", "semana", "period_order"}
    ]
    merged[integer_columns] = merged[integer_columns].round().astype(int)

    return merged.sort_values(["cod_canton", "period_order"]).reset_index(drop=True)


def build_metadata_report(base_df: pd.DataFrame) -> dict[str, Any]:
    return {
        "rows": int(base_df.shape[0]),
        "columns": int(base_df.shape[1]),
        "cantons": int(base_df["cod_canton"].nunique()),
        "periods": int(base_df["period_id"].nunique()),
        "year_range": [int(base_df["anio"].min()), int(base_df["anio"].max())],
        "weekly_case_sums": {
            "casos_sin_signos": int(base_df["casos_sin_signos"].sum()),
            "casos_con_alarma": int(base_df["casos_con_alarma"].sum()),
            "casos_graves": int(base_df["casos_graves"].sum()),
            "casos_total": int(base_df["casos_total"].sum()),
            "fallecidos": int(base_df["fallecidos"].sum()),
        },
    }


def main() -> None:
    ensure_directories()
    dssa_raw = read_sheet("DSSA_2021_2024")
    dcsa_raw = read_sheet("DCSA_DG_2021_2025")

    dssa_weekly = preprocess_dssa(dssa_raw)
    dcsa_weekly = preprocess_dcsa(dcsa_raw)
    base_df = build_base_dataset(dssa_weekly, dcsa_weekly)

    save_dataframe(base_df, PROCESSED_DATA_DIR / "weekly_base_dataset.csv")
    save_json(build_metadata_report(base_df), REPORTS_DIR / "base_dataset_report.json")
    print(f"Tabla maestra semanal guardada en: {PROCESSED_DATA_DIR / 'weekly_base_dataset.csv'}")


if __name__ == "__main__":
    main()
