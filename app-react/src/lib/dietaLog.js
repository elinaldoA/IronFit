import { db } from './supabase';

export async function fetchMealLogs(userId, date) {
  const { data, error } = await db
    .from('diet_logs')
    .select('meal_name, completed')
    .eq('user_id', userId)
    .eq('log_date', date);
  if (error) throw error;
  return data || [];
}

export async function upsertMealLog(userId, date, mealName, completed) {
  const { error } = await db
    .from('diet_logs')
    .upsert(
      { user_id: userId, log_date: date, meal_name: mealName, completed },
      { onConflict: 'user_id,log_date,meal_name' }
    );
  if (error) throw error;
}

export async function fetchWaterLog(userId, date) {
  const { data, error } = await db
    .from('water_logs')
    .select('amount_ml')
    .eq('user_id', userId)
    .eq('log_date', date)
    .maybeSingle();
  if (error) throw error;
  return data?.amount_ml ?? null;
}

export async function upsertWaterLog(userId, date, amountMl) {
  const { error } = await db
    .from('water_logs')
    .upsert(
      { user_id: userId, log_date: date, amount_ml: amountMl },
      { onConflict: 'user_id,log_date' }
    );
  if (error) throw error;
}

export async function fetchWaterLogsRange(userId, sinceDate) {
  const { data, error } = await db
    .from('water_logs')
    .select('log_date, amount_ml')
    .eq('user_id', userId)
    .gte('log_date', sinceDate)
    .order('log_date', { ascending: true });
  if (error) throw error;
  return data || [];
}
