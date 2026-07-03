import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../lib/supabase';
import { TODAY_NAME, TODAY_DATE, getMuscleGroupsForDay, getWeeklyGoal } from '../data/treinoData';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { useToast } from '../context/ToastContext';
import { fmtDate, parseLocalDate, toDateStr, getWeekStart, calcStreak } from '../lib/utils';
import { estimateOneRepMax } from '../lib/records';
import { fetchFoodLogsRange, countFoodLogs } from '../lib/foodLog';
import { countPhotos } from '../lib/progressPhotos';
import { fetchRecipes } from '../lib/recipes';
import { fetchWeightLogs } from '../lib/weightLog';
import { BADGES, syncAchievements } from '../lib/achievements';
import BodyAvatar from '../components/BodyAvatar';
import LineChart from '../components/LineChart';
import ProgressPhotos from '../components/ProgressPhotos';

function Skeleton({ height = 120 }) {
  return <div className="skeleton" style={{ height }} />;
}

function Heatmap({ workouts }) {
  const dateMap = {};
  workouts.forEach(w => { dateMap[w.workout_date] = w.completed ? 'done' : 'miss'; });

  const today = parseLocalDate(TODAY_DATE);
  const todayDow = today.getDay();
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - (todayDow === 0 ? 6 : todayDow - 1));
  const startMonday = new Date(currentMonday);
  startMonday.setDate(currentMonday.getDate() - 28);

  const cells = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + i);
    const dateStr = toDateStr(d);
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

function WeeklyBars({ workouts, weeklyGoal }) {
  const today = parseLocalDate(TODAY_DATE);
  const todayDow = today.getDay();
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - (todayDow === 0 ? 6 : todayDow - 1));

  const buckets = [];
  for (let w = 7; w >= 0; w--) {
    const mon = new Date(currentMonday);
    mon.setDate(currentMonday.getDate() - w * 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const mStr = toDateStr(mon);
    const sStr = toDateStr(sun);
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
            <div className="bar-col__fill" style={{ height: `${Math.round((b.done / weeklyGoal) * 100)}%` }} />
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
    const oneRm = estimateOneRepMax(log.carga, log.reps);

    const entry = prMap[log.exercise_name] || { val: -Infinity, date: null, oneRm: null };
    if (val > entry.val) { entry.val = val; entry.date = log.workout_date; }
    if (oneRm !== null && (entry.oneRm === null || oneRm > entry.oneRm)) entry.oneRm = oneRm;
    prMap[log.exercise_name] = entry;
  });

  const sorted = Object.entries(prMap).sort((a, b) => b[1].val - a[1].val).slice(0, 12);
  if (!sorted.length) return <p className="dash-empty">Nenhuma carga numérica registrada ainda.</p>;

  return (
    <div id="dashPRList" className="pr-list">
      {sorted.map(([name, { val, date, oneRm }]) => (
        <div className="pr-row" key={name}>
          <div className="pr-row__name">{name}</div>
          <div className="pr-row__right">
            <span className="pr-row__val">{val}kg{oneRm != null && ` · 1RM ~${oneRm.toFixed(1)}kg`}</span>
            <span className="pr-row__date">{fmtDate(date)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function WeekCompare({ logs, exercise }) {
  const thisWeekStart = getWeekStart();
  const lastWeekStart = getWeekStart(1);

  const filtered = logs.filter(l => l.exercise_name === exercise && !isNaN(parseFloat(l.carga)));
  const thisWeek = filtered.filter(l => l.workout_date >= thisWeekStart);
  const lastWeek = filtered.filter(l => l.workout_date >= lastWeekStart && l.workout_date < thisWeekStart);
  const bestThis = thisWeek.length ? Math.max(...thisWeek.map(l => parseFloat(l.carga))) : null;
  const bestLast = lastWeek.length ? Math.max(...lastWeek.map(l => parseFloat(l.carga))) : null;

  if (bestThis === null && bestLast === null) return null;

  let diffMsg = null;
  if (bestThis !== null && bestLast !== null) {
    const delta = bestThis - bestLast;
    if (delta > 0) diffMsg = `📈 +${delta.toFixed(1)}kg em relação à semana passada`;
    else if (delta < 0) diffMsg = `📉 ${delta.toFixed(1)}kg em relação à semana passada`;
    else diffMsg = '➡️ Mesma carga da semana passada';
  }

  return (
    <div className="week-compare">
      <div className="week-compare__row">
        <span>Semana passada</span>
        <strong>{bestLast !== null ? `${bestLast}kg` : '–'}</strong>
      </div>
      <div className="week-compare__row">
        <span>Esta semana</span>
        <strong>{bestThis !== null ? `${bestThis}kg` : '–'}</strong>
      </div>
      {diffMsg && <p className="week-compare__diff">{diffMsg}</p>}
    </div>
  );
}

function LoadHistory({ points }) {
  if (!points.length) return null;
  const reversed = [...points].slice().reverse();
  return (
    <div className="load-history">
      {reversed.map((p, i) => (
        <div className="load-history__row" key={`${p.label}-${i}`}>
          <span className="load-history__date">{p.label}</span>
          <span className="load-history__val">{p.value}kg</span>
        </div>
      ))}
    </div>
  );
}

export default function DashPage({ active }) {
  const { user } = useAuth();
  const { activePlanDays } = useWorkout();
  const toast = useToast();
  const [workouts, setWorkouts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [allTimeLogs, setAllTimeLogs] = useState([]);
  const [foodLogs, setFoodLogs] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPR, setLoadingPR] = useState(false);
  const [unlockedBadges, setUnlockedBadges] = useState(new Set());
  const [streak, setStreak] = useState(0);
  const [totalTreinos, setTotalTreinos] = useState(0);
  const [totalPhotosCount, setTotalPhotosCount] = useState(0);
  // PRs/streak/conquistas exigem o histórico inteiro de treinos — buscar isso
  // de novo toda vez que a aba fica ativa fica cada vez mais pesado conforme
  // o histórico cresce, então só carrega uma vez por sessão (com refresh manual).
  const hasLoadedAllTimeRef = useRef(false);

  const weeklyGoal = getWeeklyGoal(user);
  const day = activePlanDays.find(d => d.dia === TODAY_NAME);
  const todayCompleted = workouts.find(w => w.workout_date === TODAY_DATE)?.completed ?? false;
  
  const [selectedView, setSelectedView] = useState('today');

  const { viewActiveGroups, selectedSubtitle } = useMemo(() => {
    if (selectedView === 'today') {
      const active = day && todayCompleted ? getMuscleGroupsForDay(day) : new Set();
      const subtitle = day 
        ? (todayCompleted ? `Foco: ${day.foco}` : `${day.foco} — treino de hoje ainda não concluído (sem marcações)`) 
        : 'Sem treino planejado para hoje';
      return { viewActiveGroups: active, selectedSubtitle: subtitle };
    }

    if (selectedView.startsWith('workout-')) {
      const wId = selectedView.replace('workout-', '');
      const w = workouts.find(x => String(x.id) === wId);
      if (w) {
        const planDay = activePlanDays.find(d => d.dia === w.day_of_week);
        const active = w.completed && planDay ? getMuscleGroupsForDay(planDay) : new Set();
        const subtitle = w.completed 
          ? `Treino concluído em ${fmtDate(w.workout_date)} (Foco: ${planDay?.foco || 'Geral'})` 
          : `Treino de ${w.day_of_week} (${fmtDate(w.workout_date)}) não foi concluído (sem marcações)`;
        return { viewActiveGroups: active, selectedSubtitle: subtitle };
      }
    }

    return { viewActiveGroups: new Set(), selectedSubtitle: '–' };
  }, [selectedView, workouts, activePlanDays, day, todayCompleted]);

  const loadAllTimeLogs = useCallback(async () => {
    if (!user) return;
    setLoadingPR(true);
    try {
      const { data: allWorkouts, error: awErr } = await db
        .from('workouts')
        .select('id, workout_date, completed')
        .eq('user_id', user.id);
      if (awErr) throw awErr;

      const ids = (allWorkouts || []).map(w => w.id);
      if (ids.length) {
        const { data: sets, error: sErr } = await db
          .from('exercise_sets')
          .select('exercise_name, carga, reps, workout_id')
          .in('workout_id', ids)
          .eq('completed', true)
          .not('carga', 'is', null);
        if (sErr) throw sErr;

        const dateMap = Object.fromEntries(allWorkouts.map(w => [w.id, w.workout_date]));
        setAllTimeLogs((sets || []).map(s => ({ ...s, workout_date: dateMap[s.workout_id] })));
      } else {
        setAllTimeLogs([]);
      }

      const completedWorkouts = (allWorkouts || []).filter(w => w.completed);
      const streakDays = calcStreak(completedWorkouts.map(w => w.workout_date));

      const [totalFoodLogs, totalPhotos, recipes, weights] = await Promise.all([
        countFoodLogs(user.id),
        countPhotos(user.id),
        fetchRecipes(user.id),
        fetchWeightLogs(user.id),
      ]);

      setStreak(streakDays);
      setTotalTreinos(completedWorkouts.length);
      setTotalPhotosCount(totalPhotos);

      const { unlockedIds, newlyEarned } = await syncAchievements(user.id, {
        streakDays,
        totalTreinos: completedWorkouts.length,
        totalFoodLogs,
        totalPhotos,
        totalRecipes: recipes.length,
        totalWeightLogs: weights.length,
      });
      setUnlockedBadges(unlockedIds);
      newlyEarned.forEach(b => toast(`🏅 Conquista desbloqueada: ${b.title}`));
      hasLoadedAllTimeRef.current = true;
    } catch (err) {
      console.error('loadAllTimeLogs:', err);
      toast('⚠️ Erro ao carregar recordes e conquistas');
    } finally {
      setLoadingPR(false);
    }
  }, [user, toast]);

  function handleRefreshRecords() {
    hasLoadedAllTimeRef.current = false;
    loadAllTimeLogs();
  }

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
          .select('id, workout_date, completed, day_of_week')
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

        const food = await fetchFoodLogsRange(user.id, sinceStr);
        setFoodLogs(food);
      } catch (err) {
        console.error('loadDashboard:', err);
        toast('⚠️ Erro ao carregar evolução');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
    if (!hasLoadedAllTimeRef.current) loadAllTimeLogs();
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

  const caloriePoints = useMemo(() => {
    const totals = {};
    foodLogs.forEach(f => {
      const kcal = parseFloat(f.kcal);
      if (!Number.isFinite(kcal)) return;
      totals[f.log_date] = (totals[f.log_date] || 0) + kcal;
    });
    return Object.keys(totals).sort().map(date => ({ value: Math.round(totals[date]), label: fmtDate(date) }));
  }, [foodLogs]);

  return (
    <section id="page-dash" className="page active">
      <div className="dash-card">
        <div className="dash-card__title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <div className="dash-card__title" style={{ marginBottom: 0 }}>Visualização Anatômica</div>
          <select 
            className="input input--sm" 
            style={{ width: 'auto', minWidth: '180px', padding: '4px 8px' }} 
            value={selectedView} 
            onChange={e => setSelectedView(e.target.value)}
          >
            <option value="today">Hoje ({day ? day.dia : 'Sem treino'})</option>
            {workouts.slice().reverse().map(w => {
              const planDay = activePlanDays.find(d => d.dia === w.day_of_week);
              const foco = planDay ? planDay.foco : 'Geral';
              return (
                <option key={w.id} value={`workout-${w.id}`}>
                  {fmtDate(w.workout_date)} - {w.day_of_week} ({w.completed ? foco : 'Não iniciado'})
                </option>
              );
            })}
          </select>
        </div>
        <div className="dash-card__subtitle" style={{ marginBottom: '12px' }}>
          {selectedSubtitle}
        </div>
        <BodyAvatar activeGroups={viewActiveGroups} />
      </div>

      <div className="section-group">
        <div className="section-group__label">Treinos</div>

        <div className="dash-card">
          <div className="dash-card__title">Soma de cargas por treino</div>
          <p className="dash-card__subtitle">Soma do peso de todas as séries concluídas em cada treino (não considera repetições)</p>
          <div className="line-chart-wrap">
            {loading ? <Skeleton height={130} /> : (
              <LineChart
                points={volumePoints}
                valueSuffix="kg"
                singleMsg={v => `1 treino registrado: ${v}kg — treine mais vezes para ver a evolução`}
                emptyMsg="Nenhum volume registrado ainda. Marque séries como concluídas na aba Treino."
              />
            )}
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-card__title">Últimos 35 dias</div>
          {loading ? <Skeleton height={140} /> : (
            <>
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
            </>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card__title">Treinos concluídos por semana</div>
          {loading ? <Skeleton height={110} /> : <WeeklyBars workouts={workouts} weeklyGoal={weeklyGoal} />}
        </div>

        <div className="dash-card">
          <div className="dash-card__title">Evolução de carga</div>
          <select className="input input--sm" value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}>
            <option value="">Selecione um exercício</option>
            {exercises.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <div className="line-chart-wrap">
            {loading ? <Skeleton height={130} /> : (
              <LineChart
                points={loadPoints}
                valueSuffix="kg"
                singleMsg={v => `1 registro: ${v}kg — treine mais vezes para ver a evolução`}
                emptyMsg={selectedExercise ? 'Nenhum registro para este exercício' : 'Selecione um exercício com carga registrada'}
              />
            )}
          </div>
          {!loading && selectedExercise && <WeekCompare logs={logs} exercise={selectedExercise} />}
          {!loading && selectedExercise && <LoadHistory points={loadPoints} />}
        </div>

        <div className="dash-card">
          <div className="dash-card__title-row">
            <div className="dash-card__title">Recordes pessoais — maior carga</div>
            <button type="button" className="btn btn--outline btn--sm" disabled={loadingPR} onClick={handleRefreshRecords}>
              🔄
            </button>
          </div>
          {loadingPR ? <Skeleton height={100} /> : <PRList logs={allTimeLogs} />}
        </div>
      </div>

      <div className="section-group">
        <div className="section-group__label">Dieta</div>

        <div className="dash-card">
          <div className="dash-card__title">Calorias consumidas por dia</div>
          <p className="dash-card__subtitle">Soma dos alimentos registrados em cada dia</p>
          <div className="line-chart-wrap">
            {loading ? <Skeleton height={130} /> : (
              <LineChart
                points={caloriePoints}
                valueSuffix="kcal"
                singleMsg={v => `1 dia registrado: ${v}kcal — registre alimentos em outros dias para ver a evolução`}
                emptyMsg="Nenhum alimento registrado ainda. Registre na aba Dieta."
              />
            )}
          </div>
        </div>
      </div>

      <div className="section-group">
        <div className="section-group__label">Conquistas</div>
        <div className="dash-card">
          <div className="badge-grid">
            {BADGES.map(b => {
              const unlocked = unlockedBadges.has(b.id);
              return (
                <div key={b.id} className={`badge-card${unlocked ? ' badge-card--unlocked' : ''}`} title={b.desc}>
                  <span className="badge-card__emoji">{b.emoji}</span>
                  <span className="badge-card__title">{b.title}</span>
                  {!unlocked && <span className="badge-card__desc">{b.desc}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="section-group">
        <div className="section-group__label">Fotos de progresso</div>
        <div className="dash-card">
          <ProgressPhotos />
        </div>
      </div>
    </section>
  );
}
