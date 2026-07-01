import { useEffect, useState } from 'react';
import { macroData, dietaData, TODAY_DATE } from '../data/treinoData';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { fetchMealLogs, upsertMealLog, fetchWaterLog, upsertWaterLog } from '../lib/dietaLog';

const WATER_KEY = `agua_${TODAY_DATE}`;
const waterGoalEntry = macroData.find(m => m.isWater);
const WATER_GOAL_ML = waterGoalEntry ? parseFloat(waterGoalEntry.value) * 1000 : 3500;

function mealKey(meal) {
  return `dieta_${TODAY_DATE}_${meal.nome}`;
}

function getWaterMl() {
  return parseInt(localStorage.getItem(WATER_KEY), 10) || 0;
}

function fmtLiters(ml) {
  return (ml / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function MealCard({ meal, bump, user }) {
  const toast = useToast();
  const done = localStorage.getItem(mealKey(meal)) === 'true';

  async function toggle() {
    const next = !done;
    localStorage.setItem(mealKey(meal), next);
    bump();
    toast(next ? '✅ Refeição marcada!' : 'Refeição desmarcada');
    if (user) {
      try {
        await upsertMealLog(user.id, TODAY_DATE, meal.nome, next);
      } catch (err) {
        console.error('upsertMealLog:', err);
      }
    }
  }

  return (
    <div className="meal-card">
      <button
        type="button"
        className={`meal-card__check${done ? ' meal-card__check--done' : ''}`}
        aria-pressed={done}
        onClick={toggle}
      >{done ? '✅' : '⬜'}</button>
      <div className="meal-card__time">{meal.horario}</div>
      <div className="meal-card__body">
        <div className="meal-card__name">{meal.nome}</div>
        <div className="meal-card__desc" dangerouslySetInnerHTML={{ __html: meal.descricao }} />
      </div>
    </div>
  );
}

function WaterTracker({ water, onAdd, onReset }) {
  const pct = Math.min(100, (water / WATER_GOAL_ML) * 100);

  return (
    <div className="progress-card">
      <div className="progress-card__row">
        <span className="progress-card__label">💧 Hidratação</span>
        <span className="progress-card__count">{fmtLiters(water)}L / {fmtLiters(WATER_GOAL_ML)}L</span>
      </div>
      <div className="progress-card__bar">
        <div className="progress-card__fill progress-card__fill--water" style={{ width: `${pct}%` }} />
      </div>
      <div className="water-actions">
        <button type="button" className="btn btn--outline btn--sm" onClick={() => onAdd(200)}>+200ml</button>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => onAdd(500)}>+500ml</button>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => onAdd(-200)}>-200ml</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>Zerar</button>
      </div>
    </div>
  );
}

export default function DietaPage() {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const bump = () => setTick(t => t + 1);
  const toast = useToast();

  useEffect(() => {
    if (!user) return;

    async function loadDietaLogs() {
      try {
        const [meals, waterMl] = await Promise.all([
          fetchMealLogs(user.id, TODAY_DATE),
          fetchWaterLog(user.id, TODAY_DATE),
        ]);
        meals.forEach(m => localStorage.setItem(`dieta_${TODAY_DATE}_${m.meal_name}`, m.completed));
        if (waterMl !== null) localStorage.setItem(WATER_KEY, waterMl);
        bump();
      } catch (err) {
        console.error('loadDietaLogs:', err);
      }
    }
    loadDietaLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const done = dietaData.filter(m => localStorage.getItem(mealKey(m)) === 'true').length;
  const total = dietaData.length;
  const water = getWaterMl();

  async function handleReset() {
    if (!window.confirm('Limpar os checks de refeição de hoje?')) return;
    dietaData.forEach(m => localStorage.removeItem(mealKey(m)));
    bump();
    if (user) {
      try {
        await Promise.all(dietaData.map(m => upsertMealLog(user.id, TODAY_DATE, m.nome, false)));
      } catch (err) {
        console.error('resetMealLogs:', err);
      }
    }
  }

  function handleAddWater(deltaMl) {
    const next = Math.max(0, water + deltaMl);
    localStorage.setItem(WATER_KEY, next);
    bump();
    if (deltaMl > 0 && next >= WATER_GOAL_ML && water < WATER_GOAL_ML) {
      toast('🎉 Meta de hidratação do dia atingida!');
    }
    if (user) upsertWaterLog(user.id, TODAY_DATE, next).catch(err => console.error('upsertWaterLog:', err));
  }

  function handleResetWater() {
    if (!window.confirm('Zerar a água registrada hoje?')) return;
    localStorage.removeItem(WATER_KEY);
    bump();
    if (user) upsertWaterLog(user.id, TODAY_DATE, 0).catch(err => console.error('resetWaterLog:', err));
  }

  return (
    <section id="page-dieta" className="page active">
      <div className="progress-card">
        <div className="progress-card__row">
          <span className="progress-card__label">Hoje</span>
          <span className="progress-card__count">{done}/{total} refeições</span>
        </div>
        <div className="progress-card__bar">
          <div className="progress-card__fill" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>
      <div className="toolbar">
        <p className="toolbar__hint">Marque as refeições feitas</p>
        <button className="btn btn--ghost btn--sm" onClick={handleReset}>Limpar</button>
      </div>
      <WaterTracker water={water} onAdd={handleAddWater} onReset={handleResetWater} />
      <div id="macrosGrid" className="macros">
        {macroData.filter(m => !m.isWater).map(m => (
          <div className="macro-card" key={m.label}>
            <span className="macro-card__value">{m.value}</span>
            <span className="macro-card__label">{m.label}</span>
          </div>
        ))}
      </div>
      <div id="dietaContainer" className="meals">
        {dietaData.map(meal => (
          <MealCard key={meal.nome} meal={meal} bump={bump} user={user} />
        ))}
      </div>
    </section>
  );
}
