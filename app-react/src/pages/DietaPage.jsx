import { macroData, dietaData } from '../data/treinoData';

export default function DietaPage() {
  return (
    <section id="page-dieta" className="page active">
      <div id="macrosGrid" className="macros">
        {macroData.map(m => (
          <div className="macro-card" key={m.label}>
            <span className={`macro-card__value${m.isWater ? ' macro-card__value--water' : ''}`}>{m.value}</span>
            <span className="macro-card__label">{m.label}</span>
          </div>
        ))}
      </div>
      <div id="dietaContainer" className="meals">
        {dietaData.map(meal => (
          <div className={`meal-card${meal.isWater ? ' meal-card--water' : ''}`} key={meal.nome}>
            <div className="meal-card__time">{meal.horario}</div>
            <div className="meal-card__body">
              <div className="meal-card__name">{meal.nome}</div>
              <div className="meal-card__desc" dangerouslySetInnerHTML={{ __html: meal.descricao }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
