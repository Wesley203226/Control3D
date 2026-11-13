import { lazy, Suspense } from 'react';
import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import { useFeatures } from './contexts/FeaturesContext';
import type { FeatureKey } from './types';

const Admin = lazy(() => import('./pages/Admin'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const ModelDetails = lazy(() => import('./pages/ModelDetails'));
const Models = lazy(() => import('./pages/Models'));
const PrintDetails = lazy(() => import('./pages/PrintDetails'));
const Prints = lazy(() => import('./pages/Prints'));
const Register = lazy(() => import('./pages/Register'));
const About = lazy(() => import('./pages/About'));
const Settings = lazy(() => import('./pages/Settings'));
const Filaments = lazy(() => import('./pages/Filaments'));

function PrivateRoute() {
  const { token, loading } = useAuth();
  const { loading: featuresLoading, error: featuresError, refresh } = useFeatures();
  if (loading) return <p className="muted p-10 text-center">Carregando...</p>;
  if (!token) return <Navigate to="/login" replace />;
  if (featuresLoading) return <p className="muted p-10 text-center">Carregando configurações...</p>;
  if (featuresError) {
    return (
      <div className="card m-6 text-center">
        <p className="form-error">Não foi possível carregar o estado dos recursos. Verifique a conexão com a API.</p>
        <button type="button" className="btn-ghost mt-3" onClick={() => void refresh().catch(() => undefined)}>
          Tentar novamente
        </button>
      </div>
    );
  }
  return <Layout />;
}

function FeatureRoute({ feature, children }: { feature: FeatureKey; children: JSX.Element }) {
  const { features } = useFeatures();
  const { user } = useAuth();
  if (!features?.[feature]) {
    return (
      <section className="card mx-auto mt-8 max-w-2xl text-center">
        <h1 className="page-title">Recurso em manutenção</h1>
        <p className="muted mt-2">Esta área está temporariamente indisponível. Tente novamente mais tarde.</p>
        {user?.role === 'ADMIN' && <p className="mt-4"><Link className="text-link" to="/admin">Abrir painel administrativo</Link></p>}
      </section>
    );
  }
  return children;
}

function AdminRoute() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <Admin /> : <Navigate to="/" replace />;
}

function PublicRoute() {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <Suspense fallback={<div className="route-loading" aria-live="polite">Carregando…</div>}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route path="/sobre" element={<About />} />
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/models" element={<FeatureRoute feature="projects"><Models /></FeatureRoute>} />
          <Route path="/models/:id" element={<FeatureRoute feature="projects"><ModelDetails /></FeatureRoute>} />
          <Route path="/prints" element={<FeatureRoute feature="prints"><Prints /></FeatureRoute>} />
          <Route path="/prints/:id" element={<FeatureRoute feature="prints"><PrintDetails /></FeatureRoute>} />
          <Route path="/filamentos" element={<FeatureRoute feature="filaments"><Filaments /></FeatureRoute>} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/admin" element={<AdminRoute />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
