from __future__ import annotations

import argparse
import os
import runpy
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent

STEPS = [
    ("explore", PROJECT_ROOT / "src" / "data" / "01_explore_data.py"),
    ("build_base", PROJECT_ROOT / "src" / "data" / "02_build_base_dataset.py"),
    ("build_features", PROJECT_ROOT / "src" / "features" / "03_build_features.py"),
    ("train_regression", PROJECT_ROOT / "src" / "models" / "04_train_regression.py"),
    ("train_classification", PROJECT_ROOT / "src" / "models" / "05_train_classification.py"),
    ("evaluate", PROJECT_ROOT / "src" / "evaluation" / "06_evaluate_models.py"),
]


def run_script(script_path: Path) -> None:
    runpy.run_path(str(script_path), run_name="__main__")


def main() -> None:
    parser = argparse.ArgumentParser(description="Pipeline backend para prediccion de brotes de dengue.")
    parser.add_argument(
        "--step",
        choices=["all", *[name for name, _ in STEPS]],
        default="all",
        help="Permite ejecutar una etapa puntual o el pipeline completo.",
    )
    args = parser.parse_args()

    os.chdir(PROJECT_ROOT)

    if args.step == "all":
        for name, script_path in STEPS:
            print(f"[RUN] {name} -> {script_path.name}")
            run_script(script_path)
    else:
        for name, script_path in STEPS:
            if name == args.step:
                print(f"[RUN] {name} -> {script_path.name}")
                run_script(script_path)
                break


if __name__ == "__main__":
    main()
