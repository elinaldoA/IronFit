export default function EmptyState({ icon = '📭', label }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon}</span>
      <span className="empty-state__label">{label}</span>
    </div>
  );
}
