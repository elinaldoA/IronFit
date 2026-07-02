import { db } from './supabase';

// Fórmula de Epley — estimativa padrão de 1RM a partir de peso x repetições.
export function estimateOneRepMax(weight, reps) {
  const w = parseFloat(weight);
  const r = parseFloat(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || r <= 0) return null;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

// Busca em 2 passos (todos os workout ids do usuário, depois os sets desse exercício)
// usada como fallback se o embed do Supabase abaixo não for reconhecido no schema.
async function fetchSetsForExerciseFallback(userId, exerciseName) {
  const { data: workouts, error: wErr } = await db
    .from('workouts')
    .select('id')
    .eq('user_id', userId);
  if (wErr) throw wErr;

  const ids = (workouts || []).map(w => w.id);
  if (!ids.length) return [];

  const { data: sets, error } = await db
    .from('exercise_sets')
    .select('workout_id, set_number, carga, reps')
    .in('workout_id', ids)
    .eq('exercise_name', exerciseName)
    .eq('completed', true)
    .not('carga', 'is', null);
  if (error) throw error;
  return sets || [];
}

// Retorna a maior carga e o maior 1RM estimado já registrados para um exercício,
// opcionalmente ignorando uma série específica (a que está sendo avaliada agora).
export async function fetchBestForExercise(userId, exerciseName, exclude = {}) {
  let sets;
  try {
    // Join direto via a FK exercise_sets.workout_id -> workouts.id: evita buscar
    // todos os workout ids do usuário antes (esse array só cresce com o tempo).
    const { data, error } = await db
      .from('exercise_sets')
      .select('workout_id, set_number, carga, reps, workouts!inner(user_id)')
      .eq('workouts.user_id', userId)
      .eq('exercise_name', exerciseName)
      .eq('completed', true)
      .not('carga', 'is', null);
    if (error) throw error;
    sets = data || [];
  } catch (err) {
    console.warn('fetchBestForExercise: embed falhou, usando busca em 2 passos', err);
    sets = await fetchSetsForExerciseFallback(userId, exerciseName);
  }

  let bestCarga = null;
  let bestOneRm = null;
  (sets || []).forEach(s => {
    if (exclude.workoutId != null && exclude.setNumber != null
      && s.workout_id === exclude.workoutId && s.set_number === exclude.setNumber) return;

    const carga = parseFloat(s.carga);
    if (Number.isFinite(carga) && (bestCarga === null || carga > bestCarga)) bestCarga = carga;

    const oneRm = estimateOneRepMax(s.carga, s.reps);
    if (oneRm !== null && (bestOneRm === null || oneRm > bestOneRm)) bestOneRm = oneRm;
  });

  return { bestCarga, bestOneRm };
}

// Compara a série recém-concluída com o histórico e diz se ela bateu algum recorde.
export async function checkForNewPR(userId, exerciseName, carga, reps, exclude = {}) {
  const cargaNum = parseFloat(carga);
  if (!Number.isFinite(cargaNum)) return null;

  const { bestCarga, bestOneRm } = await fetchBestForExercise(userId, exerciseName, exclude);
  const newOneRm = estimateOneRepMax(carga, reps);

  const isCargaPR = bestCarga === null || cargaNum > bestCarga;
  const isOneRmPR = newOneRm !== null && (bestOneRm === null || newOneRm > bestOneRm);

  if (isCargaPR || isOneRmPR) return { isCargaPR, isOneRmPR, carga: cargaNum, oneRm: newOneRm };
  return null;
}
