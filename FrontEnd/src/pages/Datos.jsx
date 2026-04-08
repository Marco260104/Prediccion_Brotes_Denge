import Navbar from '../components/Navbar';
import backendSnapshot from '../data/backendSnapshot.json';

function fmt(value) {
  return new Intl.NumberFormat('es-EC').format(value);
}

function pct(value, total) {
  if (!total) {
    return '0.0%';
  }
  return `${((value / total) * 100).toFixed(1)}%`;
}

function BarH({ value, max, color = 'var(--cyan)' }) {
  return (
    <div className="feat-bar-track">
      <div className="feat-bar-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}

export default function Datos() {
  const overview = backendSnapshot.overview;
  const stats = [
    { label: 'Total casos registrados', value: fmt(overview.totalCases), tone: 'cyan' },
    { label: 'Sin signos de alarma', value: fmt(overview.casosSinSignos), tone: 'blue' },
    { label: 'Con signos de alarma', value: fmt(overview.casosConAlarma), tone: 'gold' },
    { label: 'Casos graves / fallecidos', value: `${fmt(overview.casosGraves)} / ${fmt(overview.fallecidos)}`, tone: 'red' },
  ];

  const yearlyCases = backendSnapshot.yearlyCases;
  const maxYear = Math.max(...yearlyCases.map((item) => item.cases));
  const topCantons = backendSnapshot.topCantons;
  const topProvinces = backendSnapshot.topProvinces;
  const ageDistribution = backendSnapshot.ageDistribution;
  const maxAge = Math.max(...ageDistribution.map((item) => item.cases));
  const maxCanton = Math.max(...topCantons.map((item) => item.cases));
  const maxProvince = Math.max(...topProvinces.map((item) => item.cases));
  const totalSex = backendSnapshot.sexDistribution.hombres + backendSnapshot.sexDistribution.mujeres;

  return (
    <div className="page-layout datos-page">
      <Navbar />
      <div className="page-content">
        <div className="page-header">
          <p className="eyebrow" style={{ fontSize: '.75rem' }}>Dataset MSP procesado por backend</p>
          <h1 className="page-title">Explorador de datos reales</h1>
          <p className="page-sub">
            Esta vista resume la tabla maestra semanal construida por el backend a partir de los Excel oficiales y las
            variables agregadas para el entrenamiento.
          </p>
        </div>

        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <span className={`metric-val ${stat.tone === 'red' ? '' : stat.tone}`} style={stat.tone === 'red' ? { color: '#ef4444', fontSize: '1.5rem' } : { fontSize: '1.5rem' }}>
                {stat.value}
              </span>
              <span className="metric-label" style={{ fontSize: '.65rem' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="datos-grid">
          <div className="card">
            <h3 className="card-title">Casos totales por anio</h3>
            <div className="bar-chart">
              {yearlyCases.map((item) => (
                <div key={item.year} className="bar-item">
                  <div className="bar-track-v">
                    <div className="bar-fill-v" style={{ height: `${(item.cases / maxYear) * 100}%`, background: 'var(--cyan)' }} />
                  </div>
                  <span className="bar-label">{item.year}</span>
                  <span className="bar-val">{fmt(item.cases)}</span>
                </div>
              ))}
            </div>
            <p className="table-note">Pico observado: {yearlyCases.reduce((prev, cur) => (cur.cases > prev.cases ? cur : prev)).year}</p>
          </div>

          <div className="card sexo-card">
            <h3 className="card-title">Distribucion por sexo</h3>
            <div className="donut-wrap">
              <svg viewBox="0 0 100 100" className="donut-svg">
                <circle cx="50" cy="50" r="38" fill="none" stroke="var(--cyan)" strokeWidth="18" strokeDasharray={`${(backendSnapshot.sexDistribution.hombres / totalSex) * 238.76} 238.76`} strokeDashoffset="59.69" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#2563eb" strokeWidth="18" strokeDasharray={`${(backendSnapshot.sexDistribution.mujeres / totalSex) * 238.76} 238.76`} strokeDashoffset={`${-(backendSnapshot.sexDistribution.hombres / totalSex) * 238.76 + 59.69}`} />
                <text x="50" y="46" textAnchor="middle" fill="rgba(10,10,20,.8)" fontSize="9" fontWeight="700" fontFamily="Sora,sans-serif">
                  {fmt(totalSex)}
                </text>
                <text x="50" y="57" textAnchor="middle" fill="rgba(10,10,20,.4)" fontSize="5.5" fontFamily="Sora,sans-serif">
                  casos con sexo reportado
                </text>
              </svg>
            </div>
            <div className="sexo-legend">
              <div className="legend-item">
                <span className="legend-dot" style={{ background: 'var(--cyan)' }} />
                <span className="legend-label">Hombres</span>
                <span className="legend-val cyan">{fmt(backendSnapshot.sexDistribution.hombres)} · {pct(backendSnapshot.sexDistribution.hombres, totalSex)}</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#2563eb' }} />
                <span className="legend-label">Mujeres</span>
                <span className="legend-val blue">{fmt(backendSnapshot.sexDistribution.mujeres)} · {pct(backendSnapshot.sexDistribution.mujeres, totalSex)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Casos por grupo de edad</h3>
          <div className="edad-grid">
            {ageDistribution.map((item) => (
              <div key={item.group} className="edad-item">
                <div className="edad-bar-track">
                  <div className="edad-bar-fill" style={{ height: `${(item.cases / maxAge) * 100}%` }} />
                </div>
                <span className="edad-grupo">{item.group}</span>
                <span className="edad-val">{fmt(item.cases)}</span>
              </div>
            ))}
          </div>
          <p className="table-note">Distribucion agregada desde la tabla semanal homologada.</p>
        </div>

        <div className="datos-grid">
          <div className="card">
            <h3 className="card-title">Top 8 cantones mas afectados</h3>
            <div className="feat-list">
              {topCantons.map((item) => (
                <div key={`${item.canton}-${item.provincia}`} className="feat-row">
                  <div style={{ display: 'flex', flexDirection: 'column', width: 160 }}>
                    <span className="feat-name" style={{ width: 'auto' }}>{item.canton}</span>
                    <span className="metric-label" style={{ fontSize: '.55rem' }}>{item.provincia}</span>
                  </div>
                  <BarH value={item.cases} max={maxCanton} color="var(--cyan)" />
                  <span className="feat-pct" style={{ width: 60 }}>{fmt(item.cases)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Top 8 provincias mas afectadas</h3>
            <div className="feat-list">
              {topProvinces.map((item) => (
                <div key={item.province} className="feat-row">
                  <span className="feat-name">{item.province}</span>
                  <BarH value={item.cases} max={maxProvince} color="#2563eb" />
                  <span className="feat-pct" style={{ width: 60 }}>{fmt(item.cases)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card table-card">
          <div className="card-head">
            <h3 className="card-title">Variables exportadas al entrenamiento</h3>
            <span className="card-tag">{fmt(overview.modelReadyRows)} filas listas para modelado</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Descripcion</th>
                  <th>Tipo</th>
                  <th>Ejemplo</th>
                </tr>
              </thead>
              <tbody>
                {backendSnapshot.variablesSample.map((item) => (
                  <tr key={item.variable}>
                    <td className="td-bold" style={{ fontFamily: 'monospace', color: 'var(--cyan)' }}>{item.variable}</td>
                    <td>{item.descripcion}</td>
                    <td>
                      <span className="risk-chip" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)' }}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="td-num">{String(item.ejemplo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-note">El frontend consume un snapshot generado automaticamente desde los reportes del backend.</p>
        </div>
      </div>
    </div>
  );
}
