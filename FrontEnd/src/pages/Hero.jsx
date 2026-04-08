import Spline from '@splinetool/react-spline';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Mosquito from '../Mosquito';
import backendSnapshot from '../data/backendSnapshot.json';

const NAV_LINKS = [
  { to: '/prediccion', label: 'Prediccion' },
  { to: '/datos', label: 'Datos' },
  { to: '/entrenamiento', label: 'Entrenamiento' },
];

function formatCompact(value) {
  return new Intl.NumberFormat('es-EC', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export default function Hero() {
  const [centerFocus, setCenterFocus] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const centerRef = useRef(false);
  const splineBgRef = useRef(null);
  const navigate = useNavigate();

  const metrics = [
    { label: 'R2 regresion', value: backendSnapshot.training.regression.r2.toFixed(3), tone: 'cyan' },
    { label: 'Accuracy riesgo', value: backendSnapshot.training.classification.accuracy.toFixed(3), tone: 'blue' },
    { label: 'Cantones', value: String(backendSnapshot.overview.cantons), tone: 'gold' },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setSceneReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleMosquitoPosition = useCallback((pos) => {
    const xPct = (pos.x / window.innerWidth) * 100;
    const isCenter = xPct > 28 && xPct < 72;
    if (centerRef.current !== isCenter) {
      centerRef.current = isCenter;
      setCenterFocus(isCenter);
    }
    if (splineBgRef.current) {
      const canvas = splineBgRef.current.querySelector('canvas') ?? splineBgRef.current;
      canvas.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: pos.x,
          clientY: pos.y,
          view: window,
        }),
      );
    }
  }, []);

  return (
    <main className="app">
      <section className="hero">
        <div className="spline-bg" ref={splineBgRef}>
          <Spline
            scene="https://prod.spline.design/p10SBeJMwqghZCQ7/scene.splinecode"
            onLoad={() => setSceneReady(true)}
          />
        </div>

        <div className="scene-vignette" />
        <div className="scene-grid" />
        <Mosquito onPositionChange={handleMosquitoPosition} />

        <div className={`intro-mask ${sceneReady ? 'hide' : ''}`}>
          <span className="intro-chip">Cargando snapshot epidemiologico...</span>
        </div>

        <nav className="top-nav">
          <div className="nav-brand">
            <span className="brand-dot" />
            <span className="brand-name">INTELIGENCIA ARTESANAL</span>
          </div>
          <div className="hero-nav-links">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="hero-nav-link">
                {link.label}
              </Link>
            ))}
            <span className="nav-badge">ESPOCH · Hackaton 2026</span>
          </div>
        </nav>

        <div className="ui-layer">
          <aside className={`side left ${centerFocus ? 'dim' : ''}`}>
            <p className="eyebrow">Backend + Frontend conectados</p>
            <h2>
              El dengue
              <br />
              <em>ya tiene</em>
              <br />
              tablero real.
            </h2>
            <p className="sub">
              El frontend ahora consume resultados reales del pipeline semanal por canton. Muestra datos historicos,
              entrenamiento validado en el tiempo y predicciones del conjunto de prueba.
            </p>
            <div className="cta-row">
              <button className="btn-ghost" onClick={() => navigate('/entrenamiento')}>
                Ver entrenamiento
              </button>
              <button className="btn-line" onClick={() => navigate('/prediccion')}>
                Explorar predicciones
              </button>
            </div>
          </aside>

          <aside className={`side right ${centerFocus ? 'dim' : ''}`}>
            <div className="info-block">
              <p className="block-label">Modelo activo</p>
              <p className="block-value">
                {backendSnapshot.training.regression.modelName}
                <br />
                {backendSnapshot.training.classification.modelName}
              </p>
            </div>
            <div className="info-block">
              <p className="block-label">Cobertura</p>
              <p className="block-value">
                {backendSnapshot.overview.yearMin}-{backendSnapshot.overview.yearMax}
                <br />
                {formatCompact(backendSnapshot.overview.totalCases)} casos totales
              </p>
            </div>
            <div className="divider" />
            <div id="metricas" className="metrics-row">
              {metrics.map((metric) => (
                <div key={metric.label} className="metric">
                  <span className={`metric-val ${metric.tone}`}>{metric.value}</span>
                  <span className="metric-label">{metric.label}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className={`bottom-strip ${centerFocus ? 'dim' : ''}`}>
          <span>MSP · series semanales reales</span>
          <span className="strip-dot" />
          <span>{backendSnapshot.overview.cantons} cantones</span>
          <span className="strip-dot" />
          <span>{backendSnapshot.overview.periods} semanas epidemiologicas</span>
          <span className="strip-dot" />
          <span>{backendSnapshot.overview.modelReadyRows} filas listas para modelado</span>
        </div>
      </section>
    </main>
  );
}
