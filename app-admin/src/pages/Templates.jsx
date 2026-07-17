import { useEffect, useState } from 'react';
import { db } from '../lib/supabase';
import WorkoutTemplateEditor from '../components/WorkoutTemplateEditor';
import MealTemplateEditor from '../components/MealTemplateEditor';
import Loading from '../components/Loading';

const METAS = ['massa', 'forca', 'emagrecer', 'definicao', 'saude', 'resistencia'];
const RESTRICOES = ['padrao', 'vegetariano', 'low_carb'];
const KINDS = [
  { key: 'workout', table: 'workout_templates', column: 'days', label: 'Treino' },
  { key: 'meal', table: 'meal_templates', column: 'meals', label: 'Dieta' },
];

export default function Templates() {
  const [kind, setKind] = useState('workout');
  const [meta, setMeta] = useState('massa');
  const [restricao, setRestricao] = useState('padrao');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const current = KINDS.find(k => k.key === kind);
  // meal_templates tem chave composta (meta, restricao); workout_templates
  // continua só por meta — nível/IMC seguem ajustados em tempo real no app,
  // não têm linha própria no banco.
  const isMeal = kind === 'meal';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setMsg('');
    let query = db.from(current.table).select(current.column).eq('meta', meta);
    if (isMeal) query = query.eq('restricao', restricao);
    query.single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        setData(data?.[current.column] ?? []);
      })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, meta, restricao, isMeal, current.table, current.column]);

  async function handleSave() {
    setSaving(true);
    setMsg('');
    try {
      let query = db.from(current.table)
        .update({ [current.column]: data, updated_at: new Date().toISOString() })
        .eq('meta', meta);
      if (isMeal) query = query.eq('restricao', restricao);
      const { error } = await query;
      if (error) throw error;
      setMsg('Salvo!');
    } catch (err) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Conteúdo</h1>
      </div>

      <div className="actions-row" style={{ marginBottom: 16 }}>
        {KINDS.map(k => (
          <button
            key={k.key}
            className={`btn ${kind === k.key ? 'btn--primary' : ''}`}
            onClick={() => setKind(k.key)}
          >
            {k.label}
          </button>
        ))}
        <select className="input" style={{ maxWidth: 180 }} value={meta} onChange={e => setMeta(e.target.value)}>
          {METAS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {isMeal && (
          <select className="input" style={{ maxWidth: 180 }} value={restricao} onChange={e => setRestricao(e.target.value)}>
            {RESTRICOES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
      </div>

      {loading && <Loading label="Carregando template…" />}
      {error && <p className="form-msg form-msg--error">{error}</p>}

      {!loading && !error && data && (
        <div className="stack">
          {kind === 'workout'
            ? <WorkoutTemplateEditor days={data} onChange={setData} />
            : <MealTemplateEditor meals={data} onChange={setData} />}

          {msg && <p className={`form-msg ${msg.startsWith('Erro') ? 'form-msg--error' : 'form-msg--ok'}`}>{msg}</p>}

          <div>
            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>

          <details>
            <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>Ver JSON</summary>
            <pre className="template-json-preview">{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
