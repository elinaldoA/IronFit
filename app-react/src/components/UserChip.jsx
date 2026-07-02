import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { useToast } from '../context/ToastContext';
import { useReminders } from '../hooks/useReminders';
import { isNotificationSupported } from '../lib/notifications';
import { getDisplayName } from '../lib/utils';

const SYNC_TITLE = { ok: 'Sincronizado', loading: 'Sincronizando…', error: 'Erro de sync' };

export default function UserChip() {
  const { user } = useAuth();
  const { syncStatus } = useWorkout();
  const toast = useToast();
  const [remindersEnabled, toggleReminders] = useReminders(toast);
  if (!user) return null;

  return (
    <div className="user-chip">
      <span className={`sync-dot sync-dot--${syncStatus}`} title={SYNC_TITLE[syncStatus] || ''} />
      <span className="user-chip__email">{getDisplayName(user)}</span>
      <button
        className="btn btn--ghost btn--sm"
        title={remindersEnabled ? 'Desativar lembretes' : 'Ativar lembretes'}
        disabled={!isNotificationSupported()}
        onClick={toggleReminders}
      >{remindersEnabled ? '🔔' : '🔕'}</button>
    </div>
  );
}
