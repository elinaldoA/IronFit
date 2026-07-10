import { db } from './supabase';

export async function fetchWeightLogs(userId) {
  const { data, error } = await db
    .from('weight_logs')
    .select('log_date, weight')
    .eq('user_id', userId)
    .order('log_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => ({ log_date: row.log_date, peso: row.weight }));
}

export async function upsertWeightLog(userId, logDate, peso) {
  const { error } = await db
    .from('weight_logs')
    .upsert(
      { user_id: userId, log_date: logDate, weight: peso },
      { onConflict: 'user_id,log_date' }
    );
  if (error) throw error;
}
