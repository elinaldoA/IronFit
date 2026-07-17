import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/supabase';
import { toCsv, downloadCsv } from '../lib/csv';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

export async function fetchUsers() {
  const { data, error } = await db.rpc('admin_list_users');
  if (error) throw error;
  return data || [];
}

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    fetchUsers()
      .then(data => { if (active) setUsers(data); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u => u.email?.toLowerCase().includes(term));
  }, [users, search]);

  function handleExport() {
    downloadCsv('usuarios.csv', toCsv(filtered, [
      { key: 'email', label: 'Email' }, { key: 'created_at', label: 'CriadoEm' },
      { key: 'last_sign_in_at', label: 'UltimoLogin' }, { key: 'email_confirmed_at', label: 'Confirmado' },
      { key: 'banned_until', label: 'BanidoAte' }, { key: 'is_admin', label: 'Admin' },
    ]));
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Usuários</h1>
        <div className="actions-row">
          <input
            className="input search-input"
            placeholder="Buscar por e-mail…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn btn--small" onClick={handleExport} disabled={filtered.length === 0}>Exportar CSV</button>
        </div>
      </div>

      {loading && <Loading />}
      {error && <p className="form-msg form-msg--error">{error}</p>}

      {!loading && !error && (
        <table className="resp-table">
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Criado em</th>
              <th>Último login</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td data-label="E-mail">{u.email}</td>
                <td data-label="Criado em">{formatDate(u.created_at)}</td>
                <td data-label="Último login">{formatDate(u.last_sign_in_at)}</td>
                <td data-label="Status">
                  {u.is_admin && <span className="badge badge--admin">admin</span>}
                  {u.banned_until && new Date(u.banned_until) > new Date() && <span className="badge badge--danger">banido</span>}
                  {!u.email_confirmed_at && <span className="badge badge--warning">não confirmado</span>}
                  {!u.is_admin && !u.banned_until && u.email_confirmed_at && <span className="badge badge--ok">ativo</span>}
                </td>
                <td data-label="">
                  <Link className="btn btn--ghost btn--small" to={`/users/${u.id}`}>Ver</Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5}><EmptyState icon="👥" label="Nenhum usuário encontrado." /></td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
