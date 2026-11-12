import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const ModelDetails = lazy(() => import('./pages/ModelDetails'));
const Models = lazy(() => import('./pages/Models'));
const PrintDetails = lazy(() => import('./pages/PrintDetails'));
const Prints = lazy(() => import('./pages/Prints'));
const Register = lazy(() => import('./pages/Register'));
const About = lazy(() => import('./pages/About'));

function PrivateRoute() {
  const { token, loading } = useAuth();
  if (loading) return <p className="muted p-10 text-center">Carregando...</p>;
  return token ? <Layout /> : <Navigate to="/login" replace />;
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
          <Route path="/models" element={<Models />} />
          <Route path="/models/:id" element={<ModelDetails />} />
          <Route path="/prints" element={<Prints />} />
          <Route path="/prints/:id" element={<PrintDetails />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
