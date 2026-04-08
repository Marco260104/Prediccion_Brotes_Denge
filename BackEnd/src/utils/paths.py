from __future__ import annotations

import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
MODELS_DIR = PROJECT_ROOT / "models"
OUTPUTS_DIR = PROJECT_ROOT / "outputs"
FIGURES_DIR = OUTPUTS_DIR / "figures"
REPORTS_DIR = OUTPUTS_DIR / "reports"

MAIN_DATASET_FILENAME = "Datos_Dengue_MSP_Ene2021_Ago2025.xlsx"
DICTIONARY_FILENAME = "Diccionario-variables-datos-dengue.xlsx"


def ensure_directories() -> None:
    for path in [RAW_DATA_DIR, PROCESSED_DATA_DIR, MODELS_DIR, FIGURES_DIR, REPORTS_DIR]:
        path.mkdir(parents=True, exist_ok=True)


def candidate_input_directories() -> list[Path]:
    home = Path.home()
    return [
        RAW_DATA_DIR,
        PROJECT_ROOT,
        PROJECT_ROOT.parent,
        home / "OneDrive" / "Escritorio",
        home / "OneDrive" / "Desktop",
        home / "Escritorio",
        home / "Desktop",
    ]


def resolve_input_file(filename: str, env_var: str | None = None) -> Path:
    ensure_directories()

    candidates: list[Path] = []
    if env_var:
        env_path = os.getenv(env_var)
        if env_path:
            candidates.append(Path(env_path))

    for base_dir in candidate_input_directories():
        candidates.append(base_dir / filename)

    seen: set[Path] = set()
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        if candidate.exists():
            return candidate

    searched = "\n".join(f"- {path}" for path in candidates)
    raise FileNotFoundError(
        f"No se encontro el archivo requerido: {filename}\n"
        f"Rutas exploradas:\n{searched}"
    )
