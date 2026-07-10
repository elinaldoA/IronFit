import { useEffect, useMemo, useState } from 'react';
import { getDietaData, getMacroGoals, TODAY_DATE } from '../data/treinoData';
import { parseDecimal, mealMacroContribution } from '../lib/utils';
import { fetchMealLogs, upsertMealLog } from '../lib/dietaLog';
import { fetchFoodLogs, addFoodItem, updateFoodItem, deleteFoodItem, setMealEstimate, clearMealEstimate } from '../lib/foodLog';
import { fetchRecipes } from '../lib/recipes';
import { enqueue } from '../lib/syncQueue';
import { mealKey, sumMacros, macroRemaining } from '../lib/dietaHelpers';

// Estado, carregamento e handlers da tela de Dieta: refeições (padrão ou
// customizadas), alimentos registrados de hoje, receitas salvas e os macros
// restantes do dia — tudo que não é composição visual da página.
export function useDietaMeals(user, toast, markPending, updateProfile) {
  const [_tick, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);
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

  // Por refeição: alimentos registrados (mais preciso) OU, se nenhum foi
  // registrado e a refeição foi marcada como feita, a estimativa dela —
  // nunca os dois juntos, senão contaria a mesma comida duas vezes.
  const consumed = meals.reduce((acc, meal) => {
    const items = foodLogs.filter(f => f.meal_name === meal.nome);
    const mealDone = localStorage.getItem(mealKey(meal)) === 'true';
    return sumMacros(acc, mealMacroContribution(meal, items, mealDone));
  }, orphanItems.reduce(sumMacros, { kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 }));

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
      // Um alimento real substitui a estimativa da refeição (evita contar as duas coisas).
      clearMealEstimate(user.id, TODAY_DATE, mealName).catch(err => console.error('clearMealEstimate:', err));
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
    const deletedItem = foodLogs.find(i => i.id === id);
    try {
      await deleteFoodItem(id, user.id);
      setFoodLogs(list => list.filter(i => i.id !== id));
      // Se essa era a última comida específica da refeição e ela já estava
      // marcada como feita, volta a valer a estimativa (senão o dia fica sem
      // nada contado, mesmo com a refeição marcada).
      if (deletedItem) {
        const remaining = foodLogs.filter(i => i.meal_name === deletedItem.meal_name && i.id !== id);
        const meal = meals.find(m => m.nome === deletedItem.meal_name);
        const mealDone = meal && localStorage.getItem(mealKey(meal)) === 'true';
        if (remaining.length === 0 && mealDone) {
          setMealEstimate(user.id, TODAY_DATE, meal).catch(err => console.error('setMealEstimate:', err));
        }
      }
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

  return {
    bump, meals, editing, setEditing, draft, foodLogs, recipes, showRecipes, setShowRecipes, logsLoaded,
    orphanItems, done, total, remainingMacros, refreshRecipes,
    handleAddFoodItem, handleEditFoodItem, handleDeleteFoodItem, handleReset,
    startEditing, updateDraftMeal, removeDraftMeal, addDraftMeal, handleSaveMeals, handleRestoreDefault,
  };
}
