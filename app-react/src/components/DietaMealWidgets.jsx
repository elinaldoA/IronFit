import { useState } from 'react';
import { TODAY_DATE } from '../data/treinoData';
import { useToast } from '../context/ToastContext';
import { useWorkout } from '../context/WorkoutContext';
import { upsertMealLog } from '../lib/dietaLog';
import { setMealEstimate, clearMealEstimate } from '../lib/foodLog';
import { enqueue } from '../lib/syncQueue';
import { mealKey, descHtml } from '../lib/dietaHelpers';

export function FoodItemRow({ item, onDelete, onEdit, recipes }) {
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

export function AddFoodForm({ onAdd, onCancel, recipes, initial, submitLabel }) {
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

export function MealCard({ meal, bump, user, items, onAddItem, onEditItem, onDeleteItem, recipes }) {
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
      // Materializa a estimativa em food_logs só quando não há alimento
      // específico registrado nela — senão o histórico da Evolução duplicaria
      // a contagem (estimativa + alimento real) daqui pra frente.
      if (items.length === 0) {
        try {
          if (next) await setMealEstimate(user.id, TODAY_DATE, meal);
          else await clearMealEstimate(user.id, TODAY_DATE, meal.nome);
        } catch (err) {
          console.error('mealEstimate:', err);
          enqueue(next ? 'meal_estimate_set' : 'meal_estimate_clear', { userId: user.id, date: TODAY_DATE, meal, mealName: meal.nome });
          markPending();
        }
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
        <div className="meal-card__desc" dangerouslySetInnerHTML={descHtml(meal.descricao)} />
        {Number(meal.kcal) > 0 && items.length === 0 && (
          <p className="meal-card__estimate">
            {done ? `✅ ${Math.round(meal.kcal)}kcal debitadas (estimativa)` : `≈${Math.round(meal.kcal)}kcal se marcar como feita`}
          </p>
        )}

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

export function MealEditRow({ meal, onChange, onRemove }) {
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
      <p className="meal-edit-row__hint">Estimativa usada pra debitar do orçamento quando marcar como feita (sem alimentos registrados nela):</p>
      <div className="food-add-form__nums">
        <input
          className="input input--sm" placeholder="Kcal" inputMode="decimal" value={meal.kcal ?? ''}
          onChange={e => onChange({ ...meal, kcal: e.target.value })}
        />
        <input
          className="input input--sm" placeholder="Prot." inputMode="decimal" value={meal.proteina ?? ''}
          onChange={e => onChange({ ...meal, proteina: e.target.value })}
        />
        <input
          className="input input--sm" placeholder="Carb." inputMode="decimal" value={meal.carboidrato ?? ''}
          onChange={e => onChange({ ...meal, carboidrato: e.target.value })}
        />
        <input
          className="input input--sm" placeholder="Gord." inputMode="decimal" value={meal.gordura ?? ''}
          onChange={e => onChange({ ...meal, gordura: e.target.value })}
        />
      </div>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove}>Remover</button>
    </div>
  );
}
