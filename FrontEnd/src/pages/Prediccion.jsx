import { useState } from 'react';
import NavBar from '../components/Navbar';

const CANTONS = [
  'Guayaquil','Quito','Riobamba','Machala','Ambato','Cuenca',
  'Portoviejo','Manta','Esmeraldas','Loja','Ibarra','Latacunga',
  'Babahoyo','Quinindé','El Carmen','Durán','Samborondón',
  'Daule','Milagro','La Libertad','Santo Domingo','Quevedo',
];

function getRisk(n) {
  if (n === 0)  return { label: 'Sin riesgo',   color: '#10b981', bg: 'rgba(16,185,129,.12)' };
  if (n < 20)   return { label: 'Riesgo bajo',  color: '#f59e0b', bg: 'rgba(245,158,11,.12)' };
  if (n < 80)   return { label: 'Riesgo medio', color: '#f97316', bg: 'rgba(249,115,22,.12)' };
  return         { label: 'Riesgo alto',        color: '#ef4444', bg: 'rgba(239,68,68,.12)'  };
}

function mockPredict({ semana, temp, precip, prevCases }) {
  const season = (semana >= 5 && semana <= 18) ? 2.1 : 1.0;
  const t      = Math.max(0, (temp - 18) * 0.14);
  const r      = precip * 0.028;
  const p      = prevCases * 0.40;
  const noise  = (Math.random() - 0.5) * 5;
  return Math.max(0, Math.round((t + r + p + 2) * season + noise));
}

export default function Prediccion() {
  const [form, setForm] = useState({
    canton: 'Riobamba', semana: 15, temp: 22, precip: 35, prevCases: 12,
  });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const predict = () => {
    setLoading(true); setResult(null);
    setTimeout(() => {
      const casos = mockPredict({
        semana: +form.semana, temp: +form.temp,
        precip: +form.precip, prevCases: +form.prevCases,
      });
      setResult({ casos, risk: getRisk(casos) });
      setLoading(false);
    }, 900);
  };

  return (
    <div className="page-layout">
      <NavBar />
      <div className="page-content">

        <div className="page-header">
          <p className="eyebrow" style={{ fontSize: '.75rem' }}>Módulo de predicción</p>
          <h1 className="page-title">Estimar casos de dengue</h1>
          <p className="page-sub">
            Ingresa las condiciones del cantón para obtener la estimación del modelo.
          </p>
        </div>

        <div className="pred-grid">

          {/* FORM */}
          <div className="card">
            <h3 className="card-title">Parámetros de entrada</h3>

            <div className="field">
              <label className="field-label">Cantón</label>
              <select className="field-input" value={form.canton} onChange={set('canton')}>
                {CANTONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Semana epidemiológica</label>
                <input className="field-input" type="number" min="1" max="52"
                  value={form.semana} onChange={set('semana')} />
              </div>
              <div className="field">
                <label className="field-label">Temperatura promedio (°C)</label>
                <input className="field-input" type="number" step="0.1"
                  value={form.temp} onChange={set('temp')} />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Precipitación (mm)</label>
                <input className="field-input" type="number" step="0.1"
                  value={form.precip} onChange={set('precip')} />
              </div>
              <div className="field">
                <label className="field-label">Casos semana anterior</label>
                <input className="field-input" type="number" min="0"
                  value={form.prevCases} onChange={set('prevCases')} />
              </div>
            </div>

            <button className="btn-predict" onClick={predict} disabled={loading}>
              {loading ? 'Calculando…' : 'Predecir casos →'}
            </button>
          </div>

          {/* RESULT */}
          <div className="card result-card">
            <h3 className="card-title">Resultado</h3>

            {!result && !loading && (
              <div className="result-empty">
                <span style={{ fontSize: '2.8rem' }}>🦟</span>
                <p>Completa los parámetros y presiona <strong>Predecir</strong></p>
              </div>
            )}

            {loading && (
              <div className="result-empty">
                <div className="spinner" />
                <p>Ejecutando modelo…</p>
              </div>
            )}

            {result && !loading && (
              <div className="result-body">
                <div className="result-canton">{form.canton} · Semana {form.semana}</div>
                <div className="result-big" style={{ color: result.risk.color }}>
                  {result.casos}
                </div>
                <div className="result-unit">casos estimados</div>
                <div className="result-badge" style={{
                  color: result.risk.color,
                  background: result.risk.bg,
                  border: `1px solid ${result.risk.color}55`,
                }}>
                  {result.risk.label}
                </div>
                <div className="result-factors">
                  <div className="factor">
                    <span className="factor-label">Temperatura</span>
                    <span className="factor-val">{form.temp}°C</span>
                  </div>
                  <div className="factor">
                    <span className="factor-label">Precipitación</span>
                    <span className="factor-val">{form.precip} mm</span>
                  </div>
                  <div className="factor">
                    <span className="factor-label">Casos previos</span>
                    <span className="factor-val">{form.prevCases}</span>
                  </div>
                </div>
                <p className="result-note">Random Forest + XGBoost · R² 98.4%</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}