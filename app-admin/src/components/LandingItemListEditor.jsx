function moveItem(list, from, to) {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export default function LandingItemListEditor({ items, onChange, emptyItem, addLabel, renderFields }) {
  function updateItem(idx, patch) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    onChange([...items, { ...emptyItem }]);
  }

  function removeItem(idx) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function move(idx, delta) {
    const to = idx + delta;
    if (to < 0 || to >= items.length) return;
    onChange(moveItem(items, idx, to));
  }

  return (
    <div className="stack">
      {items.map((item, idx) => (
        <div className="day-editor" key={idx}>
          {renderFields(item, patch => updateItem(idx, patch))}
          <div className="exercise-row__actions" style={{ marginTop: 8 }}>
            <button type="button" className="icon-btn" title="Mover para cima" disabled={idx === 0} onClick={() => move(idx, -1)}>↑</button>
            <button type="button" className="icon-btn" title="Mover para baixo" disabled={idx === items.length - 1} onClick={() => move(idx, 1)}>↓</button>
            <button type="button" className="icon-btn" title="Remover" onClick={() => removeItem(idx)}>✕</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--small" onClick={addItem}>+ {addLabel}</button>
    </div>
  );
}
