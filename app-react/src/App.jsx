import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { WorkoutProvider } from './context/WorkoutContext';
import AuthScreen from './components/AuthScreen';
import ThemeToggle from './components/ThemeToggle';
import UserChip from './components/UserChip';
import BottomNav from './components/BottomNav';
import TreinoPage from './pages/TreinoPage';
import DietaPage from './pages/DietaPage';
import DashPage from './pages/DashPage';
import PerfilPage from './pages/PerfilPage';
import UpdatePrompt from './components/UpdatePrompt';

function Shell() {
  const { user, authLoading } = useAuth();
  const [page, setPage] = useState('treino');

  if (authLoading) return null;

  return (
    <div className="shell">
      <UpdatePrompt />
      {!user && <AuthScreen />}

      {user && (
        <WorkoutProvider>
          <div className="app-screen" style={{ display: 'flex' }}>
            <header className="topbar">
              <span className="topbar__brand">⚡ IRONFIT</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ThemeToggle />
                <div className="topbar__auth"><UserChip /></div>
              </div>
            </header>

            <main className="pages">
              {page === 'treino' && <TreinoPage />}
              {page === 'dieta' && <DietaPage />}
              {page === 'dash' && <DashPage active={page === 'dash'} />}
              {page === 'perfil' && <PerfilPage active={page === 'perfil'} />}
            </main>

            <BottomNav active={page} onChange={setPage} />
          </div>
        </WorkoutProvider>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
