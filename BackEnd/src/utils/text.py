from __future__ import annotations

import re
import unicodedata
from typing import Any

import pandas as pd


KNOWN_REPLACEMENTS = {
    "DUR?N": "DURAN",
    "AÃ±O(S)": "ANO(S)",
    "AÃ±OS": "ANOS",
}

COLUMN_ALIASES = {
    "ano": "anio",
}


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def fix_mojibake(value: Any) -> Any:
    if not isinstance(value, str):
        return value

    cleaned = value.replace("\xa0", " ").strip()
    if not cleaned:
        return cleaned

    if any(token in cleaned for token in ("Ã", "Â")):
        try:
            cleaned = cleaned.encode("latin1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass

    upper_cleaned = cleaned.upper()
    for source, target in KNOWN_REPLACEMENTS.items():
        upper_cleaned = upper_cleaned.replace(source, target)

    normalized = unicodedata.normalize("NFKC", upper_cleaned)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def clean_text_label(value: Any) -> str:
    if pd.isna(value):
        return ""
    fixed = fix_mojibake(str(value))
    ascii_text = _strip_accents(fixed)
    ascii_text = re.sub(r"\s+", " ", ascii_text)
    return ascii_text.strip().upper()


def to_snake_case(value: Any) -> str:
    text = clean_text_label(value).lower()
    text = text.replace("<", "lt_").replace(">", "gt_").replace("+", "_plus")
    text = text.replace(".", " ").replace("/", " ").replace("-", " ").replace("%", " pct ")
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    if text and text[0].isdigit():
        text = f"n_{text}"
    return text


def standardize_columns(df: pd.DataFrame) -> pd.DataFrame:
    standardized = df.copy()
    normalized_columns = []
    for column in standardized.columns:
        normalized = to_snake_case(column)
        normalized_columns.append(COLUMN_ALIASES.get(normalized, normalized))
    standardized.columns = normalized_columns
    return standardized


def clean_code(value: Any, width: int | None = None) -> str:
    if pd.isna(value):
        return ""
    digits = re.sub(r"\D", "", str(value))
    if width is not None and digits:
        digits = digits.zfill(width)
    return digits
