const EMPTY_MEAL = { horario: '', nome: '', descricao: '', kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 };

function moveItem(list, from, to) {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export default function MealTemplateEditor({ meals, onChange }) {
  function updateField(idx, field, value) {
    const isNumeric = ['kcal', 'proteina', 'carboidrato', 'gordura'].includes(field);
    onChange(meals.map((m, i) => (i === idx ? { ...m, [field]: isNumeric ? Number(value) || 0 : value } : m)));
  }

  function addMeal() {
    onChange([...meals, { ...EMPTY_MEAL }]);
  }

  function removeMeal(idx) {
    onChange(meals.filter((_, i) => i !== idx));
  }

  function move(idx, delta) {
    const to = idx + delta;
    if (to < 0 || to >= meals.length) return;
    onChange(moveItem(meals, idx, to));
  }

  return (
    <div className="stack">
      {meals.map((m, idx) => (
        <div className="day-editor" key={idx}>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Horário</span>
              <input className="input" value={m.horario} onChange={e => updateField(idx, 'horario', e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Nome</span>
              <input className="input" value={m.nome} onChange={e => updateField(idx, 'nome', e.target.value)} />
            </label>
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span className="field__label">Descrição</span>
              <input className="input" value={m.descricao} onChange={e => updateField(idx, 'descricao', e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Kcal</span>
              <input className="input" type="number" value={m.kcal} onChange={e => updateField(idx, 'kcal', e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Proteína (g)</span>
              <input className="input" type="number" value={m.proteina} onChange={e => updateField(idx, 'proteina', e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Carboidrato (g)</span>
              <input className="input" type="number" value={m.carboidrato} onChange={e => updateField(idx, 'carboidrato', e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Gordura (g)</span>
              <input className="input" type="number" value={m.gordura} onChange={e => updateField(idx, 'gordura', e.target.value)} />
            </label>
          </div>
          <div className="exercise-row__actions" style={{ marginTop: 8 }}>
            <button type="button" className="icon-btn" title="Mover para cima" disabled={idx === 0} onClick={() => move(idx, -1)}>↑</button>
            <button type="button" className="icon-btn" title="Mover para baixo" disabled={idx === meals.length - 1} onClick={() => move(idx, 1)}>↓</button>
            <button type="button" className="icon-btn" title="Remover" onClick={() => removeMeal(idx)}>✕</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--small" onClick={addMeal}>+ Adicionar refeição</button>
    </div>
  );
}
