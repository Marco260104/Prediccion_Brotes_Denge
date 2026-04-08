import Navbar from '../components/Navbar';
import backendSnapshot from '../data/backendSnapshot.json';

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

function formatMetric(value, digits = 3) {
  return Number(value).toFixed(digits);
}

export default function Entrenamiento() {
  const split = backendSnapshot.training.split;
  const regression = backendSnapshot.training.regression;
  const classification = backendSnapshot.training.classification;

  const models = [
    {
      name: 'Regresion de casos',
      subtitle: regression.modelName,
      primary: { label: 'R2', value: formatMetric(regression.r2) },
      metrics: [
        { label: 'MAE', value: formatMetric(regression.mae) },
        { label: 'RMSE', value: formatMetric(regression.rmse) },
        { label: 'R2', value: formatMetric(regression.r2) },
      ],
      color: '#60a5fa',
      desc: 'Predice el numero esperado de casos para la semana siguiente por canton usando historial semanal y agregados epidemiologicos.',
    },
    {
      name: 'Clasificacion de riesgo',
      subtitle: classification.modelName,
      primary: { label: 'Accuracy', value: formatMetric(classification.accuracy) },
      metrics: [
        { label: 'Precision', value: formatMetric(classification.precision_weighted) },
        { label: 'Recall', value: formatMetric(classification.recall_weighted) },
        { label: 'F1', value: formatMetric(classification.f1_weighted) },
      ],
      color: '#06b6d4',
      desc: 'Clasifica el riesgo de brote en bajo, medio o alto sobre la siguiente semana usando un umbral dinamico por canton.',
    },
  ];

  return (
    <div className="page-layout train-page">
      <Navbar />
      <div className="page-content">
        <div className="page-header">
          <p className="eyebrow" style={{ fontSize: '.75rem' }}>Pipeline ML real</p>
          <h1 className="page-title">Entrenamiento y evaluacion</h1>
          <p className="page-sub">
            Estas metricas vienen del entrenamiento real del backend. La validacion se hizo por tiempo para evitar fuga
            de informacion entre semanas futuras y semanas pasadas.
          </p>
        </div>

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

        <div className="models-grid">
          {models.map((model) => (
            <div key={model.name} className="card model-card">
              <div className="model-header">
                <div>
                  <h3 className="card-title" style={{ marginBottom: 6 }}>{model.name}</h3>
                  <p className="model-desc" style={{ marginBottom: 0 }}>{model.subtitle}</p>
                </div>
                <span className="model-badge" style={{ color: model.color, background: `${model.color}18`, border: `1px solid ${model.color}44` }}>
                  {model.primary.label} {model.primary.value}
                </span>
              </div>
              <p className="model-desc">{model.desc}</p>
              <div className="model-metrics" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                {model.metrics.map((metric) => (
                  <div key={metric.label} className="m-metric">
                    <span className="m-val" style={{ color: model.color }}>{metric.value}</span>
                    <span className="m-label">{metric.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="feat-grid">
          <div className="card">
            <div className="feat-header">
              <h3 className="card-title" style={{ marginBottom: 0 }}>Variables mas influyentes</h3>
              <span className="feat-model-tag" style={{ color: '#60a5fa', background: 'rgba(96,165,250,.1)', border: '1px solid rgba(96,165,250,.25)' }}>
                Regresion
              </span>
            </div>
            <div className="feat-list" style={{ marginTop: 18 }}>
              {regression.topFeatures.map((feature) => (
                <FeatureBar key={feature.name} name={feature.name} pct={feature.pct} color="#60a5fa" />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="feat-header">
              <h3 className="card-title" style={{ marginBottom: 0 }}>Variables mas influyentes</h3>
              <span className="feat-model-tag" style={{ color: '#06b6d4', background: 'rgba(6,182,212,.1)', border: '1px solid rgba(6,182,212,.25)' }}>
                Clasificacion
              </span>
            </div>
            <div className="feat-list" style={{ marginTop: 18 }}>
              {classification.topFeatures.map((feature) => (
                <FeatureBar key={feature.name} name={feature.name} pct={feature.pct} color="#06b6d4" />
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Lectura metodologica</h3>
          <div className="feat-list">
            <div className="feat-row">
              <span className="feat-name">Unidad de analisis</span>
              <span className="feat-pct" style={{ width: 'auto', textAlign: 'left' }}>canton + anio + semana epidemiologica</span>
            </div>
            <div className="feat-row">
              <span className="feat-name">Sin fuga de informacion</span>
              <span className="feat-pct" style={{ width: 'auto', textAlign: 'left' }}>Lags y rolling windows solo con historia previa</span>
            </div>
            <div className="feat-row">
              <span className="feat-name">Target de clasificacion</span>
              <span className="feat-pct" style={{ width: 'auto', textAlign: 'left' }}>Riesgo bajo / medio / alto para t+1</span>
            </div>
            <div className="feat-row">
              <span className="feat-name">Fase futura</span>
              <span className="feat-pct" style={{ width: 'auto', textAlign: 'left' }}>Integrar clima, SHAP y capa API</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
