import { useEffect, useMemo, useState } from 'react';
import { getDietaData, getMacroGoals, TODAY_DATE } from '../data/treinoData';
import { parseDecimal, mealMacroContribution } from '../lib/utils';
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

// Escapa tudo e só então reabre `**negrito**` — texto de refeição é editável
// pelo usuário, então nunca pode virar HTML/script arbitrário na tela de outra pessoa.
function descHtml(text) {
  const escaped = String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return { __html: escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') };
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
  // Enquanto não carrega (ou falha), foodLogs fica vazio — sem essa flag os
  // macros restantes mostravam o orçamento cheio como se nada tivesse sido
  // comido ainda, mesmo quando na verdade é só a busca que falhou/está em andamento.
  const [logsLoaded, setLogsLoaded] = useState(false);

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
        setLogsLoaded(true);
        bump();
      } catch (err) {
        console.error('loadDietaLogs:', err);
        toast('⚠️ Erro ao carregar dados de hoje — o que aparece na tela pode estar desatualizado');
      }
    }
    loadDietaLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Alimentos registrados sob um nome de refeição que não existe mais (editado
  // ou substituído por "Gerar novo cardápio") ficariam invisíveis — e ainda
  // assim contam pro total consumido, então precisam aparecer em algum lugar.
  const mealNames = useMemo(() => new Set(meals.map(m => m.nome)), [meals]);
  const orphanItems = foodLogs.filter(f => !mealNames.has(f.meal_name));

  const done = meals.filter(m => localStorage.getItem(mealKey(m)) === 'true').length;
  const total = meals.length;
  function sumMacros(acc, m) {
    return {
      kcal: acc.kcal + (parseFloat(m.kcal) || 0),
      proteina: acc.proteina + (parseFloat(m.proteina) || 0),
      carboidrato: acc.carboidrato + (parseFloat(m.carboidrato) || 0),
      gordura: acc.gordura + (parseFloat(m.gordura) || 0),
    };
  }
  // Por refeição: alimentos registrados (mais preciso) OU, se nenhum foi
  // registrado e a refeição foi marcada como feita, a estimativa dela —
  // nunca os dois juntos, senão contaria a mesma comida duas vezes.
  const consumed = meals.reduce((acc, meal) => {
    const items = foodLogs.filter(f => f.meal_name === meal.nome);
    const mealDone = localStorage.getItem(mealKey(meal)) === 'true';
    return sumMacros(acc, mealMacroContribution(meal, items, mealDone));
  }, orphanItems.reduce(sumMacros, { kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 }));
  // Antes ficava em 0 assim que o macro era excedido, sem indicar o quanto —
  // agora guarda o excedente pra exibir "+Xg excedido" em vez de esconder.
  function macroRemaining(goal, value) {
    const diff = Math.round(goal - value);
    return diff >= 0 ? { value: diff, over: false } : { value: -diff, over: true };
  }
  const remainingMacros = {
    kcal: macroRemaining(macros.macroKcal, consumed.kcal),
    proteina: macroRemaining(macros.macroProteina, consumed.proteina),
    carboidrato: macroRemaining(macros.macroCarboidrato, consumed.carboidrato),
    gordura: macroRemaining(macros.macroGordura, consumed.gordura),
  };

  async function handleAddFoodItem(mealName, item) {
    // Otimista: o item aparece na hora com um id temporário. Se a escrita
    // falhar, fica enfileirado — sem isso, uma falha de rede apagava o que
    // o usuário acabou de digitar sem deixar rastro nenhum na tela.
    const tempId = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const optimistic = {
      id: tempId, meal_name: mealName, food_name: item.foodName, quantidade: item.quantidade || null,
      kcal: parseDecimal(item.kcal) || 0, proteina: parseDecimal(item.proteina) || 0,
      carboidrato: parseDecimal(item.carboidrato) || 0, gordura: parseDecimal(item.gordura) || 0,
    };
    setFoodLogs(list => [...list, optimistic]);
    try {
      const saved = await addFoodItem(user.id, { date: TODAY_DATE, mealName, ...item });
      setFoodLogs(list => list.map(i => (i.id === tempId ? saved : i)));
      toast('🍎 Alimento registrado');
    } catch (err) {
      console.error('addFoodItem:', err);
      enqueue('food_log_add', { userId: user.id, date: TODAY_DATE, mealName, item });
      markPending();
      toast('📶 Sem conexão — alimento salvo localmente e sincronizado quando voltar');
    }
  }

  async function handleEditFoodItem(id, item) {
    const patch = {
      food_name: item.foodName, quantidade: item.quantidade || null,
      kcal: parseDecimal(item.kcal) || 0, proteina: parseDecimal(item.proteina) || 0,
      carboidrato: parseDecimal(item.carboidrato) || 0, gordura: parseDecimal(item.gordura) || 0,
    };
    try {
      const updated = await updateFoodItem(id, user.id, item);
      setFoodLogs(list => list.map(i => (i.id === id ? updated : i)));
      toast('✏️ Alimento atualizado');
    } catch (err) {
      console.error('updateFoodItem:', err);
      // Aplica a edição localmente mesmo assim (update por id é idempotente,
      // então reexecutar depois é seguro) — melhor que fingir que nada mudou.
      setFoodLogs(list => list.map(i => (i.id === id ? { ...i, ...patch } : i)));
      enqueue('food_log_edit', { id, userId: user.id, item });
      markPending();
      toast('📶 Sem conexão — edição salva localmente e sincronizada quando voltar');
    }
  }

  async function handleDeleteFoodItem(id) {
    try {
      await deleteFoodItem(id, user.id);
      setFoodLogs(list => list.filter(i => i.id !== id));
    } catch (err) {
      console.error('deleteFoodItem:', err);
      setFoodLogs(list => list.filter(i => i.id !== id));
      enqueue('food_log_delete', { id, userId: user.id });
      markPending();
      toast('📶 Sem conexão — remoção será sincronizada quando voltar');
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
    setDraft(d => {
      const names = new Set(d.map(m => m.nome));
      let nome = 'Nova refeição';
      let i = 2;
      while (names.has(nome)) nome = `Nova refeição ${i++}`;
      return [...d, { horario: '12:00', nome, descricao: '', kcal: '', proteina: '', carboidrato: '', gordura: '' }];
    });
  }

  async function handleSaveMeals() {
    const cleaned = draft
      .filter(m => m.nome.trim() && m.horario.trim())
      .map(m => ({
        ...m,
        kcal: parseDecimal(String(m.kcal ?? '')) || 0,
        proteina: parseDecimal(String(m.proteina ?? '')) || 0,
        carboidrato: parseDecimal(String(m.carboidrato ?? '')) || 0,
        gordura: parseDecimal(String(m.gordura ?? '')) || 0,
      }))
      .sort((a, b) => a.horario.localeCompare(b.horario));
    // Nomes duplicados colidem: mesma chave de "concluída" no localStorage,
    // mesma linha no upsert de diet_logs (chave única user+data+nome) e os
    // alimentos registrados de uma aparecem duplicados na outra.
    const seen = new Set();
    const dupes = new Set();
    cleaned.forEach(m => {
      if (seen.has(m.nome)) dupes.add(m.nome);
      seen.add(m.nome);
    });
    if (dupes.size) return toast(`⚠️ Nomes repetidos: ${[...dupes].join(', ')} — renomeie antes de salvar`);

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
      {!user || logsLoaded ? (
        <div id="macrosGrid" className="macros">
          <div className={`macro-card${remainingMacros.kcal.over ? ' macro-card--over' : ''}`}>
            <span className="macro-card__value">{remainingMacros.kcal.value}</span>
            <span className="macro-card__label">{remainingMacros.kcal.over ? 'Kcal excedidas' : 'Kcal restantes'}</span>
          </div>
          <div className={`macro-card${remainingMacros.proteina.over ? ' macro-card--over' : ''}`}>
            <span className="macro-card__value">{remainingMacros.proteina.value}g</span>
            <span className="macro-card__label">{remainingMacros.proteina.over ? 'Proteína excedida' : 'Proteína restante'}</span>
          </div>
          <div className={`macro-card${remainingMacros.carboidrato.over ? ' macro-card--over' : ''}`}>
            <span className="macro-card__value">{remainingMacros.carboidrato.value}g</span>
            <span className="macro-card__label">{remainingMacros.carboidrato.over ? 'Carbo excedido' : 'Carbo restante'}</span>
          </div>
          <div className={`macro-card${remainingMacros.gordura.over ? ' macro-card--over' : ''}`}>
            <span className="macro-card__value">{remainingMacros.gordura.value}g</span>
            <span className="macro-card__label">{remainingMacros.gordura.over ? 'Gordura excedida' : 'Gordura restante'}</span>
          </div>
        </div>
      ) : (
        <div id="macrosGrid" className="macros">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton" style={{ height: 64 }} />)}
        </div>
      )}
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
      {!editing && orphanItems.length > 0 && (
        <div className="section-group">
          <div className="section-group__label">Outros registros de hoje</div>
          <p className="toolbar__hint">Alimentos de refeições renomeadas ou removidas — ainda contam no total.</p>
          <div className="meal-card">
            <div className="meal-card__body">
              <div className="food-item-list">
                {orphanItems.map(item => (
                  <FoodItemRow key={item.id} item={item} onDelete={handleDeleteFoodItem} onEdit={handleEditFoodItem} recipes={recipes} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {showRecipes && (
        <RecipeModal onClose={() => { setShowRecipes(false); refreshRecipes(); }} />
      )}
    </section>
  );
}
