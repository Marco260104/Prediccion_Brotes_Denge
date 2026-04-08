import Spline from '@splinetool/react-spline';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Mosquito from '../Mosquito';

const metrics = [
  { label: 'Precisión R²', value: '98.4%', tone: 'cyan' },
  { label: 'Cantonales',   value: '221',   tone: 'blue' },
  { label: 'Casos 2023',   value: '27K+',  tone: 'gold' },
];

const NAV_LINKS = [
  { to: '/prediccion',    label: 'Predicción'    },
  { to: '/datos',         label: 'Datos'         },
  { to: '/entrenamiento', label: 'Entrenamiento' },
];

export default function Hero() {
  const [centerFocus, setCenterFocus] = useState(false);
  const [sceneReady,  setSceneReady]  = useState(false);
  const centerRef   = useRef(false);
  const splineBgRef = useRef(null);
  const navigate    = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setSceneReady(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const handleMosquitoPosition = useCallback((pos) => {
    const xPct     = (pos.x / window.innerWidth) * 100;
    const isCenter = xPct > 28 && xPct < 72;
    if (centerRef.current !== isCenter) {
      centerRef.current = isCenter;
      setCenterFocus(isCenter);
    }
    if (splineBgRef.current) {
      const canvas = splineBgRef.current.querySelector('canvas') ?? splineBgRef.current;
      canvas.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true, cancelable: true,
          clientX: pos.x, clientY: pos.y, view: window,
        })
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
          <span className="intro-chip">Cargando modelo neural…</span>
        </div>

        {/* NAV */}
        <nav className="top-nav">
          <div className="nav-brand">
            <span className="brand-dot" />
            <span className="brand-name">INTELIGENCIA ARTESANAL</span>
          </div>
          <div className="hero-nav-links">
            {NAV_LINKS.map(l => (
              <Link key={l.to} to={l.to} className="hero-nav-link">{l.label}</Link>
            ))}
            <span className="nav-badge">ESPOCH · Hackaton 2026</span>
          </div>
        </nav>

        {/* UI PANELS */}
        <div className="ui-layer">

          <aside className={`side left ${centerFocus ? 'dim' : ''}`}>
            <p className="eyebrow">IA · Machine Learning · Ecuador</p>
            <h2>
              El dengue<br />
              <em>no nos</em><br />
              sorprende.
            </h2>
            <p className="sub">
              Anticipamos brotes cantonales antes de que ocurran, usando clima,
              historial epidémico y semana epidemiológica.
            </p>
            <div className="cta-row">
              <button className="btn-ghost" onClick={() => navigate('/entrenamiento')}>
                Ver entrenamiento
              </button>
              <button className="btn-line" onClick={() => navigate('/datos')}>
                Explorar datos
              </button>
            </div>
          </aside>

          <aside className={`side right ${centerFocus ? 'dim' : ''}`}>
            <div className="info-block">
              <p className="block-label">Modelo activo</p>
              <p className="block-value">Random Forest · XGBoost</p>
            </div>
            <div className="info-block">
              <p className="block-label">Variables</p>
              <p className="block-value">Temp · Precipitación · Casos previos</p>
            </div>
            <div className="divider" />
            <div id="metricas" className="metrics-row">
              {metrics.map((m) => (
                <div key={m.label} className="metric">
                  <span className={`metric-val ${m.tone}`}>{m.value}</span>
                  <span className="metric-label">{m.label}</span>
                </div>
              ))}
            </div>
          </aside>

        </div>

        <div className={`bottom-strip ${centerFocus ? 'dim' : ''}`}>
          <span>Fuente · MSP / PAHO / INEC</span>
          <span className="strip-dot" />
          <span>Predicción cantonal · 221 zonas</span>
          <span className="strip-dot" />
          <span>Datos abiertos Ecuador 2023</span>
        </div>

      </section>
    </main>
  );
}