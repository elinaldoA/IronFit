import { db } from './supabase';
import { parseDecimal } from './utils';

// Exclui linhas is_estimate (geradas ao marcar uma refeição sem alimento
// registrado) — a tela de Dieta já recalcula a estimativa ao vivo a partir da
// refeição, então mostrar a linha salva também criaria um item fantasma
// duplicado com botões de editar/remover. fetchFoodLogsRange (histórico do
// Dashboard) NÃO filtra — é justamente onde essas linhas precisam aparecer.
export async function fetchFoodLogs(userId, date) {
  const { data, error } = await db
    .from('food_logs')
    .select('id, meal_name, food_name, quantidade, kcal, proteina, carboidrato, gordura')
    .eq('user_id', userId)
    .eq('log_date', date)
    .eq('is_estimate', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Linhas cruas de vários dias — quem chama soma o que precisar (ex.: kcal por dia no Dashboard).
export async function fetchFoodLogsRange(userId, sinceDate) {
  const { data, error } = await db
    .from('food_logs')
    .select('log_date, kcal, proteina, carboidrato, gordura')
    .eq('user_id', userId)
    .gte('log_date', sinceDate)
    .order('log_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addFoodItem(userId, { date, mealName, foodName, quantidade, kcal, proteina, carboidrato, gordura }) {
  const { data, error } = await db
    .from('food_logs')
    .insert({
      user_id: userId,
      log_date: date,
      meal_name: mealName || null,
      food_name: foodName,
      quantidade: quantidade || null,
      kcal: parseDecimal(kcal) || 0,
      proteina: parseDecimal(proteina) || 0,
      carboidrato: parseDecimal(carboidrato) || 0,
      gordura: parseDecimal(gordura) || 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFoodItem(id, userId, { foodName, quantidade, kcal, proteina, carboidrato, gordura }) {
  const { data, error } = await db
    .from('food_logs')
    .update({
      food_name: foodName,
      quantidade: quantidade || null,
      kcal: parseDecimal(kcal) || 0,
      proteina: parseDecimal(proteina) || 0,
      carboidrato: parseDecimal(carboidrato) || 0,
      gordura: parseDecimal(gordura) || 0,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFoodItem(id, userId) {
  const { error } = await db.from('food_logs').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function countFoodLogs(userId) {
  const { count, error } = await db
    .from('food_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_estimate', false);
  if (error) throw error;
  return count || 0;
}

// Materializa a estimativa da refeição como uma linha em food_logs (só assim
// o histórico de kcal/macros do Dashboard consegue enxergar dias em que a
// refeição foi só marcada como feita, sem alimento específico registrado).
// Substitui qualquer estimativa anterior da mesma refeição/dia.
export async function setMealEstimate(userId, date, meal) {
  await clearMealEstimate(userId, date, meal.nome);
  const kcal = parseFloat(meal.kcal) || 0;
  if (kcal <= 0) return;
  const { error } = await db.from('food_logs').insert({
    user_id: userId,
    log_date: date,
    meal_name: meal.nome,
    food_name: meal.nome,
    is_estimate: true,
    kcal,
    proteina: parseFloat(meal.proteina) || 0,
    carboidrato: parseFloat(meal.carboidrato) || 0,
    gordura: parseFloat(meal.gordura) || 0,
  });
  if (error) throw error;
}

export async function clearMealEstimate(userId, date, mealName) {
  const { error } = await db
    .from('food_logs')
    .delete()
    .eq('user_id', userId)
    .eq('log_date', date)
    .eq('meal_name', mealName)
    .eq('is_estimate', true);
  if (error) throw error;
}
