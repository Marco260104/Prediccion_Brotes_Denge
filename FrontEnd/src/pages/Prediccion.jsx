import { useEffect, useMemo, useState } from 'react';
import NavBar from '../components/Navbar';
import backendSnapshot from '../data/backendSnapshot.json';


function fmt(value, digits = 0) {
  return new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value ?? 0));
}


function riskStyle(risk) {
  if (risk === 'alto') {
    return { color: '#ef4444', bg: 'rgba(239,68,68,.12)' };
  }
  if (risk === 'medio') {
    return { color: '#f59e0b', bg: 'rgba(245,158,11,.12)' };
  }
  return { color: '#10b981', bg: 'rgba(16,185,129,.12)' };
}


function inferRisk(cases, threshold) {
  if (cases <= 0) {
    return 'bajo';
  }
  if (cases <= threshold) {
    return 'medio';
  }
  return 'alto';
}


function simulateFreePrediction(profile, inputs) {
  const monthFactor = profile.monthFactors?.[String(inputs.month)] ?? 1;
  const weekAngle = (2 * Math.PI * Number(inputs.week)) / 53;
  const seasonalWeekFactor = 1 + (Math.sin(weekAngle) * 0.12);
  const previousCases = Number(inputs.prevCases);
  const rollingMean8 = Number(profile.rollingMean8 ?? previousCases);
  const lag2 = Number(profile.lag2 ?? previousCases);

  const baseline = (previousCases * 0.52) + (rollingMean8 * 0.33) + (lag2 * 0.15);

  const temp = Number(inputs.temperature);
  const precip = Number(inputs.precipitation);
  const tempFactor = 1 + Math.max(-0.22, Math.min(0.35, (temp - 24) * 0.025));
  const precipFactor = 1 + Math.max(-0.2, Math.min(0.45, (precip - 80) * 0.002));

  const projectedCases = Math.max(0, baseline * monthFactor * seasonalWeekFactor * tempFactor * precipFactor);
  const threshold = Math.max(2, Number(profile.outbreakThreshold ?? 2));
  const projectedRisk = inferRisk(projectedCases, threshold);

  return {
    projectedCases: Number(projectedCases.toFixed(2)),
    projectedRisk,
    outbreakThreshold: threshold,
    monthFactor: Number(monthFactor.toFixed(3)),
    tempFactor: Number(tempFactor.toFixed(3)),
    precipFactor: Number(precipFactor.toFixed(3)),
    baseline: Number(baseline.toFixed(2)),
  };
}


export default function Prediccion() {
  const monthlyForecasts = backendSnapshot.futureForecasts.monthly;
  const weeklyForecasts = backendSnapshot.futureForecasts.weekly;
  const freeModeProfiles = backendSnapshot.freeModeProfiles ?? [];

  const [mode, setMode] = useState('forecast');

  const provinceOptions = useMemo(() => [...new Set(monthlyForecasts.map((item) => item.provincia))].sort(), [monthlyForecasts]);
  const [selectedProvince, setSelectedProvince] = useState(provinceOptions[0] ?? '');

  const cantonOptions = useMemo(
    () => [...new Set(monthlyForecasts.filter((item) => item.provincia === selectedProvince).map((item) => item.canton))].sort(),
    [monthlyForecasts, selectedProvince],
  );
  const [selectedCanton, setSelectedCanton] = useState('');

  useEffect(() => {
    if (cantonOptions.length > 0) {
      setSelectedCanton(cantonOptions[0]);
    }
  }, [selectedProvince, cantonOptions]);

  const yearOptions = useMemo(
    () =>
      [...new Set(monthlyForecasts.filter((item) => item.provincia === selectedProvince && item.canton === selectedCanton).map((item) => item.targetYear))].sort(),
    [monthlyForecasts, selectedProvince, selectedCanton],
  );
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    if (yearOptions.length > 0) {
      setSelectedYear(String(yearOptions[0]));
    }
  }, [yearOptions]);

  const monthOptions = useMemo(
    () =>
      monthlyForecasts
        .filter(
          (item) =>
            item.provincia === selectedProvince &&
            item.canton === selectedCanton &&
            String(item.targetYear) === String(selectedYear),
        )
        .sort((a, b) => a.targetMonth - b.targetMonth)
        .map((item) => ({ month: item.targetMonth, label: item.targetMonthName })),
    [monthlyForecasts, selectedProvince, selectedCanton, selectedYear],
  );
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    if (monthOptions.length > 0) {
      setSelectedMonth(String(monthOptions[0].month));
    }
  }, [monthOptions]);

  const selectedMonthRow = useMemo(
    () =>
      monthlyForecasts.find(
        (item) =>
          item.provincia === selectedProvince &&
          item.canton === selectedCanton &&
          String(item.targetYear) === String(selectedYear) &&
          String(item.targetMonth) === String(selectedMonth),
      ),
    [monthlyForecasts, selectedProvince, selectedCanton, selectedYear, selectedMonth],
  );

  const selectedWeeklyRows = useMemo(
    () =>
      weeklyForecasts
        .filter(
          (item) =>
            item.provincia === selectedProvince &&
            item.canton === selectedCanton &&
            String(item.targetYear) === String(selectedYear) &&
            String(item.targetMonth) === String(selectedMonth),
        )
        .sort((a, b) => a.targetWeek - b.targetWeek),
    [weeklyForecasts, selectedProvince, selectedCanton, selectedYear, selectedMonth],
  );

  const previousMonthRow = useMemo(() => {
    if (!selectedMonthRow) {
      return null;
    }
    const monthRows = monthlyForecasts
      .filter((item) => item.provincia === selectedProvince && item.canton === selectedCanton)
      .sort((a, b) => (a.targetYear - b.targetYear) || (a.targetMonth - b.targetMonth));
    const index = monthRows.findIndex(
      (item) => item.targetYear === selectedMonthRow.targetYear && item.targetMonth === selectedMonthRow.targetMonth,
    );
    return index > 0 ? monthRows[index - 1] : null;
  }, [monthlyForecasts, selectedProvince, selectedCanton, selectedMonthRow]);

  const projectedRiskTheme = selectedMonthRow ? riskStyle(selectedMonthRow.projectedRisk) : riskStyle('bajo');
  const trendCases = previousMonthRow && selectedMonthRow ? selectedMonthRow.projectedCases - previousMonthRow.projectedCases : null;

  const freeProvinceOptions = useMemo(() => [...new Set(freeModeProfiles.map((item) => item.provincia))].sort(), [freeModeProfiles]);
  const [freeProvince, setFreeProvince] = useState(freeProvinceOptions[0] ?? '');

  const freeCantonOptions = useMemo(
    () => [...new Set(freeModeProfiles.filter((item) => item.provincia === freeProvince).map((item) => item.canton))].sort(),
    [freeModeProfiles, freeProvince],
  );
  const [freeCanton, setFreeCanton] = useState('');

  useEffect(() => {
    if (freeCantonOptions.length > 0) {
      setFreeCanton(freeCantonOptions[0]);
    }
  }, [freeProvince, freeCantonOptions]);

  const selectedProfile = useMemo(
    () => freeModeProfiles.find((item) => item.provincia === freeProvince && item.canton === freeCanton),
    [freeModeProfiles, freeProvince, freeCanton],
  );

  const [freeInputs, setFreeInputs] = useState({
    year: '2026',
    month: '1',
    week: '1',
    temperature: '26',
    precipitation: '120',
    prevCases: '5',
  });

  useEffect(() => {
    if (selectedProfile) {
      const defaultMonth = Object.entries(selectedProfile.monthFactors ?? {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? '1';
      const suggestedWeek = String(Math.min(53, Math.max(1, (Number(defaultMonth) * 4) - 1)));
      setFreeInputs({
        year: '2026',
        month: String(defaultMonth),
        week: suggestedWeek,
        temperature: '26',
        precipitation: '120',
        prevCases: String(Math.round(selectedProfile.lag1 ?? selectedProfile.lastObservedCases ?? 0)),
      });
    }
  }, [selectedProfile]);

  const freePrediction = useMemo(() => {
    if (!selectedProfile) {
      return null;
    }
    return simulateFreePrediction(selectedProfile, freeInputs);
  }, [selectedProfile, freeInputs]);

  const freeRiskTheme = riskStyle(freePrediction?.projectedRisk ?? 'bajo');

  return (
    <div className="page-layout pred-page">
      <NavBar />
      <div className="page-content">
        <div className="page-header">
          <p className="eyebrow" style={{ fontSize: '.75rem' }}>Prediccion asistida por entrenamiento real</p>
          <h1 className="page-title">Prediccion futura y modo libre</h1>
          <p className="page-sub">
            Puedes explorar la proyeccion 2026 basada en el entrenamiento o activar un modo libre para ingresar semana,
            temperatura, precipitacion y casos previos. El modo libre usa el historial real del canton y ajustes de
            escenario sobre el entrenamiento actual.
          </p>
        </div>

        <div className="card" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            className="btn-line"
            style={mode === 'forecast' ? { background: 'rgba(6,182,212,.14)', borderColor: 'rgba(6,182,212,.6)', color: 'var(--cyan)' } : {}}
            onClick={() => setMode('forecast')}
          >
            Proyeccion 2026
          </button>
          <button
            className="btn-line"
            style={mode === 'free' ? { background: 'rgba(37,99,235,.12)', borderColor: 'rgba(37,99,235,.45)', color: '#2563eb' } : {}}
            onClick={() => setMode('free')}
          >
            Modo libre
          </button>
        </div>

        {mode === 'forecast' ? (
          <div className="pred-grid">
            <div className="card">
              <h3 className="card-title">Seleccion del escenario futuro</h3>

              <div className="field">
                <label className="field-label">Provincia</label>
                <select className="field-input" value={selectedProvince} onChange={(event) => setSelectedProvince(event.target.value)}>
                  {provinceOptions.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label">Canton</label>
                <select className="field-input" value={selectedCanton} onChange={(event) => setSelectedCanton(event.target.value)}>
                  {cantonOptions.map((canton) => (
                    <option key={canton} value={canton}>
                      {canton}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Anio proyectado</label>
                  <select className="field-input" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Mes proyectado</label>
                  <select className="field-input" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                    {monthOptions.map((month) => (
                      <option key={month.month} value={month.month}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedMonthRow && (
                <div className="feat-list" style={{ marginTop: 18 }}>
                  <div className="feat-row">
                    <span className="feat-name">Provincia</span>
                    <span className="feat-pct" style={{ width: 'auto' }}>{selectedProvince}</span>
                  </div>
                  <div className="feat-row">
                    <span className="feat-name">Semanas proyectadas</span>
                    <span className="feat-pct" style={{ width: 'auto' }}>{selectedMonthRow.weeks}</span>
                  </div>
                  <div className="feat-row">
                    <span className="feat-name">Promedio movil 8</span>
                    <span className="feat-pct" style={{ width: 'auto' }}>{fmt(selectedMonthRow.rollingMean8, 2)}</span>
                  </div>
                  <div className="feat-row">
                    <span className="feat-name">Umbral de brote</span>
                    <span className="feat-pct" style={{ width: 'auto' }}>{fmt(selectedMonthRow.outbreakThreshold, 0)}</span>
                  </div>
                  <div className="feat-row">
                    <span className="feat-name">Tendencia vs mes previo</span>
                    <span className="feat-pct" style={{ width: 'auto' }}>
                      {trendCases === null ? 'Sin referencia' : `${trendCases >= 0 ? '+' : ''}${fmt(trendCases, 2)} casos`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="card result-card">
              <h3 className="card-title">Proyeccion mensual 2026</h3>

              {!selectedMonthRow ? (
                <div className="result-empty">
                  <p>No hay proyecciones cargadas.</p>
                </div>
              ) : (
                <div className="result-body" style={{ alignItems: 'stretch' }}>
                  <div className="result-canton">{selectedCanton} · {selectedMonthRow.targetMonthName} {selectedYear}</div>

                  <div className="models-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
                    <div className="card model-card" style={{ marginBottom: 0 }}>
                      <h3 className="card-title" style={{ marginBottom: 12 }}>Regresion</h3>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}>
                        <span className="m-label">Casos proyectados del mes</span>
                        <span className="m-val cyan">{fmt(selectedMonthRow.projectedCases, 2)}</span>
                      </div>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}>
                        <span className="m-label">Promedio semanal</span>
                        <span className="m-val blue">{fmt(selectedMonthRow.avgWeeklyCases, 2)}</span>
                      </div>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}>
                        <span className="m-label">Pico semanal estimado</span>
                        <span className="m-val gold">{fmt(selectedMonthRow.maxWeeklyCases, 2)}</span>
                      </div>
                    </div>

                    <div className="card model-card" style={{ marginBottom: 0 }}>
                      <h3 className="card-title" style={{ marginBottom: 12 }}>Clasificacion</h3>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}>
                        <span className="m-label">Riesgo proyectado del mes</span>
                        <span className="result-badge" style={{ color: projectedRiskTheme.color, background: projectedRiskTheme.bg, border: `1px solid ${projectedRiskTheme.color}55` }}>
                          {selectedMonthRow.projectedRisk}
                        </span>
                      </div>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}>
                        <span className="m-label">Base estadistica</span>
                        <span className="factor-val">Proyeccion recursiva desde 2025</span>
                      </div>
                    </div>
                  </div>

                  <div className="result-factors" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 18 }}>
                    {selectedWeeklyRows.slice(0, 4).map((row) => (
                      <div key={row.targetPeriodId} className="factor">
                        <span className="factor-label">{row.targetPeriodId}</span>
                        <span className="factor-val">{fmt(row.projectedCases, 2)} · {row.projectedRisk}</span>
                      </div>
                    ))}
                  </div>
                  <p className="result-note">Proyeccion mensual construida agregando semanas futuras estimadas por los modelos entrenados.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="pred-grid">
            <div className="card">
              <h3 className="card-title">Modo libre de escenario</h3>

              <div className="field">
                <label className="field-label">Provincia</label>
                <select className="field-input" value={freeProvince} onChange={(event) => setFreeProvince(event.target.value)}>
                  {freeProvinceOptions.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label">Canton</label>
                <select className="field-input" value={freeCanton} onChange={(event) => setFreeCanton(event.target.value)}>
                  {freeCantonOptions.map((canton) => (
                    <option key={canton} value={canton}>
                      {canton}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Anio</label>
                  <input className="field-input" type="number" value={freeInputs.year} onChange={(event) => setFreeInputs((current) => ({ ...current, year: event.target.value }))} />
                </div>
                <div className="field">
                  <label className="field-label">Mes</label>
                  <input className="field-input" type="number" min="1" max="12" value={freeInputs.month} onChange={(event) => setFreeInputs((current) => ({ ...current, month: event.target.value }))} />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Semana epidemiologica</label>
                  <input className="field-input" type="number" min="1" max="53" value={freeInputs.week} onChange={(event) => setFreeInputs((current) => ({ ...current, week: event.target.value }))} />
                </div>
                <div className="field">
                  <label className="field-label">Casos previos</label>
                  <input className="field-input" type="number" min="0" value={freeInputs.prevCases} onChange={(event) => setFreeInputs((current) => ({ ...current, prevCases: event.target.value }))} />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Temperatura (°C)</label>
                  <input className="field-input" type="number" step="0.1" value={freeInputs.temperature} onChange={(event) => setFreeInputs((current) => ({ ...current, temperature: event.target.value }))} />
                </div>
                <div className="field">
                  <label className="field-label">Precipitacion (mm)</label>
                  <input className="field-input" type="number" step="0.1" value={freeInputs.precipitation} onChange={(event) => setFreeInputs((current) => ({ ...current, precipitation: event.target.value }))} />
                </div>
              </div>

              {selectedProfile && (
                <div className="feat-list" style={{ marginTop: 18 }}>
                  <div className="feat-row">
                    <span className="feat-name">Lag historico del canton</span>
                    <span className="feat-pct" style={{ width: 'auto' }}>{fmt(selectedProfile.lag1, 0)} casos</span>
                  </div>
                  <div className="feat-row">
                    <span className="feat-name">Rolling mean 8</span>
                    <span className="feat-pct" style={{ width: 'auto' }}>{fmt(selectedProfile.rollingMean8, 2)}</span>
                  </div>
                  <div className="feat-row">
                    <span className="feat-name">Factor estacional del mes</span>
                    <span className="feat-pct" style={{ width: 'auto' }}>{fmt(freePrediction?.monthFactor ?? 1, 3)}</span>
                  </div>
                  <div className="feat-row">
                    <span className="feat-name">Ajuste temperatura</span>
                    <span className="feat-pct" style={{ width: 'auto' }}>{fmt(freePrediction?.tempFactor ?? 1, 3)}</span>
                  </div>
                  <div className="feat-row">
                    <span className="feat-name">Ajuste precipitacion</span>
                    <span className="feat-pct" style={{ width: 'auto' }}>{fmt(freePrediction?.precipFactor ?? 1, 3)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="card result-card">
              <h3 className="card-title">Prediccion del modo libre</h3>

              {!freePrediction ? (
                <div className="result-empty">
                  <p>No hay perfil cargado para el canton seleccionado.</p>
                </div>
              ) : (
                <div className="result-body" style={{ alignItems: 'stretch' }}>
                  <div className="result-canton">{freeCanton} · Semana {freeInputs.week} · {freeInputs.year}</div>

                  <div className="models-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
                    <div className="card model-card" style={{ marginBottom: 0 }}>
                      <h3 className="card-title" style={{ marginBottom: 12 }}>Escenario ingresado</h3>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}>
                        <span className="m-label">Temperatura</span>
                        <span className="m-val cyan">{fmt(freeInputs.temperature, 1)} °C</span>
                      </div>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}>
                        <span className="m-label">Precipitacion</span>
                        <span className="m-val blue">{fmt(freeInputs.precipitation, 1)} mm</span>
                      </div>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}>
                        <span className="m-label">Casos previos</span>
                        <span className="m-val gold">{fmt(freeInputs.prevCases, 0)}</span>
                      </div>
                    </div>

                    <div className="card model-card" style={{ marginBottom: 0 }}>
                      <h3 className="card-title" style={{ marginBottom: 12 }}>Resultado estimado</h3>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}>
                        <span className="m-label">Casos esperados</span>
                        <span className="m-val cyan">{fmt(freePrediction.projectedCases, 2)}</span>
                      </div>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}>
                        <span className="m-label">Riesgo estimado</span>
                        <span className="result-badge" style={{ color: freeRiskTheme.color, background: freeRiskTheme.bg, border: `1px solid ${freeRiskTheme.color}55` }}>
                          {freePrediction.projectedRisk}
                        </span>
                      </div>
                      <div className="m-metric" style={{ alignItems: 'flex-start' }}>
                        <span className="m-label">Umbral del canton</span>
                        <span className="factor-val">{fmt(freePrediction.outbreakThreshold, 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="result-factors" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 18 }}>
                    <div className="factor">
                      <span className="factor-label">Base epidemiologica</span>
                      <span className="factor-val">{fmt(freePrediction.baseline, 2)}</span>
                    </div>
                    <div className="factor">
                      <span className="factor-label">Mes</span>
                      <span className="factor-val">{freeInputs.month}</span>
                    </div>
                    <div className="factor">
                      <span className="factor-label">Semana</span>
                      <span className="factor-val">{freeInputs.week}</span>
                    </div>
                    <div className="factor">
                      <span className="factor-label">Metodo</span>
                      <span className="factor-val">Historial real + ajuste de escenario</span>
                    </div>
                  </div>
                  <p className="result-note">Modo libre: usa el historial entrenado del canton y aplica ajustes de escenario para temperatura y precipitacion. Para que clima sea variable nativa del modelo, hay que entrenar fase 2 con dataset climatico real.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
