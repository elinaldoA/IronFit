import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { useDietaMeals } from '../hooks/useDietaMeals';
import RecipeModal from '../components/RecipeModal';
import { FoodItemRow, MealCard, MealEditRow } from '../components/DietaMealWidgets';

export default function DietaPage() {
  const { user, updateProfile } = useAuth();
  const { markPending } = useWorkout();
  const toast = useToast();
  const {
    bump, meals, editing, setEditing, draft, foodLogs, recipes, showRecipes, setShowRecipes, logsLoaded,
    orphanItems, done, total, remainingMacros, refreshRecipes,
    handleAddFoodItem, handleEditFoodItem, handleDeleteFoodItem, handleReset,
    startEditing, updateDraftMeal, removeDraftMeal, addDraftMeal, handleSaveMeals, handleRestoreDefault,
  } = useDietaMeals(user, toast, markPending, updateProfile);

  return (
    <section id="page-dieta" className="page active">
      <div className="progress-card">
        <div className="progress-card__row">
          <span className="progress-card__label">Hoje</span>
          <span className="progress-card__count">{done}/{total} refeições</span>
        </div>
        <div className="progress-card__bar">
          <div className="progress-card__fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>
      <div className="toolbar">
        <p className="toolbar__hint">Marque as refeições feitas</p>
        <div className="toolbar__actions">
          <button
            type="button" className="btn btn--ghost btn--sm" title={editing ? 'Cancelar edição' : 'Editar refeições'}
            onClick={editing ? () => setEditing(false) : startEditing}
          >{editing ? '✖️' : '✏️'}</button>
          <button type="button" className="btn btn--ghost btn--sm" title="Limpar checks de hoje" onClick={handleReset}>🧹</button>
          <button type="button" className="btn btn--ghost btn--sm" title="Receitas salvas" onClick={() => setShowRecipes(true)}>📋 Receitas</button>
        </div>
      </div>
      {!user || logsLoaded ? (
        <div id="macrosGrid" className="macros">
          <div className={`macro-card${remainingMacros.kcal.over ? ' macro-card--over' : ''}`}>
            <span className="macro-card__value">{remainingMacros.kcal.value}</span>
            <span className="macro-card__label">{remainingMacros.kcal.over ? 'Kcal excedidas' : 'Kcal restantes'}</span>
          </div>
          <div className={`macro-card${remainingMacros.proteina.over ? ' macro-card--over' : ''}`}>
            <span className="macro-card__value">{remainingMacros.proteina.value}g</span>
            <span className="macro-card__label">{remainingMacros.proteina.over ? 'Proteína excedida' : 'Proteína restante'}</span>
          </div>
          <div className={`macro-card${remainingMacros.carboidrato.over ? ' macro-card--over' : ''}`}>
            <span className="macro-card__value">{remainingMacros.carboidrato.value}g</span>
            <span className="macro-card__label">{remainingMacros.carboidrato.over ? 'Carbo excedido' : 'Carbo restante'}</span>
          </div>
          <div className={`macro-card${remainingMacros.gordura.over ? ' macro-card--over' : ''}`}>
            <span className="macro-card__value">{remainingMacros.gordura.value}g</span>
            <span className="macro-card__label">{remainingMacros.gordura.over ? 'Gordura excedida' : 'Gordura restante'}</span>
          </div>
        </div>
      ) : (
        <div id="macrosGrid" className="macros">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton" style={{ height: 64 }} />)}
        </div>
      )}
      {editing ? (
        <div className="meal-edit-list">
          {draft.map((meal, i) => (
            <MealEditRow
              key={i}
              meal={meal}
              onChange={next => updateDraftMeal(i, next)}
              onRemove={() => removeDraftMeal(i)}
            />
          ))}
          <button type="button" className="btn btn--outline btn--full" onClick={addDraftMeal}>+ Adicionar refeição</button>
          <button type="button" className="btn btn--primary btn--full" onClick={handleSaveMeals}>Salvar refeições</button>
          <button type="button" className="btn btn--ghost btn--full" onClick={handleRestoreDefault}>Restaurar padrão</button>
        </div>
      ) : (
        <div id="dietaContainer" className="meals">
          {meals.map(meal => (
            <MealCard
              key={meal.nome} meal={meal} bump={bump} user={user}
              items={foodLogs.filter(f => f.meal_name === meal.nome)}
              onAddItem={handleAddFoodItem}
              onEditItem={handleEditFoodItem}
              onDeleteItem={handleDeleteFoodItem}
              recipes={recipes}
            />
          ))}
        </div>
      )}
      {!editing && orphanItems.length > 0 && (
        <div className="section-group">
          <div className="section-group__label">Outros registros de hoje</div>
          <p className="toolbar__hint">Alimentos de refeições renomeadas ou removidas — ainda contam no total.</p>
          <div className="meal-card">
            <div className="meal-card__body">
              <div className="food-item-list">
                {orphanItems.map(item => (
                  <FoodItemRow key={item.id} item={item} onDelete={handleDeleteFoodItem} onEdit={handleEditFoodItem} recipes={recipes} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {showRecipes && (
        <RecipeModal onClose={() => { setShowRecipes(false); refreshRecipes(); }} />
      )}
    </section>
  );
}
