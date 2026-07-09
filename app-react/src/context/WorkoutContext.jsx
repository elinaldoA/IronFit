import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { db } from '../lib/supabase';
import { fetchActivePlan } from '../lib/workoutPlans';
import { getDateForWeekday } from '../lib/utils';
import { enqueue, flushQueue, queueSize } from '../lib/syncQueue';
import { upsertMealLog, upsertWaterLog } from '../lib/dietaLog';
import { upsertWeightLog } from '../lib/weightLog';
import { addFoodItem, updateFoodItem, deleteFoodItem, setMealEstimate, clearMealEstimate } from '../lib/foodLog';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const WorkoutContext = createContext(null);

// Reexecuta uma escrita que falhou (ex.: sem internet no momento) quando a fila é esvaziada.
const SYNC_EXECUTORS = {
  workout_status: async ({ id, completed }) => {
    const { error } = await db.from('workouts').update({ completed }).eq('id', id);
    if (error) throw error;
  },
  workout_timer: async ({ id, started_at, finished_at, duration_seconds }) => {
    const { error } = await db.from('workouts').update({ started_at, finished_at, duration_seconds }).eq('id', id);
    if (error) throw error;
  },
  set_state: async ({ workout_id, exercise_name, set_number, patch }) => {
    const { error } = await db
      .from('exercise_sets')
      .upsert({ workout_id, exercise_name, set_number, ...patch }, { onConflict: 'workout_id,exercise_name,set_number' });
    if (error) throw error;
  },
  // Usados quando a falha aconteceu antes de resolver o workout do dia (ex.: sem
  // internet logo ao abrir o app) — resolvem/criam o workout de novo antes de escrever.
  workout_status_by_day: async ({ userId, day, completed }) => {
    const wId = await ensureWorkoutId(userId, day);
    const { error } = await db.from('workouts').update({ completed }).eq('id', wId);
    if (error) throw error;
  },
  workout_timer_by_day: async ({ userId, day, started_at, finished_at, duration_seconds }) => {
    const wId = await ensureWorkoutId(userId, day);
    const { error } = await db.from('workouts').update({ started_at, finished_at, duration_seconds }).eq('id', wId);
    if (error) throw error;
  },
  set_state_by_day: async ({ userId, day, exercise_name, set_number, patch }) => {
    const wId = await ensureWorkoutId(userId, day);
    const { error } = await db
      .from('exercise_sets')
      .upsert({ workout_id: wId, exercise_name, set_number, ...patch }, { onConflict: 'workout_id,exercise_name,set_number' });
    if (error) throw error;
  },
  // Upserts de dieta/água/peso são idempotentes (mesma chave = mesmo efeito),
  // então basta reexecutar o mesmo upsert quando a fila é esvaziada.
  meal_log: async ({ userId, date, mealName, completed }) => {
    await upsertMealLog(userId, date, mealName, completed);
  },
  water_log: async ({ userId, date, amountMl }) => {
    await upsertWaterLog(userId, date, amountMl);
  },
  weight_log: async ({ userId, date, peso }) => {
    await upsertWeightLog(userId, date, peso);
  },
  // Add/edit/delete de alimentos não são upserts — add pode duplicar se a
  // escrita original na verdade tiver ido pro banco e só a resposta se
  // perdeu, mas isso é preferível a perder o registro do usuário de vez.
  food_log_add: async ({ userId, date, mealName, item }) => {
    await addFoodItem(userId, { date, mealName, ...item });
  },
  food_log_edit: async ({ id, userId, item }) => {
    await updateFoodItem(id, userId, item);
  },
  food_log_delete: async ({ id, userId }) => {
    await deleteFoodItem(id, userId);
  },
  meal_estimate_set: async ({ userId, date, meal }) => {
    await setMealEstimate(userId, date, meal);
  },
  meal_estimate_clear: async ({ userId, date, mealName }) => {
    await clearMealEstimate(userId, date, mealName);
  },
};

async function createExerciseLogs(workoutId, day) {
  if (!day) return;
  const rows = [
    ...day.exercicios.map(ex => ({ workout_id: workoutId, exercise_name: ex.nome, series: ex.series, reps: ex.reps, rest_time: ex.descanso, technique: ex.tecnica, is_post_workout: false })),
    ...day.pos.map(p => ({ workout_id: workoutId, exercise_name: p.nome, series: p.series, reps: p.reps, rest_time: p.descanso, technique: p.tecnica, is_post_workout: true })),
  ];
  if (!rows.length) return;
  const { error } = await db.from('exercise_logs').insert(rows);
  if (error) console.error('createExerciseLogs:', error);
}

async function ensureWorkoutId(userId, day) {
  const date = getDateForWeekday(day.dia);
  const { data: existing, error } = await db
    .from('workouts')
    .select('id, completed')
    .eq('user_id', userId)
    .eq('workout_date', date)
    .maybeSingle();
  if (error) throw error;

  if (existing) return existing.id;

  const { data: created, error: insErr } = await db
    .from('workouts')
    .insert({ user_id: userId, workout_date: date, day_of_week: day.dia, completed: false })
    .select()
    .single();
  if (insErr) throw insErr;
  await createExerciseLogs(created.id, day);
  return created.id;
}

export function WorkoutProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [workoutIds, setWorkoutIds] = useState({});
  const [activePlanDays, setActivePlanDays] = useState([]);
  const [syncStatus, setSyncStatus] = useState(() => (queueSize() > 0 ? 'pending' : 'ok'));
  const [dataVersion, setDataVersion] = useState(0);

  const flushPending = useCallback(async () => {
    const { remaining } = await flushQueue(SYNC_EXECUTORS);
    setSyncStatus(s => (remaining > 0 ? 'pending' : (s === 'pending' ? 'ok' : s)));
    return remaining;
  }, []);

  // Usado por páginas fora do fluxo de treino (dieta, perfil) para sinalizar
  // que enfileiraram uma escrita que falhou.
  const markPending = useCallback(() => setSyncStatus('pending'), []);

  useEffect(() => {
    if (!user) return;
    flushPending();
    window.addEventListener('online', flushPending);
    return () => window.removeEventListener('online', flushPending);
  }, [user, flushPending]);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    setSyncStatus('loading');
    try {
      const plan = await fetchActivePlan(user.id);
      const days = plan.days;

      const entries = await Promise.all(days.map(async (day) => {
        const wId = await ensureWorkoutId(user.id, day);

        const { data: w, error: wErr } = await db
          .from('workouts')
          .select('completed, started_at, finished_at, duration_seconds')
          .eq('id', wId)
          .single();
        if (wErr) throw wErr;

        const { data: sets, error: sErr } = await db
          .from('exercise_sets')
          .select('exercise_name, set_number, carga, completed, reps')
          .eq('workout_id', wId);
        if (sErr) throw sErr;

        return { dayName: day.dia, wId, completed: w.completed, sets, timer: w };
      }));

      const ids = {};
      entries.forEach(({ dayName, wId, completed, sets, timer }) => {
        ids[dayName] = wId;
        localStorage.setItem(`treino_${dayName}`, completed);
        sets.forEach(s => {
          localStorage.setItem(`set_${s.exercise_name}_${s.set_number}_carga`, s.carga ?? '');
          localStorage.setItem(`set_${s.exercise_name}_${s.set_number}_done`, s.completed);
          localStorage.setItem(`set_${s.exercise_name}_${s.set_number}_reps`, s.reps ?? '');
        });
        if (timer.duration_seconds != null) {
          localStorage.setItem(`treino_${dayName}_timer`, JSON.stringify({
            status: 'finished',
            accumulatedMs: timer.duration_seconds * 1000,
            runningSince: null,
            startedAt: timer.started_at ? new Date(timer.started_at).getTime() : null,
            finishedAt: timer.finished_at ? new Date(timer.finished_at).getTime() : null,
          }));
        }
      });

      setActivePlanDays(days);
      setWorkoutIds(ids);
      setSyncStatus('ok');
      setDataVersion(v => v + 1);
    } catch (err) {
      console.error('loadUserData:', err);
      setSyncStatus('error');
      toast('⚠️ Erro ao sincronizar dados');
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) loadUserData();
    else { setWorkoutIds({}); setActivePlanDays([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function findDay(dayName) {
    return activePlanDays.find(d => d.dia === dayName);
  }

  async function saveWorkoutStatus(dayName, completed) {
    if (!user) return;
    let wId;
    try {
      wId = workoutIds[dayName] || await ensureWorkoutId(user.id, findDay(dayName));
      if (!workoutIds[dayName]) setWorkoutIds(ids => ({ ...ids, [dayName]: wId }));
      const { error } = await db.from('workouts').update({ completed }).eq('id', wId);
      if (error) throw error;
    } catch (err) {
      console.error('saveWorkoutStatus:', err);
      if (wId) {
        enqueue('workout_status', { id: wId, completed });
      } else {
        enqueue('workout_status_by_day', { userId: user.id, day: findDay(dayName), completed });
      }
      setSyncStatus('pending');
    }
  }

  async function saveWorkoutTimer(dayName, { startedAt, finishedAt, durationSeconds }) {
    if (!user) return;
    let wId;
    const payload = {
      started_at: startedAt ? new Date(startedAt).toISOString() : null,
      finished_at: finishedAt ? new Date(finishedAt).toISOString() : null,
      duration_seconds: durationSeconds ?? null,
    };
    try {
      wId = workoutIds[dayName] || await ensureWorkoutId(user.id, findDay(dayName));
      if (!workoutIds[dayName]) setWorkoutIds(ids => ({ ...ids, [dayName]: wId }));
      const { error } = await db.from('workouts').update(payload).eq('id', wId);
      if (error) throw error;
    } catch (err) {
      console.error('saveWorkoutTimer:', err);
      if (wId) {
        enqueue('workout_timer', { id: wId, ...payload });
      } else {
        enqueue('workout_timer_by_day', { userId: user.id, day: findDay(dayName), ...payload });
      }
      setSyncStatus('pending');
    }
  }

  async function saveSetState(dayName, exerciseName, setNumber, patch) {
    if (!user) return;
    let wId;
    try {
      wId = workoutIds[dayName] || await ensureWorkoutId(user.id, findDay(dayName));
      if (!workoutIds[dayName]) setWorkoutIds(ids => ({ ...ids, [dayName]: wId }));
      const { error } = await db
        .from('exercise_sets')
        .upsert(
          { workout_id: wId, exercise_name: exerciseName, set_number: setNumber, ...patch },
          { onConflict: 'workout_id,exercise_name,set_number' }
        );
      if (error) throw error;
      return wId;
    } catch (err) {
      console.error('saveSetState:', err);
      if (wId) {
        enqueue('set_state', { workout_id: wId, exercise_name: exerciseName, set_number: setNumber, patch });
      } else {
        enqueue('set_state_by_day', { userId: user.id, day: findDay(dayName), exercise_name: exerciseName, set_number: setNumber, patch });
      }
      setSyncStatus('pending');
      return wId;
    }
  }

  async function syncNow() {
    const remaining = await flushPending();
    await loadUserData();
    toast(remaining > 0 ? '⚠️ Algumas alterações ainda não sincronizaram' : '✅ Dados sincronizados');
  }

  return (
    <WorkoutContext.Provider value={{ syncStatus, dataVersion, activePlanDays, workoutIds, saveWorkoutStatus, saveSetState, saveWorkoutTimer, syncNow, markPending, refreshPlan: loadUserData }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  return useContext(WorkoutContext);
}
