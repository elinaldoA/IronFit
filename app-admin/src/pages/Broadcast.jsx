import { useEffect, useState } from 'react';
import { db } from '../lib/supabase';
import { fetchUsers } from './UsersList';

export default function Broadcast() {
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scope, setScope] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { fetchUsers().then(setUsers).catch(() => {}); }, []);

  function toggleUser(id) {
    setSelectedIds(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (scope === 'specific' && selectedIds.length === 0) {
      setMsg('Erro: selecione ao menos um usuário.');
      return;
    }
    if (!window.confirm(scope === 'all'
      ? `Enviar notificação para TODOS os usuários?`
      : `Enviar notificação para ${selectedIds.length} usuário(s) selecionado(s)?`)) return;

    setBusy(true);
    setMsg('');
    try {
      const { data, error } = await db.functions.invoke('admin-broadcast', {
        body: { title, body, targetUserIds: scope === 'specific' ? selectedIds : undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMsg(`Enviado: ${data.sent} de ${data.targetCount} dispositivo(s).`);
      setTitle('');
      setBody('');
      setSelectedIds([]);
    } catch (err) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Notificações</h1>
      </div>

      <form className="card stack" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Título</span>
          <input className="input" required value={title} onChange={e => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Mensagem</span>
          <input className="input" required value={body} onChange={e => setBody(e.target.value)} />
        </label>

        <div className="field">
          <span className="field__label">Destinatários</span>
          <div className="actions-row">
            <label><input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} /> Todos os usuários</label>
            <label><input type="radio" checked={scope === 'specific'} onChange={() => setScope('specific')} /> Selecionar usuários</label>
          </div>
        </div>

        {scope === 'specific' && (
          <div className="card" style={{ maxHeight: 220, overflowY: 'auto' }}>
            {users.map(u => (
              <label key={u.id} style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
                <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleUser(u.id)} />
                {u.email}
              </label>
            ))}
          </div>
        )}

        {msg && <p className={`form-msg ${msg.startsWith('Erro') ? 'form-msg--error' : 'form-msg--ok'}`}>{msg}</p>}

        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? 'Enviando…' : 'Enviar notificação'}
        </button>
      </form>
    </div>
  );
}
