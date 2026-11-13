import { Box, CircleHelp, Layers3, LayoutDashboard, LogOut, Printer, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import AppFooter from './AppFooter';
import WorkspaceWidgets from './WorkspaceWidgets';
import WorkspaceBackground from './WorkspaceBackground';
import { useFeatures } from '../contexts/FeaturesContext';
import type { LucideIcon } from 'lucide-react';
import type { FeatureKey } from '../types';

const links: { to: string; label: string; end?: boolean; icon: LucideIcon; feature?: FeatureKey }[] = [
  { to: '/', label: 'Painel', end: true, icon: LayoutDashboard },
  { to: '/models', label: 'Projetos', icon: Box, feature: 'projects' },
  { to: '/prints', label: 'Peças', icon: Printer, feature: 'prints' },
  { to: '/filamentos', label: 'Filamentos', icon: Layers3, feature: 'filaments' },
  { to: '/configuracoes', label: 'Configurações', icon: SettingsIcon },
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
  const { features } = useFeatures();
  const visibleLinks = links.filter((link) => !link.feature || features?.[link.feature] !== false);
  return (
    <>
    <WorkspaceBackground />
    <div className="ambient-glass" aria-hidden="true">
      <span className="ambient-orb ambient-orb--one" />
      <span className="ambient-orb ambient-orb--two" />
      <span className="ambient-orb ambient-orb--three" />
      <span className="ambient-orb ambient-orb--four" />
    </div>
    <div className="app-frame">
      <aside className="rail glass">
        <div className="rail-logo mb-2">
          <Logo size={36} />
        </div>
        <nav className="rail-nav" aria-label="Principal">
          {visibleLinks.map((link) => {
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
                <span className="rail-label">{link.label}</span>
              </NavLink>
            );
          })}
          {user?.role === 'ADMIN' && (
            <NavLink to="/admin" title="Administração" aria-label="Administração" className={({ isActive }) => `rail-btn ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={18} />
              <span className="rail-label">Administração</span>
            </NavLink>
          )}
        </nav>
        <div className="rail-spacer" />
        <div className="rail-nav">
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
          <WorkspaceWidgets />
        </div>

        <div className="stage-content">
          <Outlet />
        </div>
        <AppFooter />
      </section>
    </div>
    </>
  );
}
