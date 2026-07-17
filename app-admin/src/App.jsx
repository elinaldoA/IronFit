import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersList from './pages/UsersList';
import UserDetail from './pages/UserDetail';
import Broadcast from './pages/Broadcast';
import Templates from './pages/Templates';
import AuditLog from './pages/AuditLog';
import Profile from './pages/Profile';
import LandingEditor from './pages/LandingEditor';

export default function App() {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="/users" element={<UsersList />} />
                <Route path="/users/:id" element={<UserDetail />} />
                <Route path="/notificacoes" element={<Broadcast />} />
                <Route path="/conteudo" element={<Templates />} />
                <Route path="/auditoria" element={<AuditLog />} />
                <Route path="/landing" element={<LandingEditor />} />
                <Route path="/perfil" element={<Profile />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
