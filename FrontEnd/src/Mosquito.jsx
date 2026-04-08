import { useEffect, useRef, useState } from 'react';

/* ── SVG Aedes aegypti (mosquito del dengue) ── */
function MosquitoSVG() {
  return (
    <svg width="90" height="90" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Alas - semi translúcidas con nervadura */}
      <g className="mosq-wings">
        <ellipse cx="27" cy="42" rx="25" ry="11"
          fill="rgba(190,225,245,0.45)" stroke="rgba(100,170,200,0.5)" strokeWidth="0.7"/>
        <line x1="27" y1="31" x2="27" y2="53" stroke="rgba(100,170,200,0.35)" strokeWidth="0.5"/>
        <line x1="14" y1="38" x2="40" y2="46" stroke="rgba(100,170,200,0.25)" strokeWidth="0.4"/>

        <ellipse cx="73" cy="42" rx="25" ry="11"
          fill="rgba(190,225,245,0.45)" stroke="rgba(100,170,200,0.5)" strokeWidth="0.7"/>
        <line x1="73" y1="31" x2="73" y2="53" stroke="rgba(100,170,200,0.35)" strokeWidth="0.5"/>
        <line x1="60" y1="38" x2="86" y2="46" stroke="rgba(100,170,200,0.25)" strokeWidth="0.4"/>
      </g>

      {/* Abdomen con rayas blancas (Aedes aegypti) */}
      <ellipse cx="50" cy="74" rx="7" ry="22" fill="#111"/>
      <rect x="43.5" y="63" width="13" height="3"   rx="1.5" fill="rgba(255,255,255,0.65)"/>
      <rect x="43.5" y="69" width="13" height="2.8" rx="1.5" fill="rgba(255,255,255,0.55)"/>
      <rect x="43.5" y="75" width="13" height="2.6" rx="1.5" fill="rgba(255,255,255,0.45)"/>
      <rect x="44"   y="81" width="12" height="2.4" rx="1.5" fill="rgba(255,255,255,0.35)"/>
      <rect x="45"   y="87" width="10" height="2"   rx="1.5" fill="rgba(255,255,255,0.25)"/>

      {/* Tórax */}
      <ellipse cx="50" cy="52" rx="8.5" ry="11" fill="#1a1a1a"/>
      {/* Escudo blanco característico del Aedes */}
      <ellipse cx="50" cy="49" rx="4" ry="5" fill="rgba(255,255,255,0.18)"/>
      <path d="M47 47 Q50 44 53 47" stroke="rgba(255,255,255,0.5)" strokeWidth="1" fill="none"/>

      {/* Cabeza */}
      <circle cx="50" cy="38" r="7" fill="#111"/>
      {/* Ojos rojos */}
      <circle cx="45.5" cy="36.5" r="2.2" fill="#cc0000"/>
      <circle cx="54.5" cy="36.5" r="2.2" fill="#cc0000"/>
      <circle cx="45.2" cy="36.2" r="0.8" fill="rgba(255,100,100,0.6)"/>
      <circle cx="54.2" cy="36.2" r="0.8" fill="rgba(255,100,100,0.6)"/>

      {/* Antenas */}
      <path d="M47 32 Q43 25 39 17" stroke="#222" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
      <path d="M53 32 Q57 25 61 17" stroke="#222" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
      {/* Puntas de antena */}
      <circle cx="39" cy="17" r="1.2" fill="#333"/>
      <circle cx="61" cy="17" r="1.2" fill="#333"/>

      {/* Probóscide (aguja larga hacia arriba) */}
      <path d="M50 32 L50 4" stroke="#2a2a2a" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M50 4  L49 0" stroke="#2a2a2a" strokeWidth="1"   strokeLinecap="round"/>

      {/* Patas - 3 por lado con rayas blancas */}
      <path d="M43 54 Q33 57 20 60" stroke="#111" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M30 60 Q26 61 20 60"  stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M43 59 Q31 64 17 71" stroke="#111" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M29 66 Q24 68 17 71"  stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M43 65 Q32 72 19 82" stroke="#111" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M30 74 Q25 77 19 82"  stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" strokeLinecap="round"/>

      <path d="M57 54 Q67 57 80 60" stroke="#111" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M70 60 Q74 61 80 60"  stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M57 59 Q69 64 83 71" stroke="#111" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M71 66 Q76 68 83 71"  stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M57 65 Q68 72 81 82" stroke="#111" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M70 74 Q75 77 81 82"  stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" strokeLinecap="round"/>
    </svg>
  );
}

/* ── Lógica de vuelo ── */
export default function Mosquito({ onPositionChange }) {
  const [display, setDisplay] = useState({ x: -200, y: -200, angle: 0, scaleX: 1 });

  const posRef    = useRef(null);
  const velRef    = useRef({ x: 0, y: 0 });
  const targetRef = useRef(null);
  const rafRef    = useRef(null);
  const timerRef  = useRef(null);
  const dispRef   = useRef({ x: -200, y: -200, angle: 0, scaleX: 1 });

  useEffect(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    posRef.current    = { x: W * 0.5, y: H * 0.45 };
    targetRef.current = { x: W * 0.5, y: H * 0.45 };

    const pickTarget = () => {
      targetRef.current = {
        x: 100 + Math.random() * (W - 200),
        y: 80  + Math.random() * (H - 160),
      };
      timerRef.current = setTimeout(pickTarget, 2200 + Math.random() * 2800);
    };
    pickTarget();

    let lastTime = performance.now();

    const animate = (now) => {
      /* dt normalizado a 60fps para que la velocidad no dependa del hardware */
      const dt = Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;

      const dx = targetRef.current.x - posRef.current.x;
      const dy = targetRef.current.y - posRef.current.y;

      /* Spring suave — valores bajos = más fluido */
      velRef.current.x = velRef.current.x * 0.90 + dx * 0.010 * dt;
      velRef.current.y = velRef.current.y * 0.90 + dy * 0.010 * dt;

      /* Micro-drift orgánico (seno de baja frecuencia, no abrupto) */
      const t = now * 0.001;
      velRef.current.x += Math.sin(t * 1.8) * 0.18;
      velRef.current.y += Math.cos(t * 1.3) * 0.18;

      posRef.current.x = Math.max(65, Math.min(W - 65, posRef.current.x + velRef.current.x));
      posRef.current.y = Math.max(65, Math.min(H - 65, posRef.current.y + velRef.current.y));

      /* Ángulo de rotación: la probóscide apunta hacia donde vuela */
      const speed = Math.hypot(velRef.current.x, velRef.current.y);
      let angle = dispRef.current.angle;
      if (speed > 0.4) {
        const targetAngle = Math.atan2(velRef.current.y, velRef.current.x) * (180 / Math.PI) + 90;
        angle = dispRef.current.angle + (targetAngle - dispRef.current.angle) * 0.08;
      }

      const scaleX = velRef.current.x < -0.3 ? -1 : 1;
      const newPos = { x: posRef.current.x, y: posRef.current.y };

      dispRef.current = { ...newPos, angle, scaleX };
      setDisplay({ ...newPos, angle, scaleX });
      onPositionChange?.(newPos);

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className="mosquito"
      style={{
        left: display.x,
        top:  display.y,
        transform: `translate(-50%, -50%) rotate(${display.angle}deg) scaleX(${display.scaleX})`,
      }}
    >
      <div className="mosq-body">
        <MosquitoSVG />
      </div>
    </div>
  );
}