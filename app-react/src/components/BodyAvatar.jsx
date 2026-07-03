import bodyAnatomyImg from '../assets/body-anatomy.jpg';

const MUSCLE_LABELS = {
  chest: 'Peitoral',
  shoulders: 'Ombros',
  triceps: 'Tríceps',
  back: 'Costas',
  biceps: 'Bíceps',
  abs: 'Abdômen',
  quads: 'Quadríceps',
  calves: 'Panturrilhas',
  hamstrings: 'Posterior de coxa',
  glutes: 'Glúteos',
};

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
      <svg viewBox="0 0 368 885" className="body-avatar__svg">
        {/* Ombros (Shoulders / Deltoids) */}
        <Muscle active={active} muscle="shoulders" as="path" d="M 125,165 C 105,170 95,190 98,225 C 103,240 120,240 130,225 C 135,210 135,175 125,165 Z" />
        <Muscle active={active} muscle="shoulders" as="path" d="M 243,165 C 263,170 273,190 270,225 C 265,240 248,240 238,225 C 233,210 233,175 243,165 Z" />

        {/* Peitoral (Chest) */}
        <Muscle active={active} muscle="chest" as="path" d="M 184,175 C 170,173 140,175 130,190 C 128,210 135,235 184,235 Z" />
        <Muscle active={active} muscle="chest" as="path" d="M 184,175 C 198,173 228,175 238,190 C 240,210 233,235 184,235 Z" />

        {/* Bíceps (Biceps) */}
        <Muscle active={active} muscle="biceps" as="path" d="M 98,225 C 90,240 85,280 95,305 C 105,310 115,310 120,290 C125,270 125,240 120,225 Z" />
        <Muscle active={active} muscle="biceps" as="path" d="M 270,225 C 278,240 283,280 273,305 C 263,310 253,310 248,290 C243,270 243,240 248,225 Z" />

        {/* Abdômen (Abs / Obliques) */}
        <Muscle active={active} muscle="abs" as="path" d="M 130,235 L 238,235 C 235,320 220,380 184,420 C 148,380 133,320 130,235 Z" />

        {/* Coxas / Quadríceps (Quads) */}
        <Muscle active={active} muscle="quads" as="path" d="M 132,430 C 115,460 115,550 148,635 C 158,635 170,625 182,590 C 184,540 184,460 184,430 Z" />
        <Muscle active={active} muscle="quads" as="path" d="M 236,430 C 253,460 253,550 220,635 C 210,635 198,625 186,590 C 184,540 184,460 184,430 Z" />

        {/* Panturrilhas (Calves) */}
        <Muscle active={active} muscle="calves" as="path" d="M 148,645 C 128,670 128,750 145,820 L 165,820 C 172,780 172,670 162,645 Z" />
        <Muscle active={active} muscle="calves" as="path" d="M 220,645 C 240,670 240,750 223,820 L 203,820 C 196,780 196,670 206,645 Z" />
      </svg>
    </div>
  );
}

function BackView({ active }) {
  return (
    <div className="body-avatar__view">
      <img src={bodyAnatomyImg} alt="Costas" className="body-avatar__img-bg body-avatar__img-bg--back" />
      <svg viewBox="0 0 368 885" className="body-avatar__svg">
        {/* Ombros (Shoulders / Deltoids) */}
        <Muscle active={active} muscle="shoulders" as="path" d="M 125,165 C 105,170 95,190 98,225 C 103,240 120,240 130,225 C 135,210 135,175 125,165 Z" />
        <Muscle active={active} muscle="shoulders" as="path" d="M 243,165 C 263,170 273,190 270,225 C 265,240 248,240 238,225 C 233,210 233,175 243,165 Z" />

        {/* Tríceps (Triceps) */}
        <Muscle active={active} muscle="triceps" as="path" d="M 98,225 C 90,240 85,280 95,305 C 105,310 115,310 120,290 C125,270 125,240 120,225 Z" />
        <Muscle active={active} muscle="triceps" as="path" d="M 270,225 C 278,240 283,280 273,305 C 263,310 253,310 248,290 C243,270 243,240 248,225 Z" />

        {/* Costas (Back) */}
        <Muscle active={active} muscle="back" as="path" d="M 130,175 L 238,175 C 240,240 235,320 184,395 C 133,320 128,240 130,175 Z" />

        {/* Glúteos (Glutes) */}
        <Muscle active={active} muscle="glutes" as="path" d="M 130,395 C 122,410 122,460 184,475 L 184,395 Z" />
        <Muscle active={active} muscle="glutes" as="path" d="M 238,395 C 246,410 246,460 184,475 L 184,395 Z" />

        {/* Posterior de Coxa (Hamstrings) */}
        <Muscle active={active} muscle="hamstrings" as="path" d="M 130,475 C 122,500 128,570 152,635 L 184,635 L 184,475 Z" />
        <Muscle active={active} muscle="hamstrings" as="path" d="M 238,475 C 246,500 238,570 216,635 L 184,635 L 184,475 Z" />

        {/* Panturrilhas (Calves) */}
        <Muscle active={active} muscle="calves" as="path" d="M 148,645 C 128,670 128,750 145,820 L 165,820 C 172,780 172,670 162,645 Z" />
        <Muscle active={active} muscle="calves" as="path" d="M 220,645 C 240,670 240,750 223,820 L 203,820 C 196,780 196,670 206,645 Z" />
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
