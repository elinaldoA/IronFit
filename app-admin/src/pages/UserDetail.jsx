import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/supabase';
import { useAdminAuth } from '../context/AdminAuthContext';
import { toCsv, downloadCsv } from '../lib/csv';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

const METAS = ['massa', 'forca', 'emagrecer', 'definicao', 'saude', 'resistencia'];
const NIVEIS = ['iniciante', 'intermediario', 'avancado'];
const RESTRICOES = ['padrao', 'vegetariano', 'low_carb'];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

async function callAdminAction(action, targetUserId, extra = {}) {
  const { data, error } = await db.functions.invoke('admin-users', {
    body: { action, targetUserId, ...extra },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

async function callGeneratePlan(kind, targetUserId) {
  const { data, error } = await db.functions.invoke('admin-generate-plan', {
    body: { kind, targetUserId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [detail, setDetail] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [foodLogs, setFoodLogs] = useState([]);
  const [waterLogs, setWaterLogs] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('perfil');
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [recoveryLink, setRecoveryLink] = useState('');
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: userRows, error: userErr }, plan, w, f, wa, we] = await Promise.all([
        db.rpc('admin_get_user', { target: id }),
        db.from('workout_plans')
          .select('id, name, start_date, end_date, duration_weeks, plan_days(id, dia, foco, order_index, plan_exercises(id, nome, series, reps, descanso, tecnica, is_post_workout, order_index))')
          .eq('user_id', id).eq('is_active', true).maybeSingle(),
        db.from('workouts').select('id, workout_date, day_of_week, completed, duration_seconds').eq('user_id', id).order('workout_date', { ascending: false }).limit(20),
        db.from('food_logs').select('id, log_date, food_name, kcal').eq('user_id', id).order('log_date', { ascending: false }).limit(20),
        db.from('water_logs').select('id, log_date, amount_ml').eq('user_id', id).order('log_date', { ascending: false }).limit(20),
        db.from('weight_logs').select('id, log_date, weight').eq('user_id', id).order('log_date', { ascending: false }).limit(20),
      ]);
      if (userErr) throw userErr;
      const row = userRows?.[0];
      if (!row) throw new Error('Usuário não encontrado.');
      setDetail(row);
      const md = row.user_metadata || {};
      setForm({
        nome: md.nome || '', sobrenome: md.sobrenome || '', apelido: md.apelido || '',
        sexo: md.sexo || '', idade: md.idade || '', peso: md.peso || '', altura: md.altura || '',
        meta: md.meta || 'massa', nivel: md.nivel || 'intermediario', pesoAlvo: md.pesoAlvo || '',
        restricaoAlimentar: md.restricaoAlimentar || 'padrao',
      });
      const rawPlan = plan.data;
      setActivePlan(rawPlan ? {
        ...rawPlan,
        plan_days: [...(rawPlan.plan_days || [])]
          .sort((a, b) => a.order_index - b.order_index)
          .map(d => ({ ...d, plan_exercises: [...(d.plan_exercises || [])].sort((a, b) => a.order_index - b.order_index) })),
      } : null);
      setWorkouts(w.data || []);
      setFoodLogs(f.data || []);
      setWaterLogs(wa.data || []);
      setWeightLogs(we.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function runAction(action, extra, confirmMsg) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    setActionMsg('');
    setRecoveryLink('');
    try {
      const result = await callAdminAction(action, id, extra);
      if (action === 'deleteUser') {
        navigate('/users');
        return;
      }
      if (action === 'resetPassword' && result?.actionLink) {
        setRecoveryLink(result.actionLink);
      }
      setActionMsg('Ação concluída.');
      await load();
    } catch (err) {
      setActionMsg(`Erro: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    await runAction('updateProfile', { fields: form });
  }

  // Vai direto em public.profiles (permitido pela policy "admin full access"
  // já existente) em vez de passar pela edge function admin-users — não é
  // uma ação da GoTrue Admin API, só um update de coluna comum.
  async function handleToggleAdmin() {
    const makeAdmin = !detail.is_admin;
    if (!window.confirm(makeAdmin ? 'Tornar este usuário admin?' : 'Remover acesso de admin deste usuário?')) return;
    setBusy(true);
    setActionMsg('');
    try {
      const { error } = await db.from('profiles').update({ is_admin: makeAdmin }).eq('id', id);
      if (error) throw error;
      await db.from('admin_audit_log').insert({
        admin_id: adminUser.id, target_user_id: id,
        action: makeAdmin ? 'promoteAdmin' : 'demoteAdmin', details: null,
      });
      setActionMsg('Ação concluída.');
      await load();
    } catch (err) {
      setActionMsg(`Erro: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleGeneratePlan(kind, confirmMsg) {
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    setActionMsg('');
    try {
      await callGeneratePlan(kind, id);
      setActionMsg('Ação concluída.');
      await load();
    } catch (err) {
      setActionMsg(`Erro: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  function exportTreinos() {
    downloadCsv(`treinos_${id}.csv`, toCsv(workouts, [
      { key: 'workout_date', label: 'Data' }, { key: 'day_of_week', label: 'Dia' },
      { key: 'completed', label: 'Concluido' }, { key: 'duration_seconds', label: 'DuracaoSegundos' },
    ]));
  }

  function exportDieta() {
    downloadCsv(`refeicoes_${id}.csv`, toCsv(foodLogs, [
      { key: 'log_date', label: 'Data' }, { key: 'food_name', label: 'Alimento' }, { key: 'kcal', label: 'Kcal' },
    ]));
  }

  if (loading) return <Loading />;
  if (error) return <p className="form-msg form-msg--error">{error}</p>;

  const isBanned = detail.banned_until && new Date(detail.banned_until) > new Date();
  const md = detail.user_metadata || {};
  const hasProfile = Number(md.peso) > 0 && Number(md.altura) > 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{detail.email}</h1>
          <p className="user-detail__meta">
            Criado em {formatDate(detail.created_at)} · Último login {formatDate(detail.last_sign_in_at)}
            {detail.is_admin && <span className="badge badge--admin">admin</span>}
            {isBanned && <span className="badge badge--danger">banido</span>}
          </p>
        </div>
      </div>

      <div className="tabs">
        {['perfil', 'treinos', 'dieta', 'acoes'].map(t => (
          <button
            key={t}
            className={`tabs__btn ${tab === t ? 'tabs__btn--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'perfil' ? 'Perfil' : t === 'treinos' ? 'Treinos' : t === 'dieta' ? 'Dieta' : 'Ações'}
          </button>
        ))}
      </div>

      {actionMsg && <p className={`form-msg ${actionMsg.startsWith('Erro') ? 'form-msg--error' : 'form-msg--ok'}`}>{actionMsg}</p>}

      {tab === 'perfil' && (
        <form className="card form-grid" onSubmit={handleSaveProfile}>
          <label className="field">
            <span className="field__label">Nome</span>
            <input className="input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Sobrenome</span>
            <input className="input" value={form.sobrenome} onChange={e => setForm({ ...form, sobrenome: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Apelido</span>
            <input className="input" value={form.apelido} onChange={e => setForm({ ...form, apelido: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Sexo</span>
            <select className="input" value={form.sexo} onChange={e => setForm({ ...form, sexo: e.target.value })}>
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Idade</span>
            <input className="input" type="number" value={form.idade} onChange={e => setForm({ ...form, idade: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Peso (kg)</span>
            <input className="input" type="number" step="0.1" value={form.peso} onChange={e => setForm({ ...form, peso: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Altura (cm)</span>
            <input className="input" type="number" value={form.altura} onChange={e => setForm({ ...form, altura: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Peso alvo (kg)</span>
            <input className="input" type="number" step="0.1" value={form.pesoAlvo} onChange={e => setForm({ ...form, pesoAlvo: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Objetivo</span>
            <select className="input" value={form.meta} onChange={e => setForm({ ...form, meta: e.target.value })}>
              {METAS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Nível</span>
            <select className="input" value={form.nivel} onChange={e => setForm({ ...form, nivel: e.target.value })}>
              {NIVEIS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Restrição alimentar</span>
            <select className="input" value={form.restricaoAlimentar} onChange={e => setForm({ ...form, restricaoAlimentar: e.target.value })}>
              {RESTRICOES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <div className="form-grid__actions">
            <button className="btn btn--primary" type="submit" disabled={busy}>Salvar perfil</button>
          </div>
        </form>
      )}

      {tab === 'treinos' && (
        <div className="stack">
          <section>
            <h2 className="section-title">
              Plano de treino ativo {activePlan ? `— ${activePlan.name}` : ''}
            </h2>
            {!activePlan && <EmptyState icon="🏋️" label="Sem plano de treino ativo." />}
            {activePlan && (
              <div className="stack">
                {activePlan.start_date && (
                  <p className="user-detail__meta">
                    Vigência {activePlan.start_date} a {activePlan.end_date}
                    {activePlan.duration_weeks ? ` (${activePlan.duration_weeks} semanas)` : ''}
                  </p>
                )}
                {activePlan.plan_days.map(day => (
                  <table className="resp-table" key={day.id}>
                    <thead><tr><th colSpan={4}>{day.dia} — {day.foco}</th></tr></thead>
                    <thead><tr><th>Exercício</th><th>Séries</th><th>Reps</th><th>Descanso</th></tr></thead>
                    <tbody>
                      {day.plan_exercises.map(ex => (
                        <tr key={ex.id}>
                          <td data-label="Exercício">{ex.is_post_workout ? '🔷 ' : ''}{ex.nome}</td>
                          <td data-label="Séries">{ex.series}</td>
                          <td data-label="Reps">{ex.reps}</td>
                          <td data-label="Descanso">{ex.descanso}</td>
                        </tr>
                      ))}
                      {day.plan_exercises.length === 0 && <tr><td colSpan={4}><EmptyState icon="💤" label="Dia de descanso." /></td></tr>}
                    </tbody>
                  </table>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="page-header">
              <h2 className="section-title">Histórico de treinos (últimos 20)</h2>
              <button className="btn btn--small" onClick={exportTreinos} disabled={workouts.length === 0}>Exportar CSV</button>
            </div>
            <table className="resp-table">
              <thead><tr><th>Data</th><th>Dia</th><th>Concluído</th><th>Duração</th></tr></thead>
              <tbody>
                {workouts.map(w => (
                  <tr key={w.id}>
                    <td data-label="Data">{w.workout_date}</td>
                    <td data-label="Dia">{w.day_of_week}</td>
                    <td data-label="Concluído">{w.completed ? 'sim' : 'não'}</td>
                    <td data-label="Duração">{w.duration_seconds ? `${Math.round(w.duration_seconds / 60)} min` : '—'}</td>
                  </tr>
                ))}
                {workouts.length === 0 && <tr><td colSpan={4}><EmptyState icon="🏋️" label="Sem treinos registrados." /></td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {tab === 'dieta' && (
        <div className="stack">
          <div className="page-header">
            <button className="btn btn--small" onClick={exportDieta} disabled={foodLogs.length === 0}>Exportar CSV (refeições)</button>
          </div>
          <section>
            <h2 className="section-title">
              Cardápio atual ({md.customMeals?.length ? 'personalizado' : 'padrão do objetivo'})
            </h2>
            <table className="resp-table">
              <thead><tr><th>Horário</th><th>Refeição</th><th>Descrição</th><th>Kcal</th></tr></thead>
              <tbody>
                {(md.customMeals || []).map((m, i) => (
                  <tr key={i}>
                    <td data-label="Horário">{m.horario}</td>
                    <td data-label="Refeição">{m.nome}</td>
                    <td data-label="Descrição">{m.descricao}</td>
                    <td data-label="Kcal">{m.kcal}</td>
                  </tr>
                ))}
                {!md.customMeals?.length && (
                  <tr><td colSpan={4}><EmptyState icon="🍽️" label="Sem cardápio personalizado salvo — o usuário usa o template padrão do objetivo." /></td></tr>
                )}
              </tbody>
            </table>
          </section>
          <section>
            <h2 className="section-title">Refeições (últimas 20)</h2>
            <table className="resp-table">
              <thead><tr><th>Data</th><th>Alimento</th><th>Kcal</th></tr></thead>
              <tbody>
                {foodLogs.map(f => (
                  <tr key={f.id}><td data-label="Data">{f.log_date}</td><td data-label="Alimento">{f.food_name}</td><td data-label="Kcal">{f.kcal}</td></tr>
                ))}
                {foodLogs.length === 0 && <tr><td colSpan={3}><EmptyState icon="🍽️" label="Sem registros." /></td></tr>}
              </tbody>
            </table>
          </section>
          <section>
            <h2 className="section-title">Água</h2>
            <table className="resp-table">
              <thead><tr><th>Data</th><th>ml</th></tr></thead>
              <tbody>
                {waterLogs.map(w => (
                  <tr key={w.id}><td data-label="Data">{w.log_date}</td><td data-label="ml">{w.amount_ml}</td></tr>
                ))}
                {waterLogs.length === 0 && <tr><td colSpan={2}><EmptyState icon="💧" label="Sem registros." /></td></tr>}
              </tbody>
            </table>
          </section>
          <section>
            <h2 className="section-title">Peso</h2>
            <table className="resp-table">
              <thead><tr><th>Data</th><th>Peso (kg)</th></tr></thead>
              <tbody>
                {weightLogs.map(w => (
                  <tr key={w.id}><td data-label="Data">{w.log_date}</td><td data-label="Peso (kg)">{w.weight}</td></tr>
                ))}
                {weightLogs.length === 0 && <tr><td colSpan={2}><EmptyState icon="⚖️" label="Sem registros." /></td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {tab === 'acoes' && (
        <div className="card stack">
          {recoveryLink && (
            <div className="field">
              <span className="field__label">Link de redefinição de senha (copie e envie ao usuário)</span>
              <input className="input" readOnly value={recoveryLink} onFocus={e => e.target.select()} />
            </div>
          )}

          <div className="actions-row">
            {isBanned ? (
              <button className="btn" disabled={busy} onClick={() => runAction('unban')}>Desbanir usuário</button>
            ) : (
              <button className="btn btn--danger" disabled={busy} onClick={() => runAction('ban', {}, 'Banir este usuário?')}>Banir usuário</button>
            )}
            <button className="btn" disabled={busy} onClick={() => runAction('resetPassword')}>Gerar link de redefinição de senha</button>
            {!detail.email_confirmed_at && (
              <button className="btn" disabled={busy} onClick={() => runAction('confirmUser', {}, 'Confirmar o e-mail deste usuário manualmente?')}>Confirmar e-mail</button>
            )}
            {detail.id !== adminUser?.id && (
              <button className="btn" disabled={busy} onClick={handleToggleAdmin}>
                {detail.is_admin ? 'Remover admin' : 'Tornar admin'}
              </button>
            )}
            <button className="btn btn--danger" disabled={busy} onClick={() => runAction('deleteUser', {}, 'Excluir esta conta e todos os dados permanentemente?')}>
              Excluir conta
            </button>
          </div>

          <div>
            <h2 className="section-title">Gerar plano (suporte)</h2>
            {!hasProfile && <p className="form-msg">Este usuário ainda não completou peso/altura no perfil — não é possível gerar plano.</p>}
            <div className="actions-row">
              <button
                className="btn" disabled={busy || !hasProfile}
                onClick={() => handleGeneratePlan('workout', 'Isso cria um novo treino a partir do perfil atual do usuário e o ativa. O plano anterior continua salvo, só fica inativo. Continuar?')}
              >
                Gerar novo treino
              </button>
              <button
                className="btn" disabled={busy || !hasProfile}
                onClick={() => handleGeneratePlan('meal', 'Isso substitui o cardápio atual do usuário por um novo, baseado no objetivo salvo no perfil. Continuar?')}
              >
                Gerar novo cardápio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
