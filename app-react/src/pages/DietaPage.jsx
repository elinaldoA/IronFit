import { useEffect, useMemo, useState } from 'react';
import { getDietaData, getMacroGoals, TODAY_DATE, WATER_STORAGE_KEY } from '../data/treinoData';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { fetchMealLogs, upsertMealLog, fetchWaterLog, upsertWaterLog } from '../lib/dietaLog';

function mealKey(meal) {
  return `dieta_${TODAY_DATE}_${meal.nome}`;
}

function getWaterMl() {
  return parseInt(localStorage.getItem(WATER_STORAGE_KEY), 10) || 0;
}

function fmtLiters(ml) {
  return (ml / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function MealCard({ meal, bump, user }) {
  const toast = useToast();
  const done = localStorage.getItem(mealKey(meal)) === 'true';

  async function toggle() {
    const next = !done;
    localStorage.setItem(mealKey(meal), next);
    bump();
    toast(next ? '✅ Refeição marcada!' : 'Refeição desmarcada');
    if (user) {
      try {
        await upsertMealLog(user.id, TODAY_DATE, meal.nome, next);
      } catch (err) {
        console.error('upsertMealLog:', err);
      }
    }
  }

  return (
    <div className="meal-card">
      <button
        type="button"
        className={`meal-card__check${done ? ' meal-card__check--done' : ''}`}
        aria-pressed={done}
        onClick={toggle}
      >{done ? '✅' : '⬜'}</button>
      <div className="meal-card__time">{meal.horario}</div>
      <div className="meal-card__body">
        <div className="meal-card__name">{meal.nome}</div>
        <div className="meal-card__desc" dangerouslySetInnerHTML={{ __html: meal.descricao }} />
      </div>
    </div>
  );
}

function MealEditRow({ meal, onChange, onRemove }) {
  return (
    <div className="meal-edit-row">
      <div className="meal-edit-row__fields">
        <input
          type="time" className="input input--sm" value={meal.horario}
          onChange={e => onChange({ ...meal, horario: e.target.value })}
        />
        <input
          type="text" className="input input--sm" placeholder="Nome da refeição" value={meal.nome}
          onChange={e => onChange({ ...meal, nome: e.target.value })}
        />
      </div>
      <textarea
        className="input input--sm" placeholder="Descrição" rows={2} value={meal.descricao}
        onChange={e => onChange({ ...meal, descricao: e.target.value })}
      />
      <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove}>Remover</button>
    </div>
  );
}

function WaterTracker({ water, goalMl, onAdd, onReset }) {
  const pct = Math.min(100, (water / goalMl) * 100);

  return (
    <div className="progress-card">
      <div className="progress-card__row">
        <span className="progress-card__label">💧 Hidratação</span>
        <span className="progress-card__count">{fmtLiters(water)}L / {fmtLiters(goalMl)}L</span>
      </div>
      <div className="progress-card__bar">
        <div className="progress-card__fill progress-card__fill--water" style={{ width: `${pct}%` }} />
      </div>
      <div className="water-actions">
        <button type="button" className="btn btn--outline btn--sm" onClick={() => onAdd(200)}>+200ml</button>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => onAdd(500)}>+500ml</button>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => onAdd(-200)}>-200ml</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>Zerar</button>
      </div>
    </div>
  );
}

export default function DietaPage() {
  const { user, updateProfile } = useAuth();
  const [tick, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);
  const toast = useToast();
  const macros = useMemo(() => getMacroGoals(user), [user]);
  const waterGoalMl = macros.macroAgua * 1000;

  const [meals, setMeals] = useState(() => getDietaData(user));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(meals);

  useEffect(() => {
    if (!user) return;

    async function loadDietaLogs() {
      try {
        const [mealLogs, waterMl] = await Promise.all([
          fetchMealLogs(user.id, TODAY_DATE),
          fetchWaterLog(user.id, TODAY_DATE),
        ]);
        mealLogs.forEach(m => localStorage.setItem(`dieta_${TODAY_DATE}_${m.meal_name}`, m.completed));
        if (waterMl !== null) localStorage.setItem(WATER_STORAGE_KEY, waterMl);
        bump();
      } catch (err) {
        console.error('loadDietaLogs:', err);
      }
    }
    loadDietaLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const done = meals.filter(m => localStorage.getItem(mealKey(m)) === 'true').length;
  const total = meals.length;
  const water = getWaterMl();
  const remainingRatio = total > 0 ? Math.max(0, (total - done) / total) : 1;
  const remainingMacros = {
    kcal: Math.round(macros.macroKcal * remainingRatio),
    proteina: Math.round(macros.macroProteina * remainingRatio),
    carboidrato: Math.round(macros.macroCarboidrato * remainingRatio),
    gordura: Math.round(macros.macroGordura * remainingRatio),
  };

  async function handleReset() {
    if (!window.confirm('Limpar os checks de refeição de hoje?')) return;
    meals.forEach(m => localStorage.removeItem(mealKey(m)));
    bump();
    if (user) {
      try {
        await Promise.all(meals.map(m => upsertMealLog(user.id, TODAY_DATE, m.nome, false)));
      } catch (err) {
        console.error('resetMealLogs:', err);
      }
    }
  }

  function handleAddWater(deltaMl) {
    const next = Math.max(0, water + deltaMl);
    localStorage.setItem(WATER_STORAGE_KEY, next);
    bump();
    if (deltaMl > 0 && next >= waterGoalMl && water < waterGoalMl) {
      toast('🎉 Meta de hidratação do dia atingida!');
    }
    if (user) upsertWaterLog(user.id, TODAY_DATE, next).catch(err => console.error('upsertWaterLog:', err));
  }

  function handleResetWater() {
    if (!window.confirm('Zerar a água registrada hoje?')) return;
    localStorage.removeItem(WATER_STORAGE_KEY);
    bump();
    if (user) upsertWaterLog(user.id, TODAY_DATE, 0).catch(err => console.error('resetWaterLog:', err));
  }

  function startEditing() {
    setDraft(meals);
    setEditing(true);
  }

  function updateDraftMeal(index, next) {
    setDraft(d => d.map((m, i) => i === index ? next : m));
  }

  function removeDraftMeal(index) {
    setDraft(d => d.filter((_, i) => i !== index));
  }

  function addDraftMeal() {
    setDraft(d => [...d, { horario: '12:00', nome: 'Nova refeição', descricao: '' }]);
  }

  async function handleSaveMeals() {
    const cleaned = draft
      .filter(m => m.nome.trim() && m.horario.trim())
      .sort((a, b) => a.horario.localeCompare(b.horario));
    setMeals(cleaned);
    setEditing(false);
    await updateProfile({ customMeals: cleaned });
    toast('🍽️ Refeições atualizadas!');
  }

  async function handleRestoreDefault() {
    if (!window.confirm('Restaurar as refeições padrão? Suas edições serão perdidas.')) return;
    const defaults = getDietaData(null);
    setMeals(defaults);
    setDraft(defaults);
    setEditing(false);
    await updateProfile({ customMeals: null });
    toast('Refeições padrão restauradas');
  }

  return (
    <section id="page-dieta" className="page active">
      <div className="progress-card">
        <div className="progress-card__row">
          <span className="progress-card__label">Hoje</span>
          <span className="progress-card__count">{done}/{total} refeições</span>
        </div>
        <div className="progress-card__bar">
          <div className="progress-card__fill" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>
      <div className="toolbar">
        <p className="toolbar__hint">Marque as refeições feitas</p>
        <div className="toolbar__actions">
          <button
            type="button" className="btn btn--ghost btn--sm" title={editing ? 'Cancelar edição' : 'Editar refeições'}
            onClick={editing ? () => setEditing(false) : startEditing}
          >{editing ? '✖️' : '✏️'}</button>
          <button type="button" className="btn btn--ghost btn--sm" title="Limpar checks de hoje" onClick={handleReset}>🧹</button>
        </div>
      </div>
      <WaterTracker water={water} goalMl={waterGoalMl} onAdd={handleAddWater} onReset={handleResetWater} />
      <div id="macrosGrid" className="macros">
        <div className="macro-card">
          <span className="macro-card__value">{remainingMacros.kcal}</span>
          <span className="macro-card__label">Kcal restantes</span>
        </div>
        <div className="macro-card">
          <span className="macro-card__value">{remainingMacros.proteina}g</span>
          <span className="macro-card__label">Proteína restante</span>
        </div>
        <div className="macro-card">
          <span className="macro-card__value">{remainingMacros.carboidrato}g</span>
          <span className="macro-card__label">Carbo restante</span>
        </div>
        <div className="macro-card">
          <span className="macro-card__value">{remainingMacros.gordura}g</span>
          <span className="macro-card__label">Gordura restante</span>
        </div>
      </div>
      {editing ? (
        <div className="meal-edit-list">
          {draft.map((meal, i) => (
            <MealEditRow
              key={i}
              meal={meal}
              onChange={next => updateDraftMeal(i, next)}
              onRemove={() => removeDraftMeal(i)}
            />
          ))}
          <button type="button" className="btn btn--outline btn--full" onClick={addDraftMeal}>+ Adicionar refeição</button>
          <button type="button" className="btn btn--primary btn--full" onClick={handleSaveMeals}>Salvar refeições</button>
          <button type="button" className="btn btn--ghost btn--full" onClick={handleRestoreDefault}>Restaurar padrão</button>
        </div>
      ) : (
        <div id="dietaContainer" className="meals">
          {meals.map(meal => (
            <MealCard key={meal.nome} meal={meal} bump={bump} user={user} />
          ))}
        </div>
      )}
    </section>
  );
}
