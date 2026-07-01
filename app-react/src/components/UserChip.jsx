import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';

const SYNC_TITLE = { ok: 'Sincronizado', loading: 'Sincronizando…', error: 'Erro de sync' };

export default function UserChip() {
  const { user, logout } = useAuth();
  const { syncStatus, syncNow } = useWorkout();
  if (!user) return null;

  return (
    <div className="user-chip">
      <span className={`sync-dot sync-dot--${syncStatus}`} title={SYNC_TITLE[syncStatus] || ''} />
      <span className="user-chip__email">{user.email}</span>
      <button className="btn btn--ghost btn--sm" title="Sincronizar" onClick={syncNow}>↻</button>
      <button className="btn btn--ghost btn--sm" onClick={logout}>Sair</button>
    </div>
  );
}
