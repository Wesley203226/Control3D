import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ModelDetails from './pages/ModelDetails';
import Models from './pages/Models';
import PrintDetails from './pages/PrintDetails';
import Prints from './pages/Prints';
import Register from './pages/Register';

function PrivateRoute() {
  const { token, loading } = useAuth();
  if (loading) return <p className="p-10 text-center text-slate-500">Carregando...</p>;
  return token ? <Layout /> : <Navigate to="/login" replace />;
}

function PublicRoute() {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/models" element={<Models />} />
        <Route path="/models/:id" element={<ModelDetails />} />
        <Route path="/prints" element={<Prints />} />
        <Route path="/prints/:id" element={<PrintDetails />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
