import { useState } from 'react';
import Navbar from '../components/Navbar';
import backendSnapshot from '../data/backendSnapshot.json';

/* ── Experimentos fallidos ── */
const EXP_REGRESION = [
  {
    id: 'R-1', status: 'fail', statusLabel: 'Descartado',
    name: 'Random Forest con CV aleatorio',
    sub: 'n_estimators=100 · max_depth=None · cross-validation k=5 aleatorio',
    metrics: [
      { label: 'R² (CV)', value: '0.97', tone: 'bad' },
      { label: 'MAE (CV)', value: '0.82', tone: 'bad' },
      { label: 'R² real est.', value: '~0.60', tone: 'bad' },
    ],
    why: 'El CV aleatorio mezcla semanas futuras en el entrenamiento (data leakage severo). R²=0.97 era inflado artificialmente. Al evaluar con datos realmente futuros el rendimiento colapsaba.',
    tag: 'Data leakage',
  },
  {
    id: 'R-2', status: 'fail', statusLabel: 'Descartado',
    name: 'Regresión lineal con features crudas',
    sub: 'LinearRegression · sin lags · solo casos_total + semana + provincia',
    metrics: [
      { label: 'R² (test)', value: '0.41', tone: 'bad' },
      { label: 'MAE (test)', value: '8.34', tone: 'bad' },
      { label: 'RMSE (test)', value: '18.2', tone: 'bad' },
    ],
    why: 'La relación casos → casos+1 no es lineal. Sin lags ni rolling el modelo no captura la inercia epidemiológica. R²=0.41 es inútil para alertas tempranas.',
    tag: 'Relación no lineal',
  },
  {
    id: 'R-3', status: 'mid', statusLabel: 'Overfitting',
    name: 'Random Forest sobreajustado',
    sub: 'n_estimators=500 · max_depth=None · min_samples_leaf=1',
    metrics: [
      { label: 'R² (train)', value: '0.99', tone: 'mid' },
      { label: 'R² (test)', value: '0.71', tone: 'mid' },
      { label: 'Gap train/test', value: '0.28', tone: 'mid' },
    ],
    why: 'Sin min_samples_leaf cada hoja memoriza 1–2 muestras. Con 500 árboles sin podado aprende ruido de cantones pequeños. Brecha de 0.28 en R² confirma sobreajuste.',
    tag: 'max_depth=None',
  },
  {
    id: 'R-4', status: 'mid', statusLabel: 'Tiempo + rendimiento',
    name: 'Gradient Boosting sin tuning',
    sub: 'GradientBoostingRegressor · n_estimators=200 · learning_rate=0.1 · max_depth=6',
    metrics: [
      { label: 'R² (test)', value: '0.83', tone: 'mid' },
      { label: 'MAE (test)', value: '2.89', tone: 'mid' },
      { label: 'Tiempo entreno', value: '12×', tone: 'mid' },
    ],
    why: 'Con series de dengue el boosting secuencial amplifica errores en semanas de brote intenso. R²=0.83 contra 0.896 del RF final con 12× más tiempo. No justifica la complejidad.',
    tag: 'Gradient Boosting',
  },
  {
    id: 'R-5', status: 'fail', statusLabel: 'Descartado',
    name: 'Random Forest sin features temporales',
    sub: 'n_estimators=120 · max_depth=18 · sin lags · sin rolling · sin sin/cos semana',
    metrics: [
      { label: 'R² (test)', value: '0.52', tone: 'bad' },
      { label: 'MAE (test)', value: '5.67', tone: 'bad' },
      { label: 'RMSE (test)', value: '11.3', tone: 'bad' },
    ],
    why: 'Sin historial reciente el modelo no sabe si los casos van subiendo o bajando. R² cae de 0.896 a 0.52 — evidencia directa de la importancia del feature engineering temporal.',
    tag: 'Sin lags',
  },
];

const EXP_CLASIFICACION = [
  {
    id: 'C-1', status: 'fail', statusLabel: 'Sesgo severo',
    name: 'RF sin balanceo de clases',
    sub: 'n_estimators=120 · max_depth=18 · sin class_weight',
    metrics: [
      { label: 'Accuracy', value: '0.74', tone: 'mid' },
      { label: 'F1 clase "alto"', value: '0.09', tone: 'bad' },
      { label: 'Brotes no detect.', value: '91%', tone: 'bad' },
    ],
    why: 'Accuracy alta pero inútil. El modelo predice casi todo como "bajo" porque el 92% de datos no es "alto". F1=0.09 en brotes reales. En epidemiología un falso negativo tiene consecuencias graves.',
    tag: 'Sin balanceo',
  },
  {
    id: 'C-2', status: 'fail', statusLabel: 'Descartado',
    name: 'Decision Tree simple',
    sub: 'DecisionTreeClassifier · max_depth=10 · class_weight="balanced"',
    metrics: [
      { label: 'Accuracy', value: '0.61', tone: 'bad' },
      { label: 'F1-weighted', value: '0.58', tone: 'bad' },
      { label: 'F1 clase "alto"', value: '0.21', tone: 'bad' },
    ],
    why: 'Un árbol único es muy sensible a outliers en datos de dengue (picos epidémicos locales). Sin el promediado de un ensemble las predicciones son inestables. Accuracy 10pp menor que el RF final.',
    tag: 'Alta varianza',
  },
  {
    id: 'C-3', status: 'mid', statusLabel: 'Demasiado simple',
    name: 'Logistic Regression multinomial',
    sub: 'LogisticRegression · multi_class="multinomial" · C=1.0 · max_iter=500',
    metrics: [
      { label: 'Accuracy', value: '0.55', tone: 'mid' },
      { label: 'F1-weighted', value: '0.53', tone: 'mid' },
      { label: 'F1 clase "alto"', value: '0.17', tone: 'bad' },
    ],
    why: 'La frontera entre "medio" y "alto" no es lineal — depende de lags, rolling std y umbral de brote. La regresión logística asume separabilidad lineal. Falla especialmente en clase "alto" (F1=0.17).',
    tag: 'Relación no lineal',
  },
  {
    id: 'C-4', status: 'mid', statusLabel: 'Sin contexto local',
    name: 'RF con umbral fijo',
    sub: 'Mismos hiperparámetros · umbral_brote fijo=5 para todos los cantones',
    metrics: [
      { label: 'Accuracy', value: '0.67', tone: 'mid' },
      { label: 'F1-weighted', value: '0.64', tone: 'mid' },
      { label: 'F1 clase "alto"', value: '0.24', tone: 'mid' },
    ],
    why: 'Un umbral fijo ignora la realidad local. En cantones rurales de 2,000 hab., 5 casos es un brote grave. En Quito es ruido de fondo. El umbral dinámico por cantón es fundamental.',
    tag: 'Umbral fijo',
  },
  {
    id: 'C-5', status: 'fail', statusLabel: 'Inescalable',
    name: 'SVM con RBF kernel',
    sub: 'SVC · kernel="rbf" · C=10 · gamma="scale" · class_weight="balanced"',
    metrics: [
      { label: 'Accuracy', value: '0.68', tone: 'mid' },
      { label: 'F1-weighted', value: '0.65', tone: 'mid' },
      { label: 'Tiempo entreno', value: '180×', tone: 'bad' },
    ],
    why: 'Con ~30,000 filas el SVM escala O(n²). Entrenamiento 180× más lento que RF. Sin importancia de features, sin probabilidades y no escala con más datos históricos del MSP.',
    tag: 'Inescalable',
  },
];

const TONE_COLORS = {
  bad: '#ef4444',
  mid: '#f59e0b',
  good: '#06b6d4',
};

const STATUS_STYLES = {
  fail: { color: '#ef4444', bg: 'rgba(239,68,68,.1)',   border: 'rgba(239,68,68,.25)'   },
  mid:  { color: '#f59e0b', bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)' },
  best: { color: '#10b981', bg: 'rgba(16,185,129,.1)', border: 'rgba(16,185,129,.25)' },
};

function ExpCard({ exp }) {
  const s = STATUS_STYLES[exp.status];
  return (
    <div className="exp-card">
      <div className="exp-card-header">
        <div>
          <span className="exp-id">{exp.id}</span>
          <span className="exp-name">{exp.name}</span>
        </div>
        <span className="exp-badge" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
          {exp.statusLabel}
        </span>
      </div>
      <p className="exp-sub">{exp.sub}</p>
      <div className="exp-metrics">
        {exp.metrics.map(m => (
          <div key={m.label} className="exp-metric-box">
            <span className="exp-metric-val" style={{ color: TONE_COLORS[m.tone] }}>{m.value}</span>
            <span className="exp-metric-lbl">{m.label}</span>
          </div>
        ))}
      </div>
      <div className="exp-why">
        <span className="exp-tag">{exp.tag}</span>
        {exp.why}
      </div>
    </div>
  );
}

function FeatureBar({ name, pct, color }) {
  return (
    <div className="feat-row">
      <span className="feat-name">{name}</span>
      <div className="feat-bar-track">
        <div className="feat-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(to right, ${color}, ${color}99)` }} />
      </div>
      <span className="feat-pct">{pct}%</span>
    </div>
  );
}

function fmt(v, d = 3) { return Number(v).toFixed(d); }

export default function Entrenamiento() {
  const [tab, setTab] = useState('regresion');

  const split          = backendSnapshot.training.split;
  const regression     = backendSnapshot.training.regression;
  const classification = backendSnapshot.training.classification;

  const models = [
    {
      name: 'Regresión de casos', subtitle: regression.modelName,
      primary: { label: 'R²', value: fmt(regression.r2) },
      metrics: [
        { label: 'MAE',  value: fmt(regression.mae)  },
        { label: 'RMSE', value: fmt(regression.rmse) },
        { label: 'R²',   value: fmt(regression.r2)   },
      ],
      color: '#60a5fa',
      desc: 'Predice el número esperado de casos para la semana siguiente por cantón usando historial semanal y agregados epidemiológicos.',
    },
    {
      name: 'Clasificación de riesgo', subtitle: classification.modelName,
      primary: { label: 'Accuracy', value: fmt(classification.accuracy) },
      metrics: [
        { label: 'Precisión', value: fmt(classification.precision_weighted) },
        { label: 'Recall',    value: fmt(classification.recall_weighted)    },
        { label: 'F1',        value: fmt(classification.f1_weighted)        },
      ],
      color: '#06b6d4',
      desc: 'Clasifica el riesgo de brote en bajo, medio o alto sobre la siguiente semana usando un umbral dinámico por cantón.',
    },
  ];

  return (
    <div className="page-layout train-page">
      <Navbar />
      <div className="page-content">

        <div className="page-header">
          <p className="eyebrow" style={{ fontSize: '.75rem' }}>Pipeline ML real</p>
          <h1 className="page-title">Entrenamiento y evaluación</h1>
          <p className="page-sub">
            Métricas del backend real. Validación por tiempo para evitar fuga de información entre semanas futuras y pasadas.
          </p>
        </div>

        {/* Split */}
        <div className="split-row">
          <div className="split-item">
            <span className="split-val cyan">{split.trainPct}%</span>
            <span className="split-label">Train</span>
            <span className="split-sub">{split.trainWeeks} semanas</span>
          </div>
          <div className="split-divider" />
          <div className="split-item">
            <span className="split-val blue">{split.validationPct}%</span>
            <span className="split-label">Validation</span>
            <span className="split-sub">{split.validationWeeks} semanas</span>
          </div>
          <div className="split-divider" />
          <div className="split-item">
            <span className="split-val gold">{split.testPct}%</span>
            <span className="split-label">Test</span>
            <span className="split-sub">{split.testWeeks} semanas</span>
          </div>
        </div>

        {/* Modelos ganadores */}
        <div className="models-grid">
          {models.map(m => (
            <div key={m.name} className="card model-card">
              <div className="model-header">
                <div>
                  <h3 className="card-title" style={{ marginBottom: 4 }}>{m.name}</h3>
                  <p className="model-desc" style={{ marginBottom: 0, fontSize: '.72rem' }}>{m.subtitle}</p>
                </div>
                <span className="model-badge" style={{ color: m.color, background: `${m.color}18`, border: `1px solid ${m.color}44` }}>
                  {m.primary.label} {m.primary.value}
                </span>
              </div>
              <p className="model-desc">{m.desc}</p>
              <div className="model-metrics" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                {m.metrics.map(met => (
                  <div key={met.label} className="m-metric">
                    <span className="m-val" style={{ color: m.color }}>{met.value}</span>
                    <span className="m-label">{met.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Feature importance */}
        <div className="feat-grid">
          <div className="card">
            <div className="feat-header">
              <h3 className="card-title" style={{ marginBottom: 0 }}>Variables más influyentes</h3>
              <span className="feat-model-tag" style={{ color:'#60a5fa', background:'rgba(96,165,250,.1)', border:'1px solid rgba(96,165,250,.25)' }}>Regresión</span>
            </div>
            <div className="feat-list" style={{ marginTop: 18 }}>
              {regression.topFeatures.map(f => (
                <FeatureBar key={f.name} name={f.name} pct={f.pct} color="#60a5fa" />
              ))}
            </div>
          </div>
          <div className="card">
            <div className="feat-header">
              <h3 className="card-title" style={{ marginBottom: 0 }}>Variables más influyentes</h3>
              <span className="feat-model-tag" style={{ color:'#06b6d4', background:'rgba(6,182,212,.1)', border:'1px solid rgba(6,182,212,.25)' }}>Clasificación</span>
            </div>
            <div className="feat-list" style={{ marginTop: 18 }}>
              {classification.topFeatures.map(f => (
                <FeatureBar key={f.name} name={f.name} pct={f.pct} color="#06b6d4" />
              ))}
            </div>
          </div>
        </div>

        {/* ══ EXPERIMENTOS ══ */}
        <div className="card exp-section">
          <div className="exp-section-header">
            <div>
              <h3 className="card-title" style={{ marginBottom: 4 }}>Comparativa de experimentos</h3>
              <p className="model-desc" style={{ marginBottom: 0 }}>
                Modelos descartados durante el proceso de selección — regresión y clasificación.
              </p>
            </div>
            <div className="exp-tabs">
              <button
                className={`exp-tab ${tab === 'regresion' ? 'active' : ''}`}
                onClick={() => setTab('regresion')}
              >
                Regresión <span className="exp-tab-count">5 exp.</span>
              </button>
              <button
                className={`exp-tab ${tab === 'clasificacion' ? 'active' : ''}`}
                onClick={() => setTab('clasificacion')}
              >
                Clasificación <span className="exp-tab-count">5 exp.</span>
              </button>
            </div>
          </div>

          {/* Modelo ganador resumido */}
          <div className="exp-winner">
            <span className="exp-winner-dot" />
            <div className="exp-winner-body">
              <span className="exp-winner-label">Modelo seleccionado</span>
              <span className="exp-winner-name">
                {tab === 'regresion'
                  ? `RandomForest · R²=${fmt(regression.r2)} · MAE=${fmt(regression.mae)} · RMSE=${fmt(regression.rmse)}`
                  : `RandomForest · Accuracy=${fmt(classification.accuracy)} · F1=${fmt(classification.f1_weighted)} · balanced_subsample`
                }
              </span>
            </div>
            <span className="exp-winner-badge">✓ Ganador</span>
          </div>

          {/* Cards experimentos */}
          <div className="exp-list">
            {(tab === 'regresion' ? EXP_REGRESION : EXP_CLASIFICACION).map(exp => (
              <ExpCard key={exp.id} exp={exp} />
            ))}
          </div>
        </div>

        {/* Lectura metodológica */}
        <div className="card">
          <h3 className="card-title">Lectura metodológica</h3>
          <div className="feat-list">
            {[
              ['Unidad de análisis',       'Cantón + año + semana epidemiológica'],
              ['Sin fuga de información',  'Lags y rolling windows solo con historia previa'],
              ['Target de clasificación',  'Riesgo bajo / medio / alto para t+1'],
              ['Umbral dinámico',          'max(2, ceil(rolling_mean_8 + rolling_std_8)) por cantón'],
              ['Fase futura',              'Integrar clima, SHAP y capa API'],
            ].map(([k, v]) => (
              <div key={k} className="feat-row">
                <span className="feat-name">{k}</span>
                <span style={{ fontSize: '.8rem', color: 'rgba(10,10,20,.6)', flex: 1 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}