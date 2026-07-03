import { db } from './supabase';
import { treinoData } from '../data/treinoData';

function exercisesToRows(planDayId, day) {
  return [
    ...day.exercicios.map((ex, idx) => ({
      plan_day_id: planDayId, nome: ex.nome, series: ex.series, reps: ex.reps,
      descanso: ex.descanso, tecnica: ex.tecnica, is_post_workout: false, order_index: idx,
    })),
    ...day.pos.map((p, idx) => ({
      plan_day_id: planDayId, nome: p.nome, series: p.series, reps: p.reps,
      descanso: p.descanso, tecnica: p.tecnica, is_post_workout: true, order_index: idx,
    })),
  ];
}

async function insertDaysAndExercises(planId, days) {
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const { data: planDay, error: dayErr } = await db
      .from('plan_days')
      .insert({ plan_id: planId, dia: day.dia, foco: day.foco, order_index: i })
      .select()
      .single();
    if (dayErr) throw dayErr;

    const rows = exercisesToRows(planDay.id, day);
    if (rows.length) {
      const { error: exErr } = await db.from('plan_exercises').insert(rows);
      if (exErr) throw exErr;
    }
  }
}

async function seedDefaultPlan(userId) {
  const { data: plan, error } = await db
    .from('workout_plans')
    .insert({ user_id: userId, name: 'Meu plano', is_active: true })
    .select()
    .single();
  if (error) throw error;

  await insertDaysAndExercises(plan.id, treinoData);
  return plan;
}

const inFlightSeed = new Map();

// Evita criar planos duplicados quando loadUserData roda mais de uma vez em paralelo
// (ex.: dois efeitos disparados quase juntos no StrictMode do React em dev).
function seedDefaultPlanOnce(userId) {
  if (inFlightSeed.has(userId)) return inFlightSeed.get(userId);
  const promise = seedDefaultPlan(userId).finally(() => inFlightSeed.delete(userId));
  inFlightSeed.set(userId, promise);
  return promise;
}

export async function fetchPlanDays(planId) {
  const { data: days, error } = await db
    .from('plan_days')
    .select('id, dia, foco, order_index')
    .eq('plan_id', planId)
    .order('order_index', { ascending: true });
  if (error) throw error;

  const dayIds = (days || []).map(d => d.id);
  let exercises = [];
  if (dayIds.length) {
    const { data: ex, error: exErr } = await db
      .from('plan_exercises')
      .select('id, plan_day_id, nome, series, reps, descanso, tecnica, is_post_workout, order_index')
      .in('plan_day_id', dayIds)
      .order('order_index', { ascending: true });
    if (exErr) throw exErr;
    exercises = ex || [];
  }

  return (days || []).map(d => ({
    id: d.id,
    dia: d.dia,
    foco: d.foco,
    exercicios: exercises
      .filter(e => e.plan_day_id === d.id && !e.is_post_workout)
      .map(e => ({ id: e.id, nome: e.nome, series: e.series, reps: e.reps, descanso: e.descanso, tecnica: e.tecnica })),
    pos: exercises
      .filter(e => e.plan_day_id === d.id && e.is_post_workout)
      .map(e => ({ id: e.id, nome: e.nome, series: e.series, reps: e.reps, descanso: e.descanso, tecnica: e.tecnica })),
  }));
}

export async function fetchActivePlan(userId) {
  const { data: actives, error } = await db
    .from('workout_plans')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;

  let plan = actives?.[0] || null;

  // Autocorreção: se uma corrida de inicialização criou mais de um plano ativo,
  // mantém o mais antigo e remove os demais (cascade limpa os dias/exercícios órfãos).
  if (actives && actives.length > 1) {
    const duplicateIds = actives.slice(1).map(p => p.id);
    await db.from('workout_plans').delete().in('id', duplicateIds);
  }

  if (!plan) {
    const { data: any } = await db
      .from('workout_plans')
      .select('id, name')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (any) {
      await db.from('workout_plans').update({ is_active: true }).eq('id', any.id);
      plan = any;
    } else {
      plan = await seedDefaultPlanOnce(userId);
    }
  }

  const days = await fetchPlanDays(plan.id);
  return { id: plan.id, name: plan.name, days };
}

export async function listPlans(userId) {
  const { data, error } = await db
    .from('workout_plans')
    .select('id, name, is_active, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createPlan(userId, name, copyFromPlanId = null) {
  const { data: plan, error } = await db
    .from('workout_plans')
    .insert({ user_id: userId, name, is_active: false })
    .select()
    .single();
  if (error) throw error;

  if (copyFromPlanId) {
    const days = await fetchPlanDays(copyFromPlanId);
    await insertDaysAndExercises(plan.id, days);
  } else {
    const rows = treinoData.map((day, i) => ({ plan_id: plan.id, dia: day.dia, foco: '', order_index: i }));
    const { error: daysErr } = await db.from('plan_days').insert(rows);
    if (daysErr) throw daysErr;
  }

  return plan;
}

export async function setActivePlan(userId, planId) {
  const { error: offErr } = await db.from('workout_plans').update({ is_active: false }).eq('user_id', userId);
  if (offErr) throw offErr;
  const { error: onErr } = await db.from('workout_plans').update({ is_active: true }).eq('id', planId);
  if (onErr) throw onErr;
}

export async function renamePlan(planId, name) {
  const { error } = await db.from('workout_plans').update({ name }).eq('id', planId);
  if (error) throw error;
}

export async function deletePlan(planId, userId) {
  const { error } = await db.from('workout_plans').delete().eq('id', planId).eq('user_id', userId);
  if (error) throw error;
}

export async function updatePlanDay(dayId, patch) {
  const { error } = await db.from('plan_days').update(patch).eq('id', dayId);
  if (error) throw error;
}

export async function addExercise(planDayId, exercise, orderIndex) {
  const { error } = await db.from('plan_exercises').insert({ plan_day_id: planDayId, order_index: orderIndex, ...exercise });
  if (error) throw error;
}

// userId, quando informado, é usado para propagar renomeações para o histórico
// (exercise_logs/exercise_sets) do próprio usuário, evitando órfãos.
export async function updateExercise(exerciseId, patch, userId) {
  if (patch.nome !== undefined && userId) {
    const { data: current, error: curErr } = await db.from('plan_exercises').select('nome').eq('id', exerciseId).single();
    if (curErr) throw curErr;

    if (current.nome && current.nome !== patch.nome) {
      const { data: userWorkouts, error: wErr } = await db.from('workouts').select('id').eq('user_id', userId);
      if (wErr) throw wErr;
      const workoutIds = (userWorkouts || []).map(w => w.id);

      if (workoutIds.length) {
        const { error: logErr } = await db
          .from('exercise_logs')
          .update({ exercise_name: patch.nome })
          .eq('exercise_name', current.nome)
          .in('workout_id', workoutIds);
        if (logErr) throw logErr;

        const { error: setErr } = await db
          .from('exercise_sets')
          .update({ exercise_name: patch.nome })
          .eq('exercise_name', current.nome)
          .in('workout_id', workoutIds);
        if (setErr) throw setErr;
      }
    }
  }

  const { error } = await db.from('plan_exercises').update(patch).eq('id', exerciseId);
  if (error) throw error;
}

export async function deleteExercise(exerciseId) {
  const { error } = await db.from('plan_exercises').delete().eq('id', exerciseId);
  if (error) throw error;
}

export async function reorderExercises(updates) {
  const results = await Promise.all(
    updates.map(u => db.from('plan_exercises').update({ order_index: u.order_index }).eq('id', u.id))
  );
  const failed = results.find(r => r.error);
  if (failed) throw failed.error;
}
