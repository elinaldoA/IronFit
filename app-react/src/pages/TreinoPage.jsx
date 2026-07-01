import { useEffect, useRef, useState } from 'react';
import { treinoData, TODAY_NAME } from '../data/treinoData';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { useToast } from '../context/ToastContext';

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

function SetRow({ ex, n, day, bump }) {
  const { user } = useAuth();
  const { saveSetState } = useWorkout();
  const [carga, setCarga] = useState(() => localStorage.getItem(`set_${ex.nome}_${n}_carga`) || '');
  const [done, setDone] = useState(() => localStorage.getItem(`set_${ex.nome}_${n}_done`) === 'true');
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef(null);

  function handleInput(e) {
    const val = e.target.value;
    setCarga(val);
    localStorage.setItem(`set_${ex.nome}_${n}_carga`, val);
    bump();
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (user) {
        await saveSetState(ex.nome, n, { carga: val === '' ? null : parseFloat(val) });
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
    if (user) await saveSetState(ex.nome, n, { completed: next });
  }

  return (
    <div className="set-row">
      <span className="set-row__label">Série {n}</span>
      <input
        className={`set-row__carga${saved ? ' saved' : ''}`}
        type="text" inputMode="decimal" placeholder="kg" autoComplete="off"
        value={carga} onChange={handleInput}
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

function DayCard({ day, isToday, bump }) {
  const { user } = useAuth();
  const { saveWorkoutStatus } = useWorkout();
  const toast = useToast();
  const [open, setOpen] = useState(isToday);
  const [checked, setChecked] = useState(() => localStorage.getItem(`treino_${day.dia}`) === 'true');

  async function handleCheckbox(e) {
    e.stopPropagation();
    const next = e.target.checked;
    setChecked(next);
    localStorage.setItem(`treino_${day.dia}`, next);
    bump();
    toast(next ? '✅ Treino marcado!' : 'Treino desmarcado');
    if (user && isToday) await saveWorkoutStatus(next);
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
          <span className="day-card__count">{day.exercicios.length} exerc.</span>
          <span className="chevron">▼</span>
        </div>
      </div>

      <div className={`day-card__body${open ? ' open' : ''}`}>
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
          return (
            <div className="ex-block" key={ex.nome}>
              <div className="ex-block__header">
                <span className="ex-name">{ex.nome}</span>
                <span className="ex-block__meta">{ex.reps} reps · desc. {ex.descanso}</span>
              </div>
              <div className="ex-block__sets">
                {Array.from({ length: setCount }, (_, i) => i + 1).map(n => (
                  <SetRow key={n} ex={ex} n={n} day={day} bump={bump} />
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
  const { dataVersion, syncNow } = useWorkout();
  const [tick, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);

  const workDays = treinoData.filter(d => d.dia !== 'Sábado' && d.dia !== 'Domingo');
  const done = workDays.filter(d => localStorage.getItem(`treino_${d.dia}`) === 'true').length;
  const total = workDays.length;

  function handleReset() {
    if (!window.confirm('Limpar todos os checks e cargas salvas?')) return;
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('treino_') || k.startsWith('carga_') || k.startsWith('set_')) localStorage.removeItem(k);
    });
    bump();
    if (user) syncNow();
  }

  return (
    <section id="page-treino" className="page active">
      <div className="progress-card">
        <div className="progress-card__row">
          <span className="progress-card__label">Semana atual</span>
          <span className="progress-card__count">{done}/{total} treinos</span>
        </div>
        <div className="progress-card__bar">
          <div className="progress-card__fill" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>
      <div className="toolbar">
        <p className="toolbar__hint">Marque os treinos · salva automático</p>
        <button className="btn btn--ghost btn--sm" onClick={handleReset}>Limpar</button>
      </div>
      <div id="treinoContainer">
        <div className="accordion" key={dataVersion}>
          {treinoData.map(day => (
            <DayCard key={day.dia} day={day} isToday={day.dia === TODAY_NAME} bump={bump} />
          ))}
        </div>
      </div>
      <footer className="footer">
        <strong>Progressão:</strong> aumente cargas toda semana &nbsp;·&nbsp; <strong>Deload</strong> na semana 6
      </footer>
    </section>
  );
}
