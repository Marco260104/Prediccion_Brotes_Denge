import { useEffect, useMemo, useState } from 'react';
import NavBar from '../components/Navbar';
import backendSnapshot from '../data/backendSnapshot.json';

const fmt = (v, d = 0) => new Intl.NumberFormat('es-EC', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v ?? 0));

function riskStyle(risk) {
  if (risk === 'alto') return { color: '#ef4444', bg: 'rgba(239,68,68,.12)' };
  if (risk === 'medio') return { color: '#f59e0b', bg: 'rgba(245,158,11,.12)' };
  return { color: '#10b981', bg: 'rgba(16,185,129,.12)' };
}

function inferRisk(cases, threshold) {
  if (cases <= 0) return 'bajo';
  if (cases <= threshold) return 'medio';
  return 'alto';
}

function simulateFreePrediction(profile, inputs) {
  const monthFactor = profile.monthFactors?.[String(inputs.month)] ?? 1;
  const weekFactor = 1 + (Math.sin((2 * Math.PI * Number(inputs.week)) / 53) * 0.12);
  const prev = Number(inputs.prevCases);
  const base = (prev * 0.52) + (Number(profile.rollingMean8 ?? prev) * 0.33) + (Number(profile.lag2 ?? prev) * 0.15);
  const tempFactor = 1 + Math.max(-0.22, Math.min(0.35, (Number(inputs.temperature) - 24) * 0.025));
  const precipFactor = 1 + Math.max(-0.2, Math.min(0.45, (Number(inputs.precipitation) - 80) * 0.002));
  const projectedCases = Math.max(0, base * monthFactor * weekFactor * tempFactor * precipFactor);
  const threshold = Math.max(2, Number(profile.outbreakThreshold ?? 2));
  return {
    projectedCases: Number(projectedCases.toFixed(2)),
    projectedRisk: inferRisk(projectedCases, threshold),
    outbreakThreshold: threshold,
    monthFactor: Number(monthFactor.toFixed(3)),
    tempFactor: Number(tempFactor.toFixed(3)),
    precipFactor: Number(precipFactor.toFixed(3)),
    baseline: Number(base.toFixed(2)),
  };
}

function pts(values, w, h, p) {
  const max = Math.max(...values, 1);
  return values.map((v, i) => ({
    x: p + ((w - (p * 2)) * (values.length === 1 ? 0.5 : i / (values.length - 1))),
    y: h - p - ((v / max) * (h - (p * 2))),
  }));
}

const path = (arr) => arr.map((a, i) => `${i ? 'L' : 'M'} ${a.x} ${a.y}`).join(' ');

function HistoryChart({ rows, activeIndex, setActiveIndex }) {
  const w = 860, h = 280, p = 32;
  const act = rows.map((r) => Number(r.actualCases ?? 0));
  const pred = rows.map((r) => Number(r.predictedCases ?? 0));
  const actPts = pts(act, w, h, p);
  const predPts = pts(pred, w, h, p);
  const max = Math.max(...act, ...pred, 1);
  const idx = Math.min(activeIndex, Math.max(0, rows.length - 1));
  const row = rows[idx];
  const px = actPts[idx]?.x ?? p;

  return (
    <div className="card chart-panel">
      <div className="chart-panel-head">
        <div>
          <h3 className="card-title" style={{ marginBottom: 4 }}>Historico real del entrenamiento</h3>
          <p className="model-desc" style={{ marginBottom: 0 }}>Comparacion interactiva entre casos reales y predichos del holdout temporal.</p>
        </div>
        <span className="chart-chip">{row?.periodId ?? 'Sin datos'}</span>
      </div>
      <div className="chart-legend">
        <span><i className="legend-swatch actual" />Real</span>
        <span><i className="legend-swatch predicted" />Predicho</span>
      </div>
      <div className="chart-stage">
        <svg viewBox={`0 0 ${w} ${h}`} className="interactive-chart-svg">
          {[0, 1, 2, 3].map((s) => {
            const y = p + ((h - (p * 2)) * (s / 3));
            return <g key={s}><line x1={p} y1={y} x2={w - p} y2={y} className="chart-grid-line" /><text x={10} y={y + 4} className="chart-axis-label">{Math.round(max - ((max / 3) * s))}</text></g>;
          })}
          <path d={path(actPts)} className="chart-line actual" />
          <path d={path(predPts)} className="chart-line predicted" />
          {rows.map((r, i) => (
            <g key={r.periodId}>
              <line x1={actPts[i].x} y1={h - p} x2={actPts[i].x} y2={p} className={i === idx ? 'chart-hover-line active' : 'chart-hover-line'} />
              <circle cx={actPts[i].x} cy={actPts[i].y} r={i === idx ? 6 : 4} className={i === idx ? 'chart-point actual active' : 'chart-point actual'} />
              <circle cx={predPts[i].x} cy={predPts[i].y} r={i === idx ? 6 : 4} className={i === idx ? 'chart-point predicted active' : 'chart-point predicted'} />
              <rect x={actPts[i].x - 12} y={p} width="24" height={h - (p * 2)} fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setActiveIndex(i)} onClick={() => setActiveIndex(i)} />
              <text x={actPts[i].x} y={h - 8} textAnchor="middle" className={i === idx ? 'chart-x-label active' : 'chart-x-label'}>W{String(r.semana).padStart(2, '0')}</text>
            </g>
          ))}
          {row && <g><rect x={Math.min(px + 12, w - 188)} y={18} width="176" height="60" rx="12" className="chart-tooltip-bg" /><text x={Math.min(px + 24, w - 176)} y={40} className="chart-tooltip-title">{row.periodId}</text><text x={Math.min(px + 24, w - 176)} y={58} className="chart-tooltip-text">Real: {fmt(row.actualCases, 0)}</text><text x={Math.min(px + 24, w - 176)} y={74} className="chart-tooltip-text">Predicho: {fmt(row.predictedCases, 2)}</text></g>}
        </svg>
      </div>
      {row && <div className="chart-summary-grid"><div className="factor"><span className="factor-label">Real</span><span className="factor-val">{fmt(row.actualCases, 0)}</span></div><div className="factor"><span className="factor-label">Predicho</span><span className="factor-val">{fmt(row.predictedCases, 2)}</span></div><div className="factor"><span className="factor-label">Riesgo real</span><span className="factor-val">{row.actualRisk}</span></div><div className="factor"><span className="factor-label">Riesgo predicho</span><span className="factor-val">{row.predictedRisk}</span></div></div>}
    </div>
  );
}

function WeeklyChart({ rows, activeWeekId, setActiveWeekId }) {
  const w = 860, h = 280, p = 32;
  const max = Math.max(...rows.map((r) => Number(r.projectedCases ?? 0)), 1);
  const row = rows.find((r) => r.targetPeriodId === activeWeekId) ?? rows[0];
  return (
    <div className="card chart-panel">
      <div className="chart-panel-head">
        <div>
          <h3 className="card-title" style={{ marginBottom: 4 }}>Proyeccion semanal interactiva</h3>
          <p className="model-desc" style={{ marginBottom: 0 }}>Semanas futuras consumidas del modelo entrenado para el mes seleccionado.</p>
        </div>
        <span className="chart-chip">{row?.targetPeriodId ?? 'Sin datos'}</span>
      </div>
      <div className="chart-stage">
        <svg viewBox={`0 0 ${w} ${h}`} className="interactive-chart-svg">
          {[0, 1, 2, 3].map((s) => {
            const y = p + ((h - (p * 2)) * (s / 3));
            return <g key={s}><line x1={p} y1={y} x2={w - p} y2={y} className="chart-grid-line" /><text x={10} y={y + 4} className="chart-axis-label">{Math.round(max - ((max / 3) * s))}</text></g>;
          })}
          {rows.map((r, i) => {
            const area = (w - (p * 2)) / rows.length;
            const bw = Math.min(96, area - 14);
            const x = p + (i * area) + ((area - bw) / 2);
            const bh = Math.max(8, (Number(r.projectedCases ?? 0) / max) * (h - (p * 2)));
            const y = h - p - bh;
            const active = r.targetPeriodId === activeWeekId;
            const theme = riskStyle(r.projectedRisk);
            return (
              <g key={r.targetPeriodId}>
                <rect x={x} y={y} width={bw} height={bh} rx="10" fill={theme.color} opacity={active ? 0.96 : 0.78} className={active ? 'chart-bar active' : 'chart-bar'} style={{ cursor: 'pointer' }} onMouseEnter={() => setActiveWeekId(r.targetPeriodId)} onClick={() => setActiveWeekId(r.targetPeriodId)} />
                <text x={x + (bw / 2)} y={h - 8} textAnchor="middle" className={active ? 'chart-x-label active' : 'chart-x-label'}>W{String(r.targetWeek).padStart(2, '0')}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {row && <div className="chart-summary-grid"><div className="factor"><span className="factor-label">Semana</span><span className="factor-val">{row.targetPeriodId}</span></div><div className="factor"><span className="factor-label">Casos</span><span className="factor-val">{fmt(row.projectedCases, 2)}</span></div><div className="factor"><span className="factor-label">Riesgo</span><span className="factor-val">{row.projectedRisk}</span></div><div className="factor"><span className="factor-label">Fuente</span><span className="factor-val">Entrenamiento real</span></div></div>}
    </div>
  );
}

export default function Prediccion() {
  const monthlyForecasts = backendSnapshot.futureForecasts.monthly;
  const weeklyForecasts = backendSnapshot.futureForecasts.weekly;
  const historicalPredictions = backendSnapshot.predictions ?? [];
  const freeModeProfiles = backendSnapshot.freeModeProfiles ?? [];
  const [mode, setMode] = useState('forecast');

  const provinceOptions = useMemo(() => [...new Set(monthlyForecasts.map((i) => i.provincia))].sort(), [monthlyForecasts]);
  const [selectedProvince, setSelectedProvince] = useState(provinceOptions[0] ?? '');
  const cantonOptions = useMemo(() => [...new Set(monthlyForecasts.filter((i) => i.provincia === selectedProvince).map((i) => i.canton))].sort(), [monthlyForecasts, selectedProvince]);
  const [selectedCanton, setSelectedCanton] = useState('');
  useEffect(() => { if (cantonOptions.length) setSelectedCanton(cantonOptions[0]); }, [selectedProvince, cantonOptions]);

  const yearOptions = useMemo(() => [...new Set(monthlyForecasts.filter((i) => i.provincia === selectedProvince && i.canton === selectedCanton).map((i) => i.targetYear))].sort(), [monthlyForecasts, selectedProvince, selectedCanton]);
  const [selectedYear, setSelectedYear] = useState('');
  useEffect(() => { if (yearOptions.length) setSelectedYear(String(yearOptions[0])); }, [yearOptions]);

  const monthOptions = useMemo(() => monthlyForecasts.filter((i) => i.provincia === selectedProvince && i.canton === selectedCanton && String(i.targetYear) === String(selectedYear)).sort((a, b) => a.targetMonth - b.targetMonth).map((i) => ({ month: i.targetMonth, label: i.targetMonthName })), [monthlyForecasts, selectedProvince, selectedCanton, selectedYear]);
  const [selectedMonth, setSelectedMonth] = useState('');
  useEffect(() => { if (monthOptions.length) setSelectedMonth(String(monthOptions[0].month)); }, [monthOptions]);

  const selectedMonthRow = useMemo(() => monthlyForecasts.find((i) => i.provincia === selectedProvince && i.canton === selectedCanton && String(i.targetYear) === String(selectedYear) && String(i.targetMonth) === String(selectedMonth)), [monthlyForecasts, selectedProvince, selectedCanton, selectedYear, selectedMonth]);
  const selectedWeeklyRows = useMemo(() => weeklyForecasts.filter((i) => i.provincia === selectedProvince && i.canton === selectedCanton && String(i.targetYear) === String(selectedYear) && String(i.targetMonth) === String(selectedMonth)).sort((a, b) => a.targetWeek - b.targetWeek), [weeklyForecasts, selectedProvince, selectedCanton, selectedYear, selectedMonth]);
  const historicalRows = useMemo(() => historicalPredictions.filter((i) => i.provincia === selectedProvince && i.canton === selectedCanton).sort((a, b) => (a.anio - b.anio) || (a.semana - b.semana)).slice(-16), [historicalPredictions, selectedProvince, selectedCanton]);

  const [activeHistoricalIndex, setActiveHistoricalIndex] = useState(0);
  const [activeFutureWeekId, setActiveFutureWeekId] = useState('');
  useEffect(() => { setActiveHistoricalIndex(Math.max(0, historicalRows.length - 1)); }, [historicalRows]);
  useEffect(() => { if (selectedWeeklyRows.length) setActiveFutureWeekId(selectedWeeklyRows[0].targetPeriodId); }, [selectedWeeklyRows]);

  const previousMonthRow = useMemo(() => {
    if (!selectedMonthRow) return null;
    const all = monthlyForecasts.filter((i) => i.provincia === selectedProvince && i.canton === selectedCanton).sort((a, b) => (a.targetYear - b.targetYear) || (a.targetMonth - b.targetMonth));
    const idx = all.findIndex((i) => i.targetYear === selectedMonthRow.targetYear && i.targetMonth === selectedMonthRow.targetMonth);
    return idx > 0 ? all[idx - 1] : null;
  }, [monthlyForecasts, selectedProvince, selectedCanton, selectedMonthRow]);

  const projectedRiskTheme = selectedMonthRow ? riskStyle(selectedMonthRow.projectedRisk) : riskStyle('bajo');
  const trendCases = previousMonthRow && selectedMonthRow ? selectedMonthRow.projectedCases - previousMonthRow.projectedCases : null;

  const freeProvinceOptions = useMemo(() => [...new Set(freeModeProfiles.map((i) => i.provincia))].sort(), [freeModeProfiles]);
  const [freeProvince, setFreeProvince] = useState(freeProvinceOptions[0] ?? '');
  const freeCantonOptions = useMemo(() => [...new Set(freeModeProfiles.filter((i) => i.provincia === freeProvince).map((i) => i.canton))].sort(), [freeModeProfiles, freeProvince]);
  const [freeCanton, setFreeCanton] = useState('');
  useEffect(() => { if (freeCantonOptions.length) setFreeCanton(freeCantonOptions[0]); }, [freeProvince, freeCantonOptions]);
  const selectedProfile = useMemo(() => freeModeProfiles.find((i) => i.provincia === freeProvince && i.canton === freeCanton), [freeModeProfiles, freeProvince, freeCanton]);

  const [freeInputs, setFreeInputs] = useState({ year: '2026', month: '1', week: '1', temperature: '26', precipitation: '120', prevCases: '5' });
  useEffect(() => {
    if (!selectedProfile) return;
    const defaultMonth = Object.entries(selectedProfile.monthFactors ?? {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? '1';
    const suggestedWeek = String(Math.min(53, Math.max(1, (Number(defaultMonth) * 4) - 1)));
    setFreeInputs({ year: '2026', month: String(defaultMonth), week: suggestedWeek, temperature: '26', precipitation: '120', prevCases: String(Math.round(selectedProfile.lag1 ?? selectedProfile.lastObservedCases ?? 0)) });
  }, [selectedProfile]);

  const freePrediction = useMemo(() => selectedProfile ? simulateFreePrediction(selectedProfile, freeInputs) : null, [selectedProfile, freeInputs]);
  const freeRiskTheme = riskStyle(freePrediction?.projectedRisk ?? 'bajo');

  return (
    <div className="page-layout pred-page">
      <NavBar />
      <div className="page-content">
        <div className="page-header">
          <p className="eyebrow" style={{ fontSize: '.75rem' }}>Prediccion asistida por entrenamiento real</p>
          <h1 className="page-title">Prediccion futura y modo libre</h1>
          <p className="page-sub">La vista consume el entrenamiento real del backend y ahora permite interactuar con las graficas historicas y con la proyeccion semanal.</p>
        </div>

        <div className="card" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button className="btn-line" style={mode === 'forecast' ? { background: 'rgba(6,182,212,.14)', borderColor: 'rgba(6,182,212,.6)', color: 'var(--cyan)' } : {}} onClick={() => setMode('forecast')}>Proyeccion 2026</button>
          <button className="btn-line" style={mode === 'free' ? { background: 'rgba(37,99,235,.12)', borderColor: 'rgba(37,99,235,.45)', color: '#2563eb' } : {}} onClick={() => setMode('free')}>Modo libre</button>
        </div>

        {mode === 'forecast' ? (
          <>
            <div className="pred-grid">
              <div className="card">
                <h3 className="card-title">Seleccion del escenario futuro</h3>
                <div className="field"><label className="field-label">Provincia</label><select className="field-input" value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value)}>{provinceOptions.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
                <div className="field"><label className="field-label">Canton</label><select className="field-input" value={selectedCanton} onChange={(e) => setSelectedCanton(e.target.value)}>{cantonOptions.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="field-row">
                  <div className="field"><label className="field-label">Anio proyectado</label><select className="field-input" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>{yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
                  <div className="field"><label className="field-label">Mes proyectado</label><select className="field-input" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>{monthOptions.map((m) => <option key={m.month} value={m.month}>{m.label}</option>)}</select></div>
                </div>
                {selectedMonthRow && <div className="feat-list" style={{ marginTop: 18 }}>
                  <div className="feat-row"><span className="feat-name">Provincia</span><span className="feat-pct" style={{ width: 'auto' }}>{selectedProvince}</span></div>
                  <div className="feat-row"><span className="feat-name">Semanas proyectadas</span><span className="feat-pct" style={{ width: 'auto' }}>{selectedMonthRow.weeks}</span></div>
                  <div className="feat-row"><span className="feat-name">Promedio movil 8</span><span className="feat-pct" style={{ width: 'auto' }}>{fmt(selectedMonthRow.rollingMean8, 2)}</span></div>
                  <div className="feat-row"><span className="feat-name">Umbral de brote</span><span className="feat-pct" style={{ width: 'auto' }}>{fmt(selectedMonthRow.outbreakThreshold, 0)}</span></div>
                  <div className="feat-row"><span className="feat-name">Tendencia vs mes previo</span><span className="feat-pct" style={{ width: 'auto' }}>{trendCases === null ? 'Sin referencia' : `${trendCases >= 0 ? '+' : ''}${fmt(trendCases, 2)} casos`}</span></div>
                </div>}
              </div>

              <div className="card result-card">
                <h3 className="card-title">Proyeccion mensual 2026</h3>
                {!selectedMonthRow ? <div className="result-empty"><p>No hay proyecciones cargadas.</p></div> : <div className="result-body" style={{ alignItems: 'stretch' }}>
                  <div className="result-canton">{selectedCanton} · {selectedMonthRow.targetMonthName} {selectedYear}</div>
                  <div className="models-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
                    <div className="card model-card" style={{ marginBottom: 0 }}>
                      <h3 className="card-title" style={{ marginBottom: 12 }}>Regresion</h3>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}><span className="m-label">Casos proyectados del mes</span><span className="m-val cyan">{fmt(selectedMonthRow.projectedCases, 2)}</span></div>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}><span className="m-label">Promedio semanal</span><span className="m-val blue">{fmt(selectedMonthRow.avgWeeklyCases, 2)}</span></div>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}><span className="m-label">Pico semanal estimado</span><span className="m-val gold">{fmt(selectedMonthRow.maxWeeklyCases, 2)}</span></div>
                    </div>
                    <div className="card model-card" style={{ marginBottom: 0 }}>
                      <h3 className="card-title" style={{ marginBottom: 12 }}>Clasificacion</h3>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}><span className="m-label">Riesgo proyectado del mes</span><span className="result-badge" style={{ color: projectedRiskTheme.color, background: projectedRiskTheme.bg, border: `1px solid ${projectedRiskTheme.color}55` }}>{selectedMonthRow.projectedRisk}</span></div>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}><span className="m-label">Base estadistica</span><span className="factor-val">Proyeccion recursiva desde 2025</span></div>
                    </div>
                  </div>
                  <div className="result-factors" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 18 }}>
                    {selectedWeeklyRows.slice(0, 4).map((r) => <div key={r.targetPeriodId} className="factor"><span className="factor-label">{r.targetPeriodId}</span><span className="factor-val">{fmt(r.projectedCases, 2)} · {r.projectedRisk}</span></div>)}
                  </div>
                  <p className="result-note">Proyeccion mensual construida agregando semanas futuras estimadas por los modelos entrenados.</p>
                </div>}
              </div>
            </div>

            <div className="charts-grid-2">
              {historicalRows.length > 0 && <HistoryChart rows={historicalRows} activeIndex={activeHistoricalIndex} setActiveIndex={setActiveHistoricalIndex} />}
              {selectedWeeklyRows.length > 0 && <WeeklyChart rows={selectedWeeklyRows} activeWeekId={activeFutureWeekId} setActiveWeekId={setActiveFutureWeekId} />}
            </div>
          </>
        ) : (
          <div className="pred-grid">
            <div className="card">
              <h3 className="card-title">Modo libre de escenario</h3>
              <div className="field"><label className="field-label">Provincia</label><select className="field-input" value={freeProvince} onChange={(e) => setFreeProvince(e.target.value)}>{freeProvinceOptions.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div className="field"><label className="field-label">Canton</label><select className="field-input" value={freeCanton} onChange={(e) => setFreeCanton(e.target.value)}>{freeCantonOptions.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="field-row">
                <div className="field"><label className="field-label">Anio</label><input className="field-input" type="number" value={freeInputs.year} onChange={(e) => setFreeInputs((c) => ({ ...c, year: e.target.value }))} /></div>
                <div className="field"><label className="field-label">Mes</label><input className="field-input" type="number" min="1" max="12" value={freeInputs.month} onChange={(e) => setFreeInputs((c) => ({ ...c, month: e.target.value }))} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label className="field-label">Semana epidemiologica</label><input className="field-input" type="number" min="1" max="53" value={freeInputs.week} onChange={(e) => setFreeInputs((c) => ({ ...c, week: e.target.value }))} /></div>
                <div className="field"><label className="field-label">Casos previos</label><input className="field-input" type="number" min="0" value={freeInputs.prevCases} onChange={(e) => setFreeInputs((c) => ({ ...c, prevCases: e.target.value }))} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label className="field-label">Temperatura (C)</label><input className="field-input" type="number" step="0.1" value={freeInputs.temperature} onChange={(e) => setFreeInputs((c) => ({ ...c, temperature: e.target.value }))} /></div>
                <div className="field"><label className="field-label">Precipitacion (mm)</label><input className="field-input" type="number" step="0.1" value={freeInputs.precipitation} onChange={(e) => setFreeInputs((c) => ({ ...c, precipitation: e.target.value }))} /></div>
              </div>
              {selectedProfile && <div className="feat-list" style={{ marginTop: 18 }}>
                <div className="feat-row"><span className="feat-name">Lag historico del canton</span><span className="feat-pct" style={{ width: 'auto' }}>{fmt(selectedProfile.lag1, 0)} casos</span></div>
                <div className="feat-row"><span className="feat-name">Rolling mean 8</span><span className="feat-pct" style={{ width: 'auto' }}>{fmt(selectedProfile.rollingMean8, 2)}</span></div>
                <div className="feat-row"><span className="feat-name">Factor estacional del mes</span><span className="feat-pct" style={{ width: 'auto' }}>{fmt(freePrediction?.monthFactor ?? 1, 3)}</span></div>
                <div className="feat-row"><span className="feat-name">Ajuste temperatura</span><span className="feat-pct" style={{ width: 'auto' }}>{fmt(freePrediction?.tempFactor ?? 1, 3)}</span></div>
                <div className="feat-row"><span className="feat-name">Ajuste precipitacion</span><span className="feat-pct" style={{ width: 'auto' }}>{fmt(freePrediction?.precipFactor ?? 1, 3)}</span></div>
              </div>}
            </div>

            <div className="card result-card">
              <h3 className="card-title">Prediccion del modo libre</h3>
              {!freePrediction ? <div className="result-empty"><p>No hay perfil cargado para el canton seleccionado.</p></div> : <div className="result-body" style={{ alignItems: 'stretch' }}>
                <div className="result-canton">{freeCanton} · Semana {freeInputs.week} · {freeInputs.year}</div>
                <div className="models-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
                  <div className="card model-card" style={{ marginBottom: 0 }}>
                    <h3 className="card-title" style={{ marginBottom: 12 }}>Escenario ingresado</h3>
                    <div className="m-metric" style={{ alignItems: 'flex-start' }}><span className="m-label">Temperatura</span><span className="m-val cyan">{fmt(freeInputs.temperature, 1)} C</span></div>
                    <div className="m-metric" style={{ alignItems: 'flex-start' }}><span className="m-label">Precipitacion</span><span className="m-val blue">{fmt(freeInputs.precipitation, 1)} mm</span></div>
                    <div className="m-metric" style={{ alignItems: 'flex-start' }}><span className="m-label">Casos previos</span><span className="m-val gold">{fmt(freeInputs.prevCases, 0)}</span></div>
                  </div>
                  <div className="card model-card" style={{ marginBottom: 0 }}>
                    <h3 className="card-title" style={{ marginBottom: 12 }}>Resultado estimado</h3>
                    <div className="m-metric" style={{ alignItems: 'flex-start' }}><span className="m-label">Casos esperados</span><span className="m-val cyan">{fmt(freePrediction.projectedCases, 2)}</span></div>
                    <div className="m-metric" style={{ alignItems: 'flex-start' }}><span className="m-label">Riesgo estimado</span><span className="result-badge" style={{ color: freeRiskTheme.color, background: freeRiskTheme.bg, border: `1px solid ${freeRiskTheme.color}55` }}>{freePrediction.projectedRisk}</span></div>
                    <div className="m-metric" style={{ alignItems: 'flex-start' }}><span className="m-label">Umbral del canton</span><span className="factor-val">{fmt(freePrediction.outbreakThreshold, 0)}</span></div>
                  </div>
                </div>
                <div className="result-factors" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 18 }}>
                  <div className="factor"><span className="factor-label">Base epidemiologica</span><span className="factor-val">{fmt(freePrediction.baseline, 2)}</span></div>
                  <div className="factor"><span className="factor-label">Mes</span><span className="factor-val">{freeInputs.month}</span></div>
                  <div className="factor"><span className="factor-label">Semana</span><span className="factor-val">{freeInputs.week}</span></div>
                  <div className="factor"><span className="factor-label">Metodo</span><span className="factor-val">Historial real + ajuste</span></div>
                </div>
                <p className="result-note">Modo libre: usa el historial entrenado del canton y aplica ajustes de escenario para temperatura y precipitacion.</p>
              </div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
