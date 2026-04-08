import { Link, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/',               label: 'Inicio'        },
  { to: '/prediccion',     label: 'Predicción'    },
  { to: '/datos',          label: 'Datos'         },
  { to: '/entrenamiento',  label: 'Entrenamiento' },
];

export default function NavBar() {
  const { pathname } = useLocation();
  return (
    <header className="inner-nav">
      <Link to="/" className="inner-brand">
        <span className="brand-dot" />
        <span className="brand-name">INTELIGENCIA ARTESANAL</span>
      </Link>
      <nav className="inner-links">
        {LINKS.map(l => (
          <Link
            key={l.to}
            to={l.to}
            className={`inner-link ${pathname === l.to ? 'active' : ''}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <span className="nav-badge">ESPOCH · Hackaton 2026</span>
    </header>
  );
}