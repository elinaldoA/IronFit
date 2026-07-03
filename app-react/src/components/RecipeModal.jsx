import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getModalRoot } from '../lib/modalRoot';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchRecipes, addRecipe, deleteRecipe } from '../lib/recipes';

function RecipeRow({ recipe, onDelete }) {
  return (
    <div className="recipe-row">
      <div className="recipe-row__main">
        <span className="recipe-row__name">{recipe.name}</span>
        <span className="recipe-row__macros">{recipe.kcal}kcal · P{recipe.proteina}g · C{recipe.carboidrato}g · G{recipe.gordura}g</span>
        {recipe.ingredientes && <span className="recipe-row__ingredientes">{recipe.ingredientes}</span>}
      </div>
      <button type="button" className="plan-row__del" onClick={() => onDelete(recipe.id)} aria-label="Excluir receita">✕</button>
    </div>
  );
}

export default function RecipeModal({ onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [proteina, setProteina] = useState('');
  const [carboidrato, setCarboidrato] = useState('');
  const [gordura, setGordura] = useState('');
  const [ingredientes, setIngredientes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchRecipes(user.id);
        setRecipes(data);
      } catch (err) {
        console.error('fetchRecipes:', err);
        toast('⚠️ Erro ao carregar receitas');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const recipe = await addRecipe(user.id, { name: name.trim(), kcal, proteina, carboidrato, gordura, ingredientes });
      setRecipes(list => [...list, recipe].sort((a, b) => a.name.localeCompare(b.name)));
      setName(''); setKcal(''); setProteina(''); setCarboidrato(''); setGordura(''); setIngredientes('');
      setShowForm(false);
      toast('✅ Receita salva');
    } catch (err) {
      console.error('addRecipe:', err);
      toast('⚠️ Erro ao salvar receita');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir esta receita?')) return;
    try {
      await deleteRecipe(id, user.id);
      setRecipes(list => list.filter(r => r.id !== id));
    } catch (err) {
      console.error('deleteRecipe:', err);
      toast('⚠️ Erro ao excluir receita');
    }
  }

  return createPortal(
    <div className="plan-modal" role="dialog" aria-modal="true">
      <div className="plan-modal__backdrop" onClick={onClose} />
      <div className="plan-modal__panel">
        <div className="plan-modal__header">
          <h2 className="plan-modal__title">Receitas salvas</h2>
          <button type="button" className="plan-modal__close" aria-label="Fechar" onClick={onClose}>✕</button>
        </div>

        <div className="plan-modal__body">
          {loading ? <p className="dash-empty">Carregando…</p> : (
            <div className="plan-list">
              {recipes.length === 0 && <p className="dash-empty">Nenhuma receita salva ainda.</p>}
              {recipes.map(r => (
                <RecipeRow key={r.id} recipe={r} onDelete={handleDelete} />
              ))}

              {showForm ? (
                <form className="food-add-form" onSubmit={handleAdd}>
                  <input className="input input--sm" placeholder="Nome da receita" value={name} onChange={e => setName(e.target.value)} />
                  <div className="food-add-form__nums">
                    <input className="input input--sm" placeholder="Kcal" inputMode="decimal" value={kcal} onChange={e => setKcal(e.target.value)} />
                    <input className="input input--sm" placeholder="Prot." inputMode="decimal" value={proteina} onChange={e => setProteina(e.target.value)} />
                    <input className="input input--sm" placeholder="Carb." inputMode="decimal" value={carboidrato} onChange={e => setCarboidrato(e.target.value)} />
                    <input className="input input--sm" placeholder="Gord." inputMode="decimal" value={gordura} onChange={e => setGordura(e.target.value)} />
                  </div>
                  <textarea className="input input--sm" placeholder="Ingredientes (opcional)" rows={2} value={ingredientes} onChange={e => setIngredientes(e.target.value)} />
                  <div className="food-add-form__actions">
                    <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Salvando…' : 'Salvar receita'}</button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowForm(false)}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <button type="button" className="btn btn--outline btn--full btn--sm" onClick={() => setShowForm(true)}>+ Nova receita</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    getModalRoot()
  );
}
