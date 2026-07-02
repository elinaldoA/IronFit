import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { db } from '../lib/supabase';
import { treinoData } from '../data/treinoData';
import { getDateForWeekday } from '../lib/utils';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const WorkoutContext = createContext(null);

async function createExerciseLogs(workoutId, dayName) {
  const day = treinoData.find(d => d.dia === dayName);
  if (!day) return;
  const rows = [
    ...day.exercicios.map(ex => ({ workout_id: workoutId, exercise_name: ex.nome, series: ex.series, reps: ex.reps, rest_time: ex.descanso, technique: ex.tecnica, is_post_workout: false })),
    ...day.pos.map(p => ({ workout_id: workoutId, exercise_name: p.nome, series: '-', reps: '-', rest_time: '-', technique: p.detalhe, is_post_workout: true })),
  ];
  const { error } = await db.from('exercise_logs').insert(rows);
  if (error) console.error('createExerciseLogs:', error);
}

async function ensureWorkoutId(userId, dayName) {
  const date = getDateForWeekday(dayName);
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
    .insert({ user_id: userId, workout_date: date, day_of_week: dayName, completed: false })
    .select()
    .single();
  if (insErr) throw insErr;
  await createExerciseLogs(created.id, dayName);
  return created.id;
}

export function WorkoutProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [workoutIds, setWorkoutIds] = useState({});
  const [syncStatus, setSyncStatus] = useState('ok');
  const [dataVersion, setDataVersion] = useState(0);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    setSyncStatus('loading');
    try {
      const entries = await Promise.all(treinoData.map(async (day) => {
        const wId = await ensureWorkoutId(user.id, day.dia);

        const { data: w, error: wErr } = await db
          .from('workouts')
          .select('completed, started_at, finished_at, duration_seconds')
          .eq('id', wId)
          .single();
        if (wErr) throw wErr;

        const { data: sets, error: sErr } = await db
          .from('exercise_sets')
          .select('exercise_name, set_number, carga, completed')
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
    else setWorkoutIds({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function saveWorkoutStatus(dayName, completed) {
    if (!user) return;
    try {
      const wId = workoutIds[dayName] || await ensureWorkoutId(user.id, dayName);
      if (!workoutIds[dayName]) setWorkoutIds(ids => ({ ...ids, [dayName]: wId }));
      const { error } = await db.from('workouts').update({ completed }).eq('id', wId);
      if (error) throw error;
    } catch (err) {
      console.error('saveWorkoutStatus:', err);
    }
  }

  async function saveWorkoutTimer(dayName, { startedAt, finishedAt, durationSeconds }) {
    if (!user) return;
    try {
      const wId = workoutIds[dayName] || await ensureWorkoutId(user.id, dayName);
      if (!workoutIds[dayName]) setWorkoutIds(ids => ({ ...ids, [dayName]: wId }));
      const { error } = await db.from('workouts').update({
        started_at: startedAt ? new Date(startedAt).toISOString() : null,
        finished_at: finishedAt ? new Date(finishedAt).toISOString() : null,
        duration_seconds: durationSeconds ?? null,
      }).eq('id', wId);
      if (error) throw error;
    } catch (err) {
      console.error('saveWorkoutTimer:', err);
    }
  }

  async function saveSetState(dayName, exerciseName, setNumber, patch) {
    if (!user) return;
    try {
      const wId = workoutIds[dayName] || await ensureWorkoutId(user.id, dayName);
      if (!workoutIds[dayName]) setWorkoutIds(ids => ({ ...ids, [dayName]: wId }));
      const { error } = await db
        .from('exercise_sets')
        .upsert(
          { workout_id: wId, exercise_name: exerciseName, set_number: setNumber, ...patch },
          { onConflict: 'workout_id,exercise_name,set_number' }
        );
      if (error) throw error;
    } catch (err) {
      console.error('saveSetState:', err);
    }
  }

  async function syncNow() {
    await loadUserData();
    toast('✅ Dados sincronizados');
  }

  return (
    <WorkoutContext.Provider value={{ syncStatus, dataVersion, saveWorkoutStatus, saveSetState, saveWorkoutTimer, syncNow }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  return useContext(WorkoutContext);
}
