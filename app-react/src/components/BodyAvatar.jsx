function cls(active, muscle) {
  return `muscle${active.has(muscle) ? ' muscle--active' : ''}`;
}

export default function BodyAvatar({ activeGroups }) {
  return (
    <div className="body-avatar">
      <div className="body-avatar__col">
        <svg viewBox="0 0 120 220" className="body-avatar__svg">
          <circle cx="60" cy="18" r="14" className="muscle muscle--fixed" />
          <rect x="52" y="30" width="16" height="12" className="muscle muscle--fixed" />
          <ellipse cx="35" cy="47" rx="14" ry="9" className={cls(activeGroups, 'shoulders')} />
          <ellipse cx="85" cy="47" rx="14" ry="9" className={cls(activeGroups, 'shoulders')} />
          <rect x="38" y="42" width="44" height="32" rx="8" className={cls(activeGroups, 'chest')} />
          <rect x="18" y="50" width="14" height="35" rx="6" className={cls(activeGroups, 'biceps')} />
          <rect x="88" y="50" width="14" height="35" rx="6" className={cls(activeGroups, 'biceps')} />
          <rect x="42" y="76" width="36" height="34" rx="6" className={cls(activeGroups, 'abs')} />
          <rect x="34" y="112" width="22" height="55" rx="10" className={cls(activeGroups, 'quads')} />
          <rect x="64" y="112" width="22" height="55" rx="10" className={cls(activeGroups, 'quads')} />
          <rect x="34" y="170" width="22" height="40" rx="8" className={cls(activeGroups, 'calves')} />
          <rect x="64" y="170" width="22" height="40" rx="8" className={cls(activeGroups, 'calves')} />
        </svg>
        <span className="body-avatar__label">Frente</span>
      </div>
      <div className="body-avatar__col">
        <svg viewBox="0 0 120 220" className="body-avatar__svg">
          <circle cx="60" cy="18" r="14" className="muscle muscle--fixed" />
          <rect x="52" y="30" width="16" height="12" className="muscle muscle--fixed" />
          <ellipse cx="60" cy="42" rx="30" ry="12" className={cls(activeGroups, 'shoulders')} />
          <rect x="38" y="52" width="44" height="40" rx="10" className={cls(activeGroups, 'back')} />
          <rect x="18" y="50" width="14" height="35" rx="6" className={cls(activeGroups, 'triceps')} />
          <rect x="88" y="50" width="14" height="35" rx="6" className={cls(activeGroups, 'triceps')} />
          <rect x="38" y="96" width="44" height="22" rx="10" className={cls(activeGroups, 'glutes')} />
          <rect x="34" y="120" width="22" height="45" rx="10" className={cls(activeGroups, 'hamstrings')} />
          <rect x="64" y="120" width="22" height="45" rx="10" className={cls(activeGroups, 'hamstrings')} />
          <rect x="34" y="168" width="22" height="42" rx="8" className={cls(activeGroups, 'calves')} />
          <rect x="64" y="168" width="22" height="42" rx="8" className={cls(activeGroups, 'calves')} />
        </svg>
        <span className="body-avatar__label">Costas</span>
      </div>
    </div>
  );
}
