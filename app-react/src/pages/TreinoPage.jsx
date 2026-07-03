import { useRef, useState } from 'react';
import { TODAY_NAME } from '../data/treinoData';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { useToast } from '../context/ToastContext';
import { parseRestSeconds, getDateForWeekday, formatDuration } from '../lib/utils';
import { db } from '../lib/supabase';
import { playWorkoutFinishedSound } from '../lib/sound';
import { checkForNewPR } from '../lib/records';
import RestTimer from '../components/RestTimer';
import PlanEditorModal from '../components/PlanEditorModal';
import WorkoutSummaryModal from '../components/WorkoutSummaryModal';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';

function calcDayTotalCarga(day) {
  let total = 0;
  day.exercicios.forEach(ex => {
    const count = parseInt(ex.series, 10);
    if (!count) return;
    for (let n = 1; n <= count; n++) {
      const done = localStorage.getItem(`set_${ex.nome}_${n}_done`) === 'true';
      const carga = parseFloat(localStorage.getItem(`set_${ex.nome}_${n}_carga`));
      if (done && !isNaN(carga)) total += carga;
    }
  });
  return total;
}

function gatherExerciseDetails(day) {
  return day.exercicios
    .map(ex => {
      const count = parseInt(ex.series, 10) || 0;
      const sets = Array.from({ length: count }, (_, i) => {
        const n = i + 1;
        return {
          n,
          done: localStorage.getItem(`set_${ex.nome}_${n}_done`) === 'true',
          carga: localStorage.getItem(`set_${ex.nome}_${n}_carga`) || null,
          reps: localStorage.getItem(`set_${ex.nome}_${n}_reps`) || null,
        };
      });
      return { nome: ex.nome, sets };
    })
    .filter(ex => ex.sets.length > 0);
}

function countSets(exercises) {
  let done = 0, total = 0;
  exercises.forEach(ex => ex.sets.forEach(s => { total++; if (s.done) done++; }));
  return { done, total };
}

function SetRow({ ex, n, day, bump, onRestStart }) {
  const { user } = useAuth();
  const { saveSetState, workoutIds } = useWorkout();
  const toast = useToast();
  const [carga, setCarga] = useState(() => localStorage.getItem(`set_${ex.nome}_${n}_carga`) || '');
  const [reps, setReps] = useState(() => localStorage.getItem(`set_${ex.nome}_${n}_reps`) || '');
  const [done, setDone] = useState(() => localStorage.getItem(`set_${ex.nome}_${n}_done`) === 'true');
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef(null);

  function handleCargaInput(e) {
    const val = e.target.value;
    setCarga(val);
    localStorage.setItem(`set_${ex.nome}_${n}_carga`, val);
    bump();
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (user) {
        await saveSetState(day.dia, ex.nome, n, { carga: val === '' ? null : parseFloat(val) });
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
      }
    }, 800);
  }

  function handleRepsInput(e) {
    const val = e.target.value;
    setReps(val);
    localStorage.setItem(`set_${ex.nome}_${n}_reps`, val);
    bump();
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (user) {
        await saveSetState(day.dia, ex.nome, n, { reps: val === '' ? null : parseFloat(val) });
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
      }
    }, 800);
  }

  async function handleCheck() {
    const next = !done;
    setDone(next);
    localStorage.setItem(`set_${ex.nome}_${n}_done`, next);
    bump();
    if (next) {
      const restSeconds = parseRestSeconds(ex.descanso);
      if (restSeconds > 0) onRestStart(ex.nome, restSeconds);
    }
    if (user) {
      const wId = await saveSetState(day.dia, ex.nome, n, { completed: next });
      if (next) {
        const cargaNum = parseFloat(carga);
        if (Number.isFinite(cargaNum)) {
          try {
            const pr = await checkForNewPR(user.id, ex.nome, cargaNum, reps, {
              workoutId: wId ?? workoutIds[day.dia], setNumber: n,
            });
            if (pr) toast(`🏆 Novo recorde em ${ex.nome}!`);
          } catch (err) {
            console.error('checkForNewPR:', err);
          }
        }
      }
    }
  }

  return (
    <div className="set-row">
      <span className="set-row__label">Série {n}</span>
      <input
        className={`set-row__carga${saved ? ' saved' : ''}`}
        type="text" inputMode="decimal" placeholder="kg" autoComplete="off"
        value={carga} onChange={handleCargaInput}
      />
      <input
        className={`set-row__carga${saved ? ' saved' : ''}`}
        type="text" inputMode="numeric" placeholder="reps" autoComplete="off"
        value={reps} onChange={handleRepsInput}
      />
      <button
        type="button"
        className={`set-row__check${done ? ' set-row__check--done' : ''}`}
        aria-pressed={done}
        onClick={handleCheck}
      >✓</button>
    </div>
  );
}

function allSetsDone(ex, setCount) {
  for (let n = 1; n <= setCount; n++) {
    if (localStorage.getItem(`set_${ex.nome}_${n}_done`) !== 'true') return false;
  }
  return true;
}

function DayCard({ day, isToday, bump, onRestStart, onFinish }) {
  const { user } = useAuth();
  const { saveWorkoutStatus, saveSetState, saveWorkoutTimer, activePlanDays } = useWorkout();
  const toast = useToast();
  const [open, setOpen] = useState(isToday);
  const [checked, setChecked] = useState(() => localStorage.getItem(`treino_${day.dia}`) === 'true');
  const [markVersions, setMarkVersions] = useState({});
  const timer = useWorkoutTimer(day.dia);

  async function markDone(next) {
    setChecked(next);
    localStorage.setItem(`treino_${day.dia}`, next);
    if (user) await saveWorkoutStatus(day.dia, next);
  }

  function handleResetTimer() {
    timer.reset();
    if (user) saveWorkoutTimer(day.dia, { startedAt: null, finishedAt: null, durationSeconds: null });
  }

  function handleStartWorkout() {
    const startedAt = timer.start();
    if (user) saveWorkoutTimer(day.dia, { startedAt, finishedAt: null, durationSeconds: null });
  }

  function handleFinishWorkout() {
    const result = timer.finish();
    if (!result) return;
    const { accumulatedMs, startedAt, finishedAt } = result;
    playWorkoutFinishedSound();
    toast(`🏁 Treino finalizado em ${formatDuration(accumulatedMs)}!`);
    if (!checked) markDone(true);
    if (user) saveWorkoutTimer(day.dia, { startedAt, finishedAt, durationSeconds: Math.round(accumulatedMs / 1000) });
    bump();

    const exercises = gatherExerciseDetails(day);
    const { done: totalSetsDone, total: totalPlannedSets } = countSets(exercises);
    const workDays = activePlanDays.filter(d => d.dia !== 'Sábado' && d.dia !== 'Domingo');
    const weekDone = workDays.filter(d => localStorage.getItem(`treino_${d.dia}`) === 'true').length;
    onFinish({
      day, durationMs: accumulatedMs, totalCarga: calcDayTotalCarga(day),
      exercises, totalSetsDone, totalPlannedSets, weekDone, weekTotal: workDays.length,
    });
  }

  async function toggleAllSets(ex, setCount) {
    const next = !allSetsDone(ex, setCount);
    for (let n = 1; n <= setCount; n++) {
      localStorage.setItem(`set_${ex.nome}_${n}_done`, next);
    }
    setMarkVersions(v => ({ ...v, [ex.nome]: (v[ex.nome] || 0) + 1 }));
    bump();
    toast(next ? '✅ Todas as séries marcadas!' : 'Séries desmarcadas');
    if (user) {
      await Promise.all(
        Array.from({ length: setCount }, (_, i) => i + 1)
          .map(n => saveSetState(day.dia, ex.nome, n, { completed: next }))
      );
    }
  }

  async function handleCheckbox(e) {
    e.stopPropagation();
    const next = e.target.checked;
    setChecked(next);
    localStorage.setItem(`treino_${day.dia}`, next);
    bump();
    toast(next ? '✅ Treino marcado!' : 'Treino desmarcado');
    if (user) await saveWorkoutStatus(day.dia, next);
  }

  return (
    <div className={`day-card${isToday ? ' day-card--today' : ''}`}>
      <div className={`day-card__header${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)}>
        <div className="day-card__left">
          <input
            type="checkbox" className="day-card__check"
            checked={checked} onChange={handleCheckbox} onClick={e => e.stopPropagation()}
          />
          <span className="day-card__indicator">{checked ? '✅' : '⬜'}</span>
          <div className="day-card__info">
            <div className="day-card__name">{day.dia}</div>
            <div className="day-card__focus">{day.foco}</div>
          </div>
        </div>
        <div className="day-card__right">
          {isToday && <span className="today-badge">Hoje</span>}
          {(timer.status === 'running' || timer.status === 'paused') && (
            <span className={`timer-badge${timer.status === 'paused' ? ' timer-badge--paused' : ''}`}>
              {timer.status === 'paused' ? '⏸' : '⏱'} {formatDuration(timer.elapsedMs)}
            </span>
          )}
          <span className="day-card__count">{day.exercicios.length} exerc.</span>
          <span className="chevron">▼</span>
        </div>
      </div>

      <div className={`day-card__body${open ? ' open' : ''}`}>
        <div className="session-timer">
          <div className="session-timer__clock">
            {formatDuration(timer.elapsedMs)}
            {timer.status === 'finished' && <span className="session-timer__done"> · concluído</span>}
          </div>
          <div className="session-timer__actions">
            {timer.status === 'idle' && (
              <button type="button" className="btn btn--primary btn--sm" onClick={handleStartWorkout}>▶ Iniciar treino</button>
            )}
            {timer.status === 'running' && (
              <>
                <button type="button" className="btn btn--outline btn--sm" onClick={timer.pause}>⏸ Pausar</button>
                <button type="button" className="btn btn--primary btn--sm" onClick={handleFinishWorkout}>🏁 Finalizar</button>
              </>
            )}
            {timer.status === 'paused' && (
              <>
                <button type="button" className="btn btn--outline btn--sm" onClick={timer.resume}>▶ Continuar</button>
                <button type="button" className="btn btn--primary btn--sm" onClick={handleFinishWorkout}>🏁 Finalizar</button>
              </>
            )}
            {timer.status === 'finished' && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleResetTimer}>↺ Refazer treino</button>
            )}
          </div>
        </div>

        <div className="day-card__total">
          Carga total do treino: {calcDayTotalCarga(day).toLocaleString('pt-BR')} kg
        </div>

        {day.exercicios.map(ex => {
          const setCount = parseInt(ex.series, 10);
          if (!setCount) {
            return (
              <div className="ex-block" key={ex.nome}>
                <div className="ex-block__header">
                  <span className="ex-name">{ex.nome}</span>
                  <span className="ex-block__meta">{ex.reps}</span>
                </div>
              </div>
            );
          }
          const version = markVersions[ex.nome] || 0;
          const allDone = allSetsDone(ex, setCount);
          return (
            <div className="ex-block" key={ex.nome}>
              <div className="ex-block__header">
                <div className="ex-block__titles">
                  <span className="ex-name">{ex.nome}</span>
                  <span className="ex-block__meta">{ex.reps} reps · desc. {ex.descanso}</span>
                </div>
                <button
                  type="button"
                  className={`ex-block__mark-all${allDone ? ' ex-block__mark-all--done' : ''}`}
                  onClick={() => toggleAllSets(ex, setCount)}
                >
                  {allDone ? '✓ Todas' : 'Marcar todas'}
                </button>
              </div>
              <div className="ex-block__sets">
                {Array.from({ length: setCount }, (_, i) => i + 1).map(n => (
                  <SetRow key={`${n}-${version}`} ex={ex} n={n} day={day} bump={bump} onRestStart={onRestStart} />
                ))}
              </div>
            </div>
          );
        })}

        {day.pos.length > 0 && (
          <div className="post-section">
            <div className="post-title">🏁 Pós-treino — Cardio + Abdômen</div>
            {day.pos.map(p => (
              <div className="post-row" key={p.nome}>
                <div className="post-row__name">{p.nome}</div>
                <div className="post-row__detail">{p.detalhe}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TreinoPage() {
  const { user } = useAuth();
  const { dataVersion, syncStatus, syncNow, activePlanDays } = useWorkout();
  const loading = syncStatus === 'loading';
  const [tick, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);
  const [restSession, setRestSession] = useState(null);
  const restKey = useRef(0);
  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [summary, setSummary] = useState(null);

  function handleRestStart(label, seconds) {
    restKey.current += 1;
    setRestSession({ key: restKey.current, label, seconds });
  }

  const workDays = activePlanDays.filter(d => d.dia !== 'Sábado' && d.dia !== 'Domingo');
  const done = workDays.filter(d => localStorage.getItem(`treino_${d.dia}`) === 'true').length;
  const total = workDays.length;

  async function handleReset() {
    if (!window.confirm('Limpar todos os checks e cargas salvas?')) return;
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('treino_') || k.startsWith('carga_') || k.startsWith('set_')) localStorage.removeItem(k);
    });
    bump();
    if (user) {
      try {
        const dates = activePlanDays.map(d => getDateForWeekday(d.dia));
        const { error } = await db.from('workouts').delete().eq('user_id', user.id).in('workout_date', dates);
        if (error) throw error;
        await syncNow();
        toast('🧹 Checks e cargas limpos');
      } catch (err) {
        console.error('resetWorkouts:', err);
        toast('⚠️ Limpou localmente, mas falhou ao sincronizar com o servidor — pode voltar ao reabrir o app');
      }
    }
  }

  return (
    <section id="page-treino" className="page active">
      <div className="progress-card">
        <div className="progress-card__row">
          <span className="progress-card__label">Semana atual</span>
          <span className="progress-card__count">{done}/{total} treinos</span>
        </div>
        <div className="progress-card__bar">
          <div className="progress-card__fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>
      <div className="toolbar">
        <p className="toolbar__hint">
          {loading ? 'Carregando dados salvos…' : 'Marque os treinos · salva automático'}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--ghost btn--sm" onClick={() => setShowPlanEditor(true)}>⚙️ Editar treino</button>
          <button className="btn btn--ghost btn--sm" onClick={handleReset} disabled={loading}>Limpar</button>
        </div>
      </div>
      <div id="treinoContainer">
        <div className={`accordion${loading ? ' accordion--loading' : ''}`} key={dataVersion}>
          {activePlanDays.map(day => (
            <DayCard key={day.dia} day={day} isToday={day.dia === TODAY_NAME} bump={bump} onRestStart={handleRestStart} onFinish={setSummary} />
          ))}
        </div>
      </div>
      <footer className="footer">
        <strong>Progressão:</strong> aumente cargas toda semana &nbsp;·&nbsp; <strong>Deload</strong> na semana 6
      </footer>
      {restSession && (
        <RestTimer session={restSession} onClose={() => setRestSession(null)} />
      )}
      {showPlanEditor && (
        <PlanEditorModal onClose={() => setShowPlanEditor(false)} />
      )}
      {summary && (
        <WorkoutSummaryModal summary={summary} onClose={() => setSummary(null)} />
      )}
    </section>
  );
}
