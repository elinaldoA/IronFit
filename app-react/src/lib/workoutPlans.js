import { db } from './supabase';
import { treinoData, TODAY_DATE } from '../data/treinoData';
import { parseLocalDate, toDateStr } from './utils';
import { evaluateCycleEvolution } from './planEvolution';

// Ciclo positivo antecipa o próximo (mais 1 semana livre pra "subir de nível"
// mais rápido); negativo estende (mais tempo pra consolidar antes de avançar).
const DURATION_ADJUST_WEEKS = { positivo: -1, neutro: 0, negativo: 2 };

function addWeeks(dateStr, weeks) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return toDateStr(d);
}

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

async function seedDefaultPlan(userId, days = treinoData) {
  const { data: plan, error } = await db
    .from('workout_plans')
    .insert({ user_id: userId, name: 'Meu plano', is_active: true })
    .select()
    .single();
  if (error) throw error;

  await insertDaysAndExercises(plan.id, days);
  return plan;
}

// Usado pela tela de onboarding para semear o plano já personalizado
// (gerado por regras a partir de IMC/objetivo/sexo) assim que o cadastro
// termina, em vez do plano estático padrão.
export async function seedGeneratedPlan(userId, generatedDays) {
  return seedDefaultPlan(userId, generatedDays);
}

// Usado pela Perfil para regenerar o treino a partir dos dados atuais do
// usuário. Insere como inativo e só então chama setActivePlan — assim nunca
// existe mais de um plano ativo ao mesmo tempo (diferente de seedDefaultPlan,
// que pode inserir direto como ativo porque só roda quando não há nenhum
// plano ainda).
export async function createGeneratedPlan(userId, name, generatedDays) {
  const { data: plan, error } = await db
    .from('workout_plans')
    .insert({ user_id: userId, name, is_active: false })
    .select()
    .single();
  if (error) throw error;

  await insertDaysAndExercises(plan.id, generatedDays);
  await setActivePlan(userId, plan.id);
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

const PLAN_CYCLE_FIELDS = 'id, name, created_at, start_date, end_date, duration_weeks, next_plan_id, regression_plan_id';

// Quando o ciclo do plano ativo venceu: avalia a evolução (exercícios do
// plano, peso vs objetivo, aderência, desconforto/lesão) e ativa o sucessor
// correspondente (progressão ou recuperação), ajustando a duração do próximo
// ciclo pra cima/baixo conforme o veredito. Sem sucessor configurado pro
// veredito obtido, não faz nada — o plano fica vencido até o usuário escolher
// manualmente no editor de planos.
async function applyPlanExpiry(userId, plan, days, meta) {
  const evaluation = await evaluateCycleEvolution(userId, plan, days, meta);
  const successorId = evaluation.verdict === 'negativo' ? plan.regression_plan_id : plan.next_plan_id;
  if (!successorId) return { switched: false, evaluation };

  const { data: successor, error } = await db
    .from('workout_plans')
    .select('id, name, duration_weeks')
    .eq('id', successorId)
    .maybeSingle();
  if (error) throw error;
  if (!successor) return { switched: false, evaluation };

  const baseWeeks = successor.duration_weeks ?? plan.duration_weeks ?? null;
  const adjustedWeeks = baseWeeks ? Math.max(1, baseWeeks + DURATION_ADJUST_WEEKS[evaluation.verdict]) : null;

  await setActivePlan(userId, successorId, adjustedWeeks);
  return { switched: true, evaluation, successorName: successor.name };
}

export async function fetchActivePlan(userId, meta = {}) {
  const { data: actives, error } = await db
    .from('workout_plans')
    .select(PLAN_CYCLE_FIELDS)
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
      .select(PLAN_CYCLE_FIELDS)
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

  if (plan.end_date && plan.end_date <= TODAY_DATE) {
    const { switched, evaluation, successorName } = await applyPlanExpiry(userId, plan, days, meta);
    if (switched) {
      const next = await fetchActivePlan(userId, meta);
      return { ...next, switchInfo: { toName: successorName, verdict: evaluation.verdict } };
    }
    return { id: plan.id, name: plan.name, days, expiredNoSuccessor: true };
  }

  return { id: plan.id, name: plan.name, days };
}

export async function listPlans(userId) {
  const { data, error } = await db
    .from('workout_plans')
    .select('id, name, is_active, created_at, start_date, end_date, duration_weeks, next_plan_id, regression_plan_id')
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

// durationWeeks define o prazo do ciclo (start_date = hoje, end_date = hoje +
// N semanas); null/0 ativa o plano sem prazo (comportamento anterior, ciclo
// indefinido) e limpa qualquer prazo que o plano já tivesse.
export async function setActivePlan(userId, planId, durationWeeks = null) {
  const { error: offErr } = await db.from('workout_plans').update({ is_active: false }).eq('user_id', userId);
  if (offErr) throw offErr;

  const patch = durationWeeks
    ? { is_active: true, start_date: TODAY_DATE, end_date: addWeeks(TODAY_DATE, durationWeeks), duration_weeks: durationWeeks }
    : { is_active: true, start_date: null, end_date: null, duration_weeks: null };
  const { error: onErr } = await db.from('workout_plans').update(patch).eq('id', planId);
  if (onErr) throw onErr;
}

// next_plan_id: plano ativado automaticamente quando o ciclo termina bem
// (progressão). regression_plan_id: ativado quando o ciclo termina
// estagnado/negativo (recuperação/deload). Ambos opcionais e independentes.
export async function updatePlanSuccessors(planId, { nextPlanId, regressionPlanId }) {
  const { error } = await db.from('workout_plans')
    .update({ next_plan_id: nextPlanId || null, regression_plan_id: regressionPlanId || null })
    .eq('id', planId);
  if (error) throw error;
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
