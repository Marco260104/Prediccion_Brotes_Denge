from __future__ import annotations

import json

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from src.utils.io import save_markdown
from src.utils.paths import FIGURES_DIR, REPORTS_DIR, ensure_directories


def load_json(path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def plot_top_features(csv_path, output_path, title: str, top_n: int = 15) -> None:
    df = pd.read_csv(csv_path).head(top_n).iloc[::-1]
    plt.figure(figsize=(10, 6))
    plt.barh(df["feature"], df["importance"], color="#0B7285")
    plt.title(title)
    plt.xlabel("Importancia")
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()


def plot_regression_predictions(prediction_path, output_path) -> None:
    df = pd.read_csv(prediction_path)
    plt.figure(figsize=(7, 7))
    plt.scatter(df["target_casos_t_plus_1"], df["prediccion_regresion"], alpha=0.35, color="#1D4ED8")
    max_value = max(df["target_casos_t_plus_1"].max(), df["prediccion_regresion"].max())
    plt.plot([0, max_value], [0, max_value], linestyle="--", color="#EF4444")
    plt.xlabel("Casos reales")
    plt.ylabel("Casos predichos")
    plt.title("Regresion: reales vs predichos")
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()


def plot_confusion_matrix(metrics_path, output_path) -> None:
    metrics = load_json(metrics_path)
    labels = metrics["test_metrics"]["labels"]
    matrix = metrics["test_metrics"]["confusion_matrix"]
    plt.figure(figsize=(7, 5))
    sns.heatmap(matrix, annot=True, fmt="d", cmap="Blues", xticklabels=labels, yticklabels=labels)
    plt.xlabel("Prediccion")
    plt.ylabel("Real")
    plt.title("Clasificacion: matriz de confusion")
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()


def build_summary(regression_metrics: dict, classification_metrics: dict) -> str:
    regression_test = regression_metrics["test_metrics"]
    classification_test = classification_metrics["test_metrics"]
    return f"""# Resumen de evaluacion del backend

## Regresion

- Modelo: {regression_metrics['model_name']}
- MAE: {regression_test['mae']:.4f}
- RMSE: {regression_test['rmse']:.4f}
- R2: {regression_test['r2']:.4f}

## Clasificacion

- Modelo: {classification_metrics['model_name']}
- Accuracy: {classification_test['accuracy']:.4f}
- Precision ponderada: {classification_test['precision_weighted']:.4f}
- Recall ponderado: {classification_test['recall_weighted']:.4f}
- F1 ponderado: {classification_test['f1_weighted']:.4f}

## Interpretabilidad

- Se generaron importancias de variables para ambos modelos.
- La estructura ya queda lista para incorporar SHAP en una fase posterior sin cambiar el pipeline de datos.
"""


def main() -> None:
    ensure_directories()
    regression_metrics_path = REPORTS_DIR / "regression_metrics.json"
    classification_metrics_path = REPORTS_DIR / "classification_metrics.json"

    regression_metrics = load_json(regression_metrics_path)
    classification_metrics = load_json(classification_metrics_path)

    plot_top_features(
        REPORTS_DIR / "regression_feature_importance.csv",
        FIGURES_DIR / "regression_feature_importance.png",
        "Top variables - modelo de regresion",
    )
    plot_top_features(
        REPORTS_DIR / "classification_feature_importance.csv",
        FIGURES_DIR / "classification_feature_importance.png",
        "Top variables - modelo de clasificacion",
    )
    plot_regression_predictions(
        REPORTS_DIR / "regression_test_predictions.csv",
        FIGURES_DIR / "regression_actual_vs_predicted.png",
    )
    plot_confusion_matrix(
        classification_metrics_path,
        FIGURES_DIR / "classification_confusion_matrix.png",
    )

    summary_markdown = build_summary(regression_metrics, classification_metrics)
    save_markdown(summary_markdown, REPORTS_DIR / "evaluation_summary.md")
    print(f"Resumen de evaluacion guardado en: {REPORTS_DIR / 'evaluation_summary.md'}")


if __name__ == "__main__":
    main()
