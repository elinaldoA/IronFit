import { useEffect, useMemo, useState } from 'react';
import { getDietaData, getMacroGoals, TODAY_DATE } from '../data/treinoData';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { fetchMealLogs, upsertMealLog } from '../lib/dietaLog';
import { fetchFoodLogs, addFoodItem, updateFoodItem, deleteFoodItem } from '../lib/foodLog';
import { fetchRecipes } from '../lib/recipes';
import { enqueue } from '../lib/syncQueue';
import RecipeModal from '../components/RecipeModal';

function mealKey(meal) {
  return `dieta_${TODAY_DATE}_${meal.nome}`;
}

function FoodItemRow({ item, onDelete, onEdit, recipes }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <AddFoodForm
        initial={item}
        submitLabel="Salvar"
        recipes={recipes}
        onAdd={async fields => { await onEdit(item.id, fields); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="food-item-row">
      <span className="food-item-row__name">{item.food_name}{item.quantidade ? ` · ${item.quantidade}` : ''}</span>
      <span className="food-item-row__kcal">{item.kcal}kcal</span>
      <button type="button" className="food-item-row__edit" onClick={() => setEditing(true)} aria-label="Editar alimento">✏️</button>
      <button type="button" className="food-item-row__del" onClick={() => onDelete(item.id)} aria-label="Remover alimento">✕</button>
    </div>
  );
}

function AddFoodForm({ onAdd, onCancel, recipes, initial, submitLabel }) {
  const [foodName, setFoodName] = useState(initial?.food_name || '');
  const [quantidade, setQuantidade] = useState(initial?.quantidade || '');
  const [kcal, setKcal] = useState(initial?.kcal != null ? String(initial.kcal) : '');
  const [proteina, setProteina] = useState(initial?.proteina != null ? String(initial.proteina) : '');
  const [carboidrato, setCarboidrato] = useState(initial?.carboidrato != null ? String(initial.carboidrato) : '');
  const [gordura, setGordura] = useState(initial?.gordura != null ? String(initial.gordura) : '');
  const [saving, setSaving] = useState(false);

  function applyRecipe(recipeId) {
    const r = recipes.find(r => r.id === recipeId);
    if (!r) return;
    setFoodName(r.name);
    setKcal(String(r.kcal));
    setProteina(String(r.proteina));
    setCarboidrato(String(r.carboidrato));
    setGordura(String(r.gordura));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!foodName.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd({ foodName: foodName.trim(), quantidade, kcal, proteina, carboidrato, gordura });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="food-add-form" onSubmit={handleSubmit}>
      {recipes.length > 0 && (
        <select className="input input--sm" defaultValue="" onChange={e => applyRecipe(e.target.value)}>
          <option value="">Usar receita salva…</option>
          {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      )}
      <input className="input input--sm" placeholder="Alimento" value={foodName} onChange={e => setFoodName(e.target.value)} />
      <input className="input input--sm" placeholder="Quantidade (ex.: 150g)" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
      <div className="food-add-form__nums">
        <input className="input input--sm" placeholder="Kcal" inputMode="decimal" value={kcal} onChange={e => setKcal(e.target.value)} />
        <input className="input input--sm" placeholder="Prot." inputMode="decimal" value={proteina} onChange={e => setProteina(e.target.value)} />
        <input className="input input--sm" placeholder="Carb." inputMode="decimal" value={carboidrato} onChange={e => setCarboidrato(e.target.value)} />
        <input className="input input--sm" placeholder="Gord." inputMode="decimal" value={gordura} onChange={e => setGordura(e.target.value)} />
      </div>
      <div className="food-add-form__actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Salvando…' : (submitLabel || 'Adicionar')}</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

function MealCard({ meal, bump, user, items, onAddItem, onEditItem, onDeleteItem, recipes }) {
  const toast = useToast();
  const { markPending } = useWorkout();
  const done = localStorage.getItem(mealKey(meal)) === 'true';
  const [showAdd, setShowAdd] = useState(false);

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
        enqueue('meal_log', { userId: user.id, date: TODAY_DATE, mealName: meal.nome, completed: next });
        markPending();
      }
    }
  }

  async function handleAdd(item) {
    await onAddItem(meal.nome, item);
    setShowAdd(false);
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

        {items.length > 0 && (
          <div className="food-item-list">
            {items.map(item => (
              <FoodItemRow key={item.id} item={item} onDelete={onDeleteItem} onEdit={onEditItem} recipes={recipes} />
            ))}
          </div>
        )}

        {showAdd ? (
          <AddFoodForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} recipes={recipes} />
        ) : (
          <button type="button" className="btn btn--ghost btn--sm meal-card__add-food" onClick={() => setShowAdd(true)}>+ Adicionar alimento</button>
        )}
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

export default function DietaPage() {
  const { user, updateProfile } = useAuth();
  const { markPending } = useWorkout();
  const [tick, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);
  const toast = useToast();
  const macros = useMemo(() => getMacroGoals(user), [user]);

  const [meals, setMeals] = useState(() => getDietaData(user));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(meals);
  const [foodLogs, setFoodLogs] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [showRecipes, setShowRecipes] = useState(false);

  async function refreshRecipes() {
    if (!user) return;
    try {
      setRecipes(await fetchRecipes(user.id));
    } catch (err) {
      console.error('fetchRecipes:', err);
      toast('⚠️ Erro ao carregar receitas');
    }
  }

  useEffect(() => {
    if (!user) return;

    async function loadDietaLogs() {
      try {
        const [mealLogs, items, savedRecipes] = await Promise.all([
          fetchMealLogs(user.id, TODAY_DATE),
          fetchFoodLogs(user.id, TODAY_DATE),
          fetchRecipes(user.id),
        ]);
        mealLogs.forEach(m => localStorage.setItem(`dieta_${TODAY_DATE}_${m.meal_name}`, m.completed));
        setRecipes(savedRecipes);
        setFoodLogs(items);
        bump();
      } catch (err) {
        console.error('loadDietaLogs:', err);
        toast('⚠️ Erro ao carregar dados de hoje — o que aparece na tela pode estar desatualizado');
      }
    }
    loadDietaLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const done = meals.filter(m => localStorage.getItem(mealKey(m)) === 'true').length;
  const total = meals.length;
  const consumed = foodLogs.reduce((acc, item) => ({
    kcal: acc.kcal + (parseFloat(item.kcal) || 0),
    proteina: acc.proteina + (parseFloat(item.proteina) || 0),
    carboidrato: acc.carboidrato + (parseFloat(item.carboidrato) || 0),
    gordura: acc.gordura + (parseFloat(item.gordura) || 0),
  }), { kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 });
  const remainingMacros = {
    kcal: Math.max(0, Math.round(macros.macroKcal - consumed.kcal)),
    proteina: Math.max(0, Math.round(macros.macroProteina - consumed.proteina)),
    carboidrato: Math.max(0, Math.round(macros.macroCarboidrato - consumed.carboidrato)),
    gordura: Math.max(0, Math.round(macros.macroGordura - consumed.gordura)),
  };

  async function handleAddFoodItem(mealName, item) {
    try {
      const saved = await addFoodItem(user.id, { date: TODAY_DATE, mealName, ...item });
      setFoodLogs(list => [...list, saved]);
      toast('🍎 Alimento registrado');
    } catch (err) {
      console.error('addFoodItem:', err);
      toast('⚠️ Erro ao registrar alimento');
    }
  }

  async function handleEditFoodItem(id, item) {
    try {
      const updated = await updateFoodItem(id, user.id, item);
      setFoodLogs(list => list.map(i => (i.id === id ? updated : i)));
      toast('✏️ Alimento atualizado');
    } catch (err) {
      console.error('updateFoodItem:', err);
      toast('⚠️ Erro ao atualizar alimento');
    }
  }

  async function handleDeleteFoodItem(id) {
    try {
      await deleteFoodItem(id, user.id);
      setFoodLogs(list => list.filter(i => i.id !== id));
    } catch (err) {
      console.error('deleteFoodItem:', err);
      toast('⚠️ Erro ao remover alimento');
    }
  }

  async function handleReset() {
    if (!window.confirm('Limpar os checks de refeição de hoje?')) return;
    meals.forEach(m => localStorage.removeItem(mealKey(m)));
    bump();
    if (user) {
      const results = await Promise.allSettled(meals.map(m => upsertMealLog(user.id, TODAY_DATE, m.nome, false)));
      const failed = results.map((r, i) => ({ r, meal: meals[i] })).filter(({ r }) => r.status === 'rejected');
      if (failed.length) {
        failed.forEach(({ r, meal }) => {
          console.error('resetMealLogs:', meal.nome, r.reason);
          enqueue('meal_log', { userId: user.id, date: TODAY_DATE, mealName: meal.nome, completed: false });
        });
        markPending();
      }
    }
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
    const { error } = await updateProfile({ customMeals: cleaned });
    if (error) return toast('⚠️ Não foi possível salvar — tente novamente');
    setMeals(cleaned);
    setEditing(false);
    toast('🍽️ Refeições atualizadas!');
  }

  async function handleRestoreDefault() {
    if (!window.confirm('Restaurar as refeições padrão? Suas edições serão perdidas.')) return;
    const { error } = await updateProfile({ customMeals: null });
    if (error) return toast('⚠️ Não foi possível restaurar — tente novamente');
    const defaults = getDietaData(null);
    setMeals(defaults);
    setDraft(defaults);
    setEditing(false);
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
          <div className="progress-card__fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
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
          <button type="button" className="btn btn--ghost btn--sm" title="Receitas salvas" onClick={() => setShowRecipes(true)}>📋 Receitas</button>
        </div>
      </div>
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
            <MealCard
              key={meal.nome} meal={meal} bump={bump} user={user}
              items={foodLogs.filter(f => f.meal_name === meal.nome)}
              onAddItem={handleAddFoodItem}
              onEditItem={handleEditFoodItem}
              onDeleteItem={handleDeleteFoodItem}
              recipes={recipes}
            />
          ))}
        </div>
      )}
      {showRecipes && (
        <RecipeModal onClose={() => { setShowRecipes(false); refreshRecipes(); }} />
      )}
    </section>
  );
}
