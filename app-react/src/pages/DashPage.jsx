import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/supabase';
import { treinoData, TODAY_NAME, TODAY_DATE, getMuscleGroupsForDay } from '../data/treinoData';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fmtDate } from '../lib/utils';
import BodyAvatar from '../components/BodyAvatar';
import LineChart from '../components/LineChart';

function Heatmap({ workouts }) {
  const dateMap = {};
  workouts.forEach(w => { dateMap[w.workout_date] = w.completed ? 'done' : 'miss'; });

  const today = new Date(TODAY_DATE);
  const todayDow = today.getDay();
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - (todayDow === 0 ? 6 : todayDow - 1));
  const startMonday = new Date(currentMonday);
  startMonday.setDate(currentMonday.getDate() - 28);

  const cells = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isFuture = d > today;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    let c = 'none';
    if (isFuture) c = 'future';
    else if (dateMap[dateStr] === 'done') c = 'done';
    else if (dateMap[dateStr] === 'miss') c = 'miss';
    else if (isWeekend) c = 'rest';

    cells.push({ dateStr, c });
  }

  return (
    <div className="heatmap" id="dashHeatmap">
      {cells.map(cell => (
        <div key={cell.dateStr} className={`heatmap-cell heatmap-cell--${cell.c}`} title={cell.dateStr} />
      ))}
    </div>
  );
}

function WeeklyBars({ workouts }) {
  const today = new Date(TODAY_DATE);
  const todayDow = today.getDay();
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - (todayDow === 0 ? 6 : todayDow - 1));

  const buckets = [];
  for (let w = 7; w >= 0; w--) {
    const mon = new Date(currentMonday);
    mon.setDate(currentMonday.getDate() - w * 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const mStr = mon.toISOString().split('T')[0];
    const sStr = sun.toISOString().split('T')[0];
    const label = w === 0 ? 'Esta' : w === 1 ? 'Ant.' :
      `${String(mon.getDate()).padStart(2, '0')}/${String(mon.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ mStr, sStr, label, done: 0 });
  }

  workouts.filter(w => w.completed).forEach(w => {
    const b = buckets.find(b => w.workout_date >= b.mStr && w.workout_date <= b.sStr);
    if (b) b.done++;
  });

  return (
    <div className="bar-chart" id="dashBarChart">
      {buckets.map(b => (
        <div className="bar-col" key={b.label + b.mStr}>
          <div className="bar-col__wrap">
            <div className="bar-col__fill" style={{ height: `${Math.round((b.done / 5) * 100)}%` }} />
          </div>
          <span className="bar-col__val">{b.done}</span>
          <span className="bar-col__label">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function PRList({ logs }) {
  if (!logs.length) {
    return <p className="dash-empty">Nenhuma carga registrada ainda. Registre cargas na aba Treino.</p>;
  }

  const prMap = {};
  logs.forEach(log => {
    const val = parseFloat(log.carga);
    if (isNaN(val)) return;
    if (!prMap[log.exercise_name] || val > prMap[log.exercise_name].val) {
      prMap[log.exercise_name] = { val, date: log.workout_date };
    }
  });

  const sorted = Object.entries(prMap).sort((a, b) => b[1].val - a[1].val).slice(0, 12);
  if (!sorted.length) return <p className="dash-empty">Nenhuma carga numérica registrada ainda.</p>;

  return (
    <div id="dashPRList" className="pr-list">
      {sorted.map(([name, { val, date }]) => (
        <div className="pr-row" key={name}>
          <div className="pr-row__name">{name}</div>
          <div className="pr-row__right">
            <span className="pr-row__val">{val}kg</span>
            <span className="pr-row__date">{fmtDate(date)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashPage({ active }) {
  const { user } = useAuth();
  const toast = useToast();
  const [workouts, setWorkouts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [loading, setLoading] = useState(false);

  const day = treinoData.find(d => d.dia === TODAY_NAME);
  const activeGroups = day ? getMuscleGroupsForDay(day) : new Set();

  useEffect(() => {
    if (!active || !user || loading) return;

    async function loadDashboard() {
      setLoading(true);
      try {
        const since = new Date();
        since.setDate(since.getDate() - 59);
        const sinceStr = since.toISOString().split('T')[0];

        const { data: w, error: wErr } = await db
          .from('workouts')
          .select('id, workout_date, completed')
          .eq('user_id', user.id)
          .gte('workout_date', sinceStr)
          .order('workout_date', { ascending: true });
        if (wErr) throw wErr;
        setWorkouts(w || []);

        const ids = (w || []).map(x => x.id);
        if (ids.length > 0) {
          const { data: sets, error: sErr } = await db
            .from('exercise_sets')
            .select('exercise_name, carga, workout_id')
            .in('workout_id', ids)
            .eq('completed', true)
            .not('carga', 'is', null);
          if (sErr) throw sErr;

          const dateMap = Object.fromEntries((w || []).map(x => [x.id, x.workout_date]));
          setLogs((sets || []).map(s => ({ ...s, workout_date: dateMap[s.workout_id] })));
        } else {
          setLogs([]);
        }
      } catch (err) {
        console.error('loadDashboard:', err);
        toast('⚠️ Erro ao carregar evolução');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, user]);

  const exercises = useMemo(
    () => [...new Set(logs.filter(l => !isNaN(parseFloat(l.carga))).map(l => l.exercise_name))].sort(),
    [logs]
  );

  const volumePoints = useMemo(() => {
    const totals = {};
    logs.forEach(l => {
      const val = parseFloat(l.carga);
      if (isNaN(val)) return;
      totals[l.workout_date] = (totals[l.workout_date] || 0) + val;
    });
    return Object.keys(totals).sort().map(date => ({ value: totals[date], label: fmtDate(date) }));
  }, [logs]);

  const loadPoints = useMemo(() => {
    if (!selectedExercise) return [];
    return logs
      .filter(l => l.exercise_name === selectedExercise && !isNaN(parseFloat(l.carga)))
      .sort((a, b) => a.workout_date.localeCompare(b.workout_date))
      .map(l => ({ value: parseFloat(l.carga), label: fmtDate(l.workout_date) }));
  }, [logs, selectedExercise]);

  return (
    <section id="page-dash" className="page active">
      <div className="dash-card">
        <div className="dash-card__title">Grupos trabalhados hoje</div>
        <div className="dash-card__subtitle">{day ? day.foco : '–'}</div>
        <BodyAvatar activeGroups={activeGroups} />
      </div>

      <div className="dash-card">
        <div className="dash-card__title">Volume total por treino</div>
        <p className="dash-card__subtitle">Soma das cargas de todas as séries concluídas em cada treino</p>
        <div className="line-chart-wrap">
          <LineChart
            points={volumePoints}
            valueSuffix="kg"
            singleMsg={v => `1 treino registrado: ${v}kg — treine mais vezes para ver a evolução`}
            emptyMsg="Nenhum volume registrado ainda. Marque séries como concluídas na aba Treino."
          />
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card__title">Últimos 35 dias</div>
        <div className="heatmap-wrap">
          <div className="heatmap-days">
            <span>Seg</span><span>Ter</span><span>Qua</span>
            <span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
          </div>
          <Heatmap workouts={workouts} />
        </div>
        <div className="heatmap-legend">
          <span className="heatmap-legend__dot heatmap-legend__dot--done" /><span>Concluído</span>
          <span className="heatmap-legend__dot heatmap-legend__dot--miss" /><span>Não feito</span>
          <span className="heatmap-legend__dot heatmap-legend__dot--none" /><span>Sem registro</span>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card__title">Treinos concluídos por semana</div>
        <WeeklyBars workouts={workouts} />
      </div>

      <div className="dash-card">
        <div className="dash-card__title">Evolução de carga</div>
        <select className="input input--sm" value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}>
          <option value="">Selecione um exercício</option>
          {exercises.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        <div className="line-chart-wrap">
          <LineChart
            points={loadPoints}
            valueSuffix="kg"
            singleMsg={v => `1 registro: ${v}kg — treine mais vezes para ver a evolução`}
            emptyMsg={selectedExercise ? 'Nenhum registro para este exercício' : 'Selecione um exercício com carga registrada'}
          />
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card__title">Recordes pessoais — maior carga</div>
        <PRList logs={logs} />
      </div>
    </section>
  );
}
