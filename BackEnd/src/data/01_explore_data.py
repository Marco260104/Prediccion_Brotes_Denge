from __future__ import annotations

import json

import pandas as pd

from src.utils.io import save_json
from src.utils.paths import (
    DICTIONARY_FILENAME,
    MAIN_DATASET_FILENAME,
    REPORTS_DIR,
    ensure_directories,
    resolve_input_file,
)
from src.utils.text import standardize_columns


def profile_sheet(path: str, sheet_name: str) -> dict:
    df = pd.read_excel(path, sheet_name=sheet_name)
    normalized = standardize_columns(df)
    null_counts = normalized.isna().sum()
    return {
        "shape": {"rows": int(normalized.shape[0]), "columns": int(normalized.shape[1])},
        "columns": normalized.columns.tolist(),
        "dtypes": {column: str(dtype) for column, dtype in normalized.dtypes.items()},
        "null_counts": {column: int(value) for column, value in null_counts.items() if int(value) > 0},
        "sample_rows": json.loads(normalized.head(3).to_json(orient="records", force_ascii=False, date_format="iso")),
    }


def workbook_summary(file_path) -> dict:
    workbook = pd.ExcelFile(file_path)
    summary = {"file": str(file_path), "sheets": {}}
    for sheet_name in workbook.sheet_names:
        summary["sheets"][sheet_name] = profile_sheet(file_path, sheet_name)
    return summary


def main() -> None:
    ensure_directories()
    dataset_path = resolve_input_file(MAIN_DATASET_FILENAME, env_var="DENGUE_MAIN_DATASET")
    dictionary_path = resolve_input_file(DICTIONARY_FILENAME, env_var="DENGUE_DICTIONARY_DATASET")

    report = {
        "main_dataset": workbook_summary(dataset_path),
        "dictionary_dataset": workbook_summary(dictionary_path),
    }

    save_json(report, REPORTS_DIR / "exploration_report.json")
    print(f"Reporte de exploracion guardado en: {REPORTS_DIR / 'exploration_report.json'}")


if __name__ == "__main__":
    main()
