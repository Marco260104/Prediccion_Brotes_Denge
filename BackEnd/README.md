# Backend - Prediccion de Brotes de Dengue en Ecuador

Backend academico para construir un pipeline de machine learning sobre series temporales epidemiologicas con unidad de analisis `canton + anio + semana epidemiologica`.

## Objetivo

El backend implementa dos tareas complementarias:

1. Regresion: predecir el numero de casos totales de dengue para la siguiente semana.
2. Clasificacion: predecir el nivel de riesgo de brote para la siguiente semana (`bajo`, `medio`, `alto`).

Por diseno, el backend:

- usa validacion temporal estricta
- evita mezclar futuro con pasado
- construye primero una tabla maestra semanal
- genera features temporales sin fuga de informacion
- deja artefactos y reportes listos para futura integracion con frontend o API

## Estructura

```text
BackEnd/
├── data/
│   ├── raw/
│   └── processed/
├── models/
├── outputs/
│   ├── figures/
│   └── reports/
├── src/
│   ├── api/
│   ├── data/
│   ├── evaluation/
│   ├── features/
│   ├── models/
│   └── utils/
├── tests/
├── .gitignore
├── requirements.txt
├── README.md
└── main.py
```

## Datos esperados

El pipeline busca automaticamente estos archivos, en este orden:

1. `BackEnd/data/raw/`
2. la raiz del proyecto
3. `OneDrive/Escritorio` o `OneDrive/Desktop`
4. `Desktop` o `Escritorio`

Archivos requeridos:

- `Datos_Dengue_MSP_Ene2021_Ago2025.xlsx`
- `Diccionario-variables-datos-dengue.xlsx`

## Variables objetivo

- `target_casos_t_plus_1`: casos totales de la semana siguiente por canton.
- `riesgo_brote`: riesgo de la semana siguiente construido con un umbral dinamico local.

### Criterio de riesgo

El riesgo se define comparando los casos de la semana objetivo con la linea base reciente del canton:

- `bajo`: la semana siguiente tiene 0 casos.
- `medio`: la semana siguiente tiene casos, pero no supera `ceil(rolling_mean_8 + rolling_std_8)`.
- `alto`: la semana siguiente supera ese umbral dinamico.

Este criterio es defendible porque adapta el umbral al comportamiento historico reciente de cada canton en lugar de imponer un corte unico para todo el pais.

## Ejecucion

```bash
cd BackEnd
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

## Scripts

1. `src/data/01_explore_data.py`
2. `src/data/02_build_base_dataset.py`
3. `src/features/03_build_features.py`
4. `src/models/04_train_regression.py`
5. `src/models/05_train_classification.py`
6. `src/evaluation/06_evaluate_models.py`

## Salidas principales

- `data/processed/weekly_base_dataset.csv`
- `data/processed/model_ready_dataset.csv`
- `models/regression_random_forest.joblib`
- `models/classification_random_forest.joblib`
- `outputs/reports/*.json`
- `outputs/figures/*.png`

## Mejora futura

La fase 2 debe incorporar variables climaticas externas, por ejemplo temperatura y precipitacion, alineadas tambien a `canton + anio + semana epidemiologica`.
