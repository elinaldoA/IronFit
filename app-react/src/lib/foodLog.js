import { db } from './supabase';

export async function fetchFoodLogs(userId, date) {
  const { data, error } = await db
    .from('food_logs')
    .select('id, meal_name, food_name, quantidade, kcal, proteina, carboidrato, gordura')
    .eq('user_id', userId)
    .eq('log_date', date)
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
      kcal: parseFloat(kcal) || 0,
      proteina: parseFloat(proteina) || 0,
      carboidrato: parseFloat(carboidrato) || 0,
      gordura: parseFloat(gordura) || 0,
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
      kcal: parseFloat(kcal) || 0,
      proteina: parseFloat(proteina) || 0,
      carboidrato: parseFloat(carboidrato) || 0,
      gordura: parseFloat(gordura) || 0,
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
    .eq('user_id', userId);
  if (error) throw error;
  return count || 0;
}
