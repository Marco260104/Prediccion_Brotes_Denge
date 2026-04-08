import Navbar from '../components/Navbar';

const FEATURES_XGB = [
  { name: 'Casos semana anterior', pct: 92 },
  { name: 'Temperatura media',     pct: 78 },
  { name: 'Precipitación acum.',   pct: 71 },
  { name: 'Semana epidemiológica', pct: 64 },
  { name: 'Humedad relativa',      pct: 48 },
  { name: 'Altitud cantonal',      pct: 35 },
  { name: 'Densidad poblacional',  pct: 29 },
];

const FEATURES_RF = [
  { name: 'Casos semana anterior', pct: 88 },
  { name: 'Semana epidemiológica', pct: 74 },
  { name: 'Temperatura media',     pct: 68 },
  { name: 'Precipitación acum.',   pct: 59 },
  { name: 'Humedad relativa',      pct: 44 },
  { name: 'Densidad poblacional',  pct: 38 },
  { name: 'Altitud cantonal',      pct: 22 },
];

const MODELS = [
  {
    name: 'Random Forest',
    r2: '97.8%', rmse: '4.2', mae: '2.9', f1: '0.96',
    trees: '300', depth: '12', features: '√n',
    color: '#60a5fa',
    desc: 'Ensamble de árboles de decisión con bootstrap aggregating. Robusto ante outliers y sin necesidad de normalización.',
  },
  {
    name: 'XGBoost',
    r2: '98.4%', rmse: '3.8', mae: '2.6', f1: '0.97',
    trees: '500', depth: '6', features: '0.8',
    color: '#06b6d4',
    desc: 'Gradient boosting optimizado. Mayor precisión en patrones temporales y mejor manejo de la estacionalidad del dengue.',
  },
];

function FeatureBar({ name, pct, color }) {
  return (
    <div className="feat-row">
      <span className="feat-name">{name}</span>
      <div className="feat-bar-track">
        <div
          className="feat-bar-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(to right, ${color}, ${color}99)`,
          }}
        />
      </div>
      <span className="feat-pct">{pct}%</span>
    </div>
  );
}

export default function Entrenamiento() {
  return (
    <div className="page-layout train-page">
      <Navbar />
      <div className="page-content">

        <div className="page-header">
          <p className="eyebrow" style={{ fontSize: '.75rem' }}>Pipeline ML</p>
          <h1 className="page-title">Modelos de entrenamiento</h1>
          <p className="page-sub">
            Arquitectura, métricas de evaluación e importancia de variables del sistema predictivo.
          </p>
        </div>

        {/* Train / val / test split */}
        <div className="split-row">
          <div className="split-item">
            <span className="split-val cyan">70%</span>
            <span className="split-label">Entrenamiento</span>
            <span className="split-sub">2021–2024 · 25,024 registros</span>
          </div>
          <div className="split-divider" />
          <div className="split-item">
            <span className="split-val blue">20%</span>
            <span className="split-label">Validación</span>
            <span className="split-sub">Cruzada k=5</span>
          </div>
          <div className="split-divider" />
          <div className="split-item">
            <span className="split-val gold">10%</span>
            <span className="split-label">Test</span>
            <span className="split-sub">2025 · 2,865 registros</span>
          </div>
        </div>

        {/* Model cards */}
        <div className="models-grid">
          {MODELS.map(m => (
            <div key={m.name} className="card model-card">
              <div className="model-header">
                <h3 className="card-title" style={{ marginBottom: 0 }}>{m.name}</h3>
                <span className="model-badge" style={{
                  color: m.color,
                  background: `${m.color}18`,
                  border: `1px solid ${m.color}44`,
                }}>
                  R² {m.r2}
                </span>
              </div>
              <p className="model-desc">{m.desc}</p>
              <div className="model-metrics">
                <div className="m-metric">
                  <span className="m-val" style={{ color: m.color }}>{m.r2}</span>
                  <span className="m-label">R²</span>
                </div>
                <div className="m-metric">
                  <span className="m-val blue">{m.rmse}</span>
                  <span className="m-label">RMSE</span>
                </div>
                <div className="m-metric">
                  <span className="m-val gold">{m.mae}</span>
                  <span className="m-label">MAE</span>
                </div>
                <div className="m-metric">
                  <span className="m-val" style={{ color: '#8b5cf6' }}>{m.f1}</span>
                  <span className="m-label">F1</span>
                </div>
              </div>
              <div className="model-params">
                <span className="param">
                  <span className="param-k">Árboles</span>
                  <span className="param-v">{m.trees}</span>
                </span>
                <span className="param">
                  <span className="param-k">Prof. max</span>
                  <span className="param-v">{m.depth}</span>
                </span>
                <span className="param">
                  <span className="param-k">Features</span>
                  <span className="param-v">{m.features}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Feature importance — AMBOS modelos */}
        <div className="feat-grid">

          <div className="card">
            <div className="feat-header">
              <h3 className="card-title" style={{ marginBottom: 0 }}>
                Importancia de variables
              </h3>
              <span className="feat-model-tag" style={{
                color: '#60a5fa',
                background: 'rgba(96,165,250,.1)',
                border: '1px solid rgba(96,165,250,.25)',
              }}>
                Random Forest
              </span>
            </div>
            <div className="feat-list" style={{ marginTop: 18 }}>
              {FEATURES_RF.map((f, i) => (
                <FeatureBar key={i} name={f.name} pct={f.pct} color="#60a5fa" />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="feat-header">
              <h3 className="card-title" style={{ marginBottom: 0 }}>
                Importancia de variables
              </h3>
              <span className="feat-model-tag" style={{
                color: '#06b6d4',
                background: 'rgba(6,182,212,.1)',
                border: '1px solid rgba(6,182,212,.25)',
              }}>
                XGBoost
              </span>
            </div>
            <div className="feat-list" style={{ marginTop: 18 }}>
              {FEATURES_XGB.map((f, i) => (
                <FeatureBar key={i} name={f.name} pct={f.pct} color="#06b6d4" />
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}