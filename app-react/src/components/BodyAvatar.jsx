import bodyAnatomyImg from '../assets/body-anatomy.jpg';
import { MUSCLE_LABELS, FRONT_MUSCLE_PATHS, BACK_MUSCLE_PATHS, BODY_VIEW_SIZE } from '../data/bodyMuscleMap';

function cls(active, muscle) {
  return `muscle${active.has(muscle) ? ' muscle--active' : ''}`;
}

function Muscle({ active, muscle, as: Tag, ...props }) {
  return (
    <Tag className={cls(active, muscle)} data-muscle={muscle} {...props}>
      <title>{MUSCLE_LABELS[muscle]}</title>
    </Tag>
  );
}

function FrontView({ active }) {
  return (
    <div className="body-avatar__view">
      <img src={bodyAnatomyImg} alt="Frente" className="body-avatar__img-bg body-avatar__img-bg--front" />
      <svg viewBox={`0 0 ${BODY_VIEW_SIZE.width} ${BODY_VIEW_SIZE.height}`} className="body-avatar__svg">
        {FRONT_MUSCLE_PATHS.map((p, i) => (
          <Muscle key={`${p.muscle}-${i}`} active={active} muscle={p.muscle} as="path" d={p.d} />
        ))}
      </svg>
    </div>
  );
}

function BackView({ active }) {
  return (
    <div className="body-avatar__view">
      <img src={bodyAnatomyImg} alt="Costas" className="body-avatar__img-bg body-avatar__img-bg--back" />
      <svg viewBox={`0 0 ${BODY_VIEW_SIZE.width} ${BODY_VIEW_SIZE.height}`} className="body-avatar__svg">
        {BACK_MUSCLE_PATHS.map((p, i) => (
          <Muscle key={`${p.muscle}-${i}`} active={active} muscle={p.muscle} as="path" d={p.d} />
        ))}
      </svg>
    </div>
  );
}

export default function BodyAvatar({ activeGroups }) {
  return (
    <div className="body-avatar">
      <div className="body-avatar__figures">
        <div className="body-avatar__col">
          <FrontView active={activeGroups} />
          <span className="body-avatar__label">Frente</span>
        </div>
        <div className="body-avatar__col">
          <BackView active={activeGroups} />
          <span className="body-avatar__label">Costas</span>
        </div>
      </div>
      <div className="body-avatar__legend">
        <span className="body-avatar__legend-dot body-avatar__legend-dot--active" />
        <span>Trabalhado hoje</span>
        <span className="body-avatar__legend-dot" />
        <span>Não trabalhado</span>
      </div>
    </div>
  );
}
