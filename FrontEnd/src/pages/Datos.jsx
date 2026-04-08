import Navbar from '../components/Navbar';

/* ── Datos reales del dataset MSP 2021-2025 ── */
const STATS_GLOBALES = [
  { label: 'Total casos registrados', value: '160,660', tone: 'cyan' },
  { label: 'Sin signos de alarma',    value: '137,616', tone: 'blue' },
  { label: 'Con signos / Graves',     value: '23,044',  tone: 'gold' },
  { label: 'Fallecidos registrados',  value: '194',     tone: 'red'  },
];

const POR_ANIO = [
  { año: '2021', casos: 18178  },
  { año: '2022', casos: 14285  },
  { año: '2023', casos: 24218  },
  { año: '2024', casos: 52282  },
  { año: '2025', casos: 28653  },
];
const MAX_ANIO = Math.max(...POR_ANIO.map(d => d.casos));

const TOP_CANTONS = [
  { canton: 'Guayaquil',     casos: 13561, provincia: 'Guayas'        },
  { canton: 'Santo Domingo', casos: 10398, provincia: 'Sto. Domingo'  },
  { canton: 'Tena',          casos:  7659, provincia: 'Napo'           },
  { canton: 'Machala',       casos:  5777, provincia: 'El Oro'         },
  { canton: 'Manta',         casos:  4953, provincia: 'Manabí'         },
  { canton: 'Durán',         casos:  4591, provincia: 'Guayas'         },
  { canton: 'Jipijapa',      casos:  4469, provincia: 'Manabí'         },
  { canton: 'Pastaza',       casos:  4338, provincia: 'Pastaza'        },
];
const MAX_CANTON = TOP_CANTONS[0].casos;

const TOP_PROV = [
  { prov: 'Manabí',               casos: 25076 },
  { prov: 'Guayas',               casos: 24419 },
  { prov: 'Sto. Domingo',         casos: 13554 },
  { prov: 'El Oro',               casos: 10691 },
  { prov: 'Napo',                 casos:  8872 },
  { prov: 'Los Ríos',             casos:  8365 },
  { prov: 'Esmeraldas',           casos:  7794 },
  { prov: 'Morona Santiago',      casos:  7747 },
];
const MAX_PROV = TOP_PROV[0].casos;

const EDAD = [
  { grupo: '<1',    casos:  2470 },
  { grupo: '1-4',   casos: 10389 },
  { grupo: '5-9',   casos: 18608 },
  { grupo: '10-14', casos: 23866 },
  { grupo: '15-19', casos: 17936 },
  { grupo: '20-49', casos: 49665 },
  { grupo: '50-64', casos:  9922 },
  { grupo: '65+',   casos:  4760 },
];
const MAX_EDAD = Math.max(...EDAD.map(d => d.casos));

const HOMBRES = 69411;
const MUJERES = 68205;
const TOTAL_SEXO = HOMBRES + MUJERES;

function BarH({ value, max, color = 'var(--cyan)' }) {
  return (
    <div className="feat-bar-track">
      <div className="feat-bar-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}

function fmt(n) { return n.toLocaleString('es-EC'); }

export default function Datos() {
  return (
   <div className="page-layout datos-page">
      <Navbar />
      <div className="page-content">

        <div className="page-header">
          <p className="eyebrow" style={{ fontSize: '.75rem' }}>Dataset MSP / PAHO / INEC</p>
          <h1 className="page-title">Explorador de datos</h1>
          <p className="page-sub">
            Registros epidemiológicos de dengue en Ecuador 2021–2025.
            Fuente oficial: Ministerio de Salud Pública · 189 cantones · 24 provincias.
          </p>
        </div>

        {/* Stats globales */}
        <div className="stats-grid">
          {STATS_GLOBALES.map(s => (
            <div key={s.label} className="stat-card">
              <span className={`metric-val ${s.tone === 'red' ? '' : s.tone}`}
                    style={s.tone === 'red' ? { color:'#ef4444', fontSize:'1.6rem', fontWeight:700, lineHeight:1 } : { fontSize:'1.6rem' }}>
                {s.value}
              </span>
              <span className="metric-label" style={{ fontSize: '.65rem' }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="datos-grid">

          {/* Casos por año */}
          <div className="card">
            <h3 className="card-title">Casos por año · DSSA</h3>
            <div className="bar-chart">
              {POR_ANIO.map(d => (
                <div key={d.año} className="bar-item">
                  <div className="bar-track-v">
                    <div className="bar-fill-v"
                      style={{ height: `${(d.casos / MAX_ANIO) * 100}%`, background:'var(--cyan)' }} />
                  </div>
                  <span className="bar-label">{d.año}</span>
                  <span className="bar-val">{(d.casos / 1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
            <p className="table-note">
              🔺 2024 fue el año con más casos: 52,282 — pico en semana epidemiológica 20
            </p>
          </div>

          {/* Distribución por sexo */}
          <div className="card sexo-card">
            <h3 className="card-title">Distribución por sexo</h3>
            <div className="donut-wrap">
              <svg viewBox="0 0 100 100" className="donut-svg">
                <circle cx="50" cy="50" r="38" fill="none"
                  stroke="var(--cyan)" strokeWidth="18"
                  strokeDasharray={`${(HOMBRES / TOTAL_SEXO) * 238.76} 238.76`}
                  strokeDashoffset="59.69" />
                <circle cx="50" cy="50" r="38" fill="none"
                  stroke="#2563eb" strokeWidth="18"
                  strokeDasharray={`${(MUJERES / TOTAL_SEXO) * 238.76} 238.76`}
                  strokeDashoffset={`${-(HOMBRES / TOTAL_SEXO) * 238.76 + 59.69}`} />
                <text x="50" y="46" textAnchor="middle"
                  fill="rgba(10,10,20,.8)" fontSize="9" fontWeight="700" fontFamily="Sora,sans-serif">
                  {fmt(TOTAL_SEXO)}
                </text>
                <text x="50" y="57" textAnchor="middle"
                  fill="rgba(10,10,20,.4)" fontSize="5.5" fontFamily="Sora,sans-serif">
                  total casos
                </text>
              </svg>
            </div>
            <div className="sexo-legend">
              <div className="legend-item">
                <span className="legend-dot" style={{ background:'var(--cyan)' }}/>
                <span className="legend-label">Hombres</span>
                <span className="legend-val cyan">{fmt(HOMBRES)} · {((HOMBRES/TOTAL_SEXO)*100).toFixed(1)}%</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background:'#2563eb' }}/>
                <span className="legend-label">Mujeres</span>
                <span className="legend-val blue">{fmt(MUJERES)} · {((MUJERES/TOTAL_SEXO)*100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

        </div>

        {/* Grupos de edad */}
        <div className="card">
          <h3 className="card-title">Casos por grupo de edad</h3>
          <div className="edad-grid">
            {EDAD.map(d => (
              <div key={d.grupo} className="edad-item">
                <div className="edad-bar-track">
                  <div className="edad-bar-fill"
                    style={{ height: `${(d.casos / MAX_EDAD) * 100}%` }} />
                </div>
                <span className="edad-grupo">{d.grupo}</span>
                <span className="edad-val">{(d.casos/1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
          <p className="table-note">
            🔺 Grupo 20-49 años concentra el 36.1% de los casos totales
          </p>
        </div>

        <div className="datos-grid">

          {/* Top cantones */}
          <div className="card">
            <h3 className="card-title">Top 8 cantones más afectados</h3>
            <div className="feat-list">
              {TOP_CANTONS.map((d, i) => (
                <div key={i} className="feat-row">
                  <div style={{ display:'flex', flexDirection:'column', width:140 }}>
                    <span className="feat-name" style={{ width:'auto' }}>{d.canton}</span>
                    <span className="metric-label" style={{ fontSize:'.55rem' }}>{d.provincia}</span>
                  </div>
                  <BarH value={d.casos} max={MAX_CANTON} color="var(--cyan)" />
                  <span className="feat-pct" style={{ width:46 }}>{fmt(d.casos)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top provincias */}
          <div className="card">
            <h3 className="card-title">Top 8 provincias más afectadas</h3>
            <div className="feat-list">
              {TOP_PROV.map((d, i) => (
                <div key={i} className="feat-row">
                  <span className="feat-name">{d.prov}</span>
                  <BarH value={d.casos} max={MAX_PROV} color="#2563eb" />
                  <span className="feat-pct" style={{ width:46 }}>{fmt(d.casos)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Tabla muestra */}
        <div className="card table-card">
          <div className="card-head">
            <h3 className="card-title">Variables del dataset · DSSA</h3>
            <span className="card-tag">35,749 registros agregados · 2021–2024</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Variable</th><th>Descripción</th><th>Tipo</th><th>Ejemplo</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Año',        'Año de notificación',          'Numérico', '2024'],
                  ['Semana',     'Semana epidemiológica',         'Numérico', '20'],
                  ['Provincia',  'Nombre de la provincia',        'Texto',    'GUAYAS'],
                  ['Canton',     'Nombre del cantón',             'Texto',    'GUAYAQUIL'],
                  ['Hombres',    'Total casos en hombres',        'Numérico', '12'],
                  ['Mujeres',    'Total casos en mujeres',        'Numérico', '8'],
                  ['Total',      'Total de casos (H + M)',        'Numérico', '20'],
                  ['10-14 H',    'Casos hombres 10-14 años',     'Numérico', '3'],
                  ['20-49 M',    'Casos mujeres 20-49 años',     'Numérico', '5'],
                  ['Evento',     'Código CIE-10 del diagnóstico', 'Texto',    'A90X'],
                ].map(([v, d, t, e], i) => (
                  <tr key={i}>
                    <td className="td-bold" style={{ fontFamily:'monospace', color:'var(--cyan)' }}>{v}</td>
                    <td>{d}</td>
                    <td><span className="risk-chip" style={{ color:'#8b5cf6', background:'rgba(139,92,246,.08)', border:'1px solid rgba(139,92,246,.2)' }}>{t}</span></td>
                    <td className="td-num">{e}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-note">
            Fuente: MSP Ecuador · Hoja DSSA_2021_2024 · {fmt(137616)} casos sin signos de alarma
          </p>
        </div>

      </div>
    </div>
  );
}