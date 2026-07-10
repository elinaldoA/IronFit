import { DEFAULT_MACROS, DEFAULT_WEEKLY_GOAL } from '../data/treinoData';

export function WeeklyGoalSection({ weeklyGoal, setWeeklyGoal, onSave }) {
  return (
    <div className="profile-section">
      <div className="profile-section__title">Meta Semanal de Treinos</div>
      <div className="profile-field">
        <label className="profile-field__label" htmlFor="weeklyGoal">Treinos por semana</label>
        <input
          type="number" id="weeklyGoal" className="input input--sm" placeholder={String(DEFAULT_WEEKLY_GOAL)}
          min="1" max="7" step="1" value={weeklyGoal} onChange={e => setWeeklyGoal(e.target.value)}
        />
      </div>
      <button className="btn btn--primary btn--full" onClick={onSave}>Salvar meta semanal</button>
    </div>
  );
}

export function MacrosSection({
  macroKcal, setMacroKcal, macroProteina, setMacroProteina,
  macroCarboidrato, setMacroCarboidrato, macroGordura, setMacroGordura, macroAgua, setMacroAgua,
  onSave, regeneratingMeals, onRegenerateMeals,
}) {
  return (
    <div className="profile-section">
      <div className="profile-section__title">Metas de Macros</div>
      <div className="profile-section__fields">
        <div className="profile-field">
          <label className="profile-field__label" htmlFor="macroKcal">Kcal</label>
          <input
            type="number" id="macroKcal" className="input input--sm" placeholder={String(DEFAULT_MACROS.macroKcal)}
            min="0" step="10" value={macroKcal} onChange={e => setMacroKcal(e.target.value)}
          />
        </div>
        <div className="profile-field">
          <label className="profile-field__label" htmlFor="macroProteina">Proteína (g)</label>
          <input
            type="number" id="macroProteina" className="input input--sm" placeholder={String(DEFAULT_MACROS.macroProteina)}
            min="0" step="5" value={macroProteina} onChange={e => setMacroProteina(e.target.value)}
          />
        </div>
      </div>
      <div className="profile-section__fields">
        <div className="profile-field">
          <label className="profile-field__label" htmlFor="macroCarboidrato">Carboidrato (g)</label>
          <input
            type="number" id="macroCarboidrato" className="input input--sm" placeholder={String(DEFAULT_MACROS.macroCarboidrato)}
            min="0" step="5" value={macroCarboidrato} onChange={e => setMacroCarboidrato(e.target.value)}
          />
        </div>
        <div className="profile-field">
          <label className="profile-field__label" htmlFor="macroGordura">Gordura (g)</label>
          <input
            type="number" id="macroGordura" className="input input--sm" placeholder={String(DEFAULT_MACROS.macroGordura)}
            min="0" step="5" value={macroGordura} onChange={e => setMacroGordura(e.target.value)}
          />
        </div>
      </div>
      <div className="profile-field">
        <label className="profile-field__label" htmlFor="macroAgua">Meta de água (L)</label>
        <input
          type="number" id="macroAgua" className="input input--sm" placeholder={String(DEFAULT_MACROS.macroAgua)}
          min="0" step="0.5" value={macroAgua} onChange={e => setMacroAgua(e.target.value)}
        />
      </div>
      <button className="btn btn--primary btn--full" onClick={onSave}>Salvar metas de macros</button>
      <button className="btn btn--outline btn--full" disabled={regeneratingMeals} onClick={onRegenerateMeals}>
        {regeneratingMeals ? 'Gerando novo cardápio…' : '🔄 Gerar novo cardápio com esse objetivo'}
      </button>
    </div>
  );
}
