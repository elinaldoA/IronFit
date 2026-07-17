import { useEffect, useState } from 'react';
import { db } from '../lib/supabase';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

const ACTION_LABEL = {
  ban: 'Baniu',
  unban: 'Desbaniu',
  resetPassword: 'Gerou link de senha',
  updateProfile: 'Editou perfil',
  deleteUser: 'Excluiu conta',
  broadcastPush: 'Notificação em massa',
  promoteAdmin: 'Promoveu a admin',
  demoteAdmin: 'Removeu admin',
  generateWorkout: 'Gerou novo treino',
  generateMeal: 'Gerou novo cardápio',
};

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    db.rpc('admin_list_audit_log')
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        setRows(data || []);
      })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Auditoria</h1>
      </div>

      {loading && <Loading />}
      {error && <p className="form-msg form-msg--error">{error}</p>}

      {!loading && !error && (
        <table className="resp-table">
          <thead>
            <tr><th>Quando</th><th>Admin</th><th>Ação</th><th>Alvo</th><th>Detalhes</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td data-label="Quando">{formatDate(r.created_at)}</td>
                <td data-label="Admin">{r.admin_email || '—'}</td>
                <td data-label="Ação">{ACTION_LABEL[r.action] || r.action}</td>
                <td data-label="Alvo">{r.target_email || '—'}</td>
                <td data-label="Detalhes">
                  {r.details ? (
                    <details>
                      <summary style={{ cursor: 'pointer' }}>ver</summary>
                      <pre className="template-json-preview">{JSON.stringify(r.details, null, 2)}</pre>
                    </details>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5}><EmptyState icon="🕒" label="Nenhuma ação registrada ainda." /></td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
