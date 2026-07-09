import { db } from './supabase';
import { parseLocalDate, toDateStr } from './utils';
import { TODAY_DATE } from '../data/treinoData';

const RECENT_DAYS = 14;

export async function logDiscomfort(userId, exerciseName, logDate, severity, note) {
  const { error } = await db.from('exercise_discomfort').insert({
    user_id: userId,
    exercise_name: exerciseName,
    log_date: logDate,
    severity,
    note: note?.trim() || null,
  });
  if (error) throw error;
}

// Relato de desconforto mais recente (últimos RECENT_DAYS dias) pra um exercício,
// usado pra avisar o usuário quando o mesmo exercício reincide. Retorna null se
// não houver nenhum relato recente.
export async function fetchRecentDiscomfort(userId, exerciseName) {
  const since = parseLocalDate(TODAY_DATE);
  since.setDate(since.getDate() - RECENT_DAYS);

  const { data, error } = await db
    .from('exercise_discomfort')
    .select('severity, note, log_date')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .gte('log_date', toDateStr(since))
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
