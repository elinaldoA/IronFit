import ExerciseListEditor from './ExerciseListEditor';

// Sempre 7 dias, ordem fixa — várias telas do app-react (heatmap, TreinoPage)
// assumem exatamente uma entrada por dia da semana (ver comentário em
// app-react/src/data/workoutTemplates.js:217-218), por isso "dia" não é
// editável nem removível aqui, só foco/exercícios/pós-treino.
export default function WorkoutTemplateEditor({ days, onChange }) {
  function updateDay(idx, patch) {
    onChange(days.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  return (
    <div className="stack">
      {days.map((day, idx) => (
        <div className="day-editor" key={day.dia}>
          <div className="day-editor__head">
            <div className="field">
              <span className="field__label">Dia</span>
              <input className="input" value={day.dia} disabled />
            </div>
            <div className="field">
              <span className="field__label">Foco</span>
              <input className="input" value={day.foco} onChange={e => updateDay(idx, { foco: e.target.value })} />
            </div>
          </div>

          <ExerciseListEditor
            title="Exercícios"
            exercises={day.exercicios}
            onChange={exercicios => updateDay(idx, { exercicios })}
          />
          <ExerciseListEditor
            title="Pós-treino"
            exercises={day.pos}
            onChange={pos => updateDay(idx, { pos })}
          />
        </div>
      ))}
    </div>
  );
}
