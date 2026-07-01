import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { db } from '../lib/supabase';
import { treinoData, TODAY_NAME, TODAY_DATE } from '../data/treinoData';
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

export function WorkoutProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [workoutId, setWorkoutId] = useState(null);
  const [syncStatus, setSyncStatus] = useState('ok');
  const [dataVersion, setDataVersion] = useState(0);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    setSyncStatus('loading');
    try {
      const { data: existing, error } = await db
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('workout_date', TODAY_DATE)
        .maybeSingle();
      if (error) throw error;

      let wId;
      if (existing) {
        wId = existing.id;
        localStorage.setItem(`treino_${TODAY_NAME}`, existing.completed);

        const { data: sets, error: sErr } = await db
          .from('exercise_sets')
          .select('exercise_name, set_number, carga, completed')
          .eq('workout_id', wId);
        if (sErr) throw sErr;
        sets.forEach(s => {
          localStorage.setItem(`set_${s.exercise_name}_${s.set_number}_carga`, s.carga ?? '');
          localStorage.setItem(`set_${s.exercise_name}_${s.set_number}_done`, s.completed);
        });
      } else {
        const { data: created, error: err2 } = await db
          .from('workouts')
          .insert({ user_id: user.id, workout_date: TODAY_DATE, day_of_week: TODAY_NAME, completed: false })
          .select()
          .single();
        if (err2) throw err2;
        wId = created.id;
        await createExerciseLogs(wId, TODAY_NAME);
      }

      setWorkoutId(wId);
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
    else setWorkoutId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function saveWorkoutStatus(completed) {
    if (!user || !workoutId) return;
    const { error } = await db.from('workouts').update({ completed }).eq('id', workoutId);
    if (error) console.error(error);
  }

  async function saveSetState(exerciseName, setNumber, patch) {
    if (!user || !workoutId) return;
    const { error } = await db
      .from('exercise_sets')
      .upsert(
        { workout_id: workoutId, exercise_name: exerciseName, set_number: setNumber, ...patch },
        { onConflict: 'workout_id,exercise_name,set_number' }
      );
    if (error) console.error(error);
  }

  async function syncNow() {
    await loadUserData();
    toast('✅ Dados sincronizados');
  }

  return (
    <WorkoutContext.Provider value={{ workoutId, syncStatus, dataVersion, saveWorkoutStatus, saveSetState, syncNow }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  return useContext(WorkoutContext);
}
