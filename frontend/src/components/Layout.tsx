import { Box, CircleHelp, Gauge, LayoutDashboard, LogOut, Moon, Printer, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { spring } from '../design/motion';
import Logo from './Logo';
import AppFooter from './AppFooter';

const links = [
  { to: '/', label: 'Painel', end: true, icon: LayoutDashboard },
  { to: '/models', label: 'Modelos', icon: Box },
  { to: '/prints', label: 'Impressões', icon: Printer },
  { to: '/sobre', label: 'Sobre', icon: CircleHelp },
];

function initials(name?: string) {
  if (!name) return '3D';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggleTheme, performance, togglePerformance } = useTheme();
  const location = useLocation();

  return (
    <div className="app-frame">
      <aside className="rail glass">
        <div className="rail-logo mb-2">
          <Logo size={36} />
        </div>
        <nav className="rail-nav" aria-label="Principal">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                title={link.label}
                aria-label={link.label}
                className={({ isActive }) => `rail-btn ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
              </NavLink>
            );
          })}
        </nav>
        <div className="rail-spacer" />
        <div className="rail-nav">
          <button type="button" className="rail-btn" onClick={toggleTheme} aria-label="Alternar tema" title="Alternar tema">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            className={`rail-btn ${performance ? 'active' : ''}`}
            onClick={togglePerformance}
            aria-label="Modo desempenho"
            title={performance ? 'Visual completo' : 'Modo desempenho (sem blur)'}
          >
            <Gauge size={18} />
          </button>
          <button type="button" className="rail-btn" onClick={logout} aria-label="Sair" title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <section className="stage glass">
        <div className="stage-bar">
          <div className="user-pill">
            <span className="avatar">{initials(user?.name)}</span>
            <span className="user-name">{user?.name}</span>
          </div>
        </div>
        <motion.div
          className="stage-content"
          key={location.pathname}
          initial={performance ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={performance ? { duration: 0 } : spring}
        >
          <Outlet />
        </motion.div>
        <AppFooter />
      </section>
    </div>
  );
}
