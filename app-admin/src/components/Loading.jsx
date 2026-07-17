export default function Loading({ label = 'Carregando…' }) {
  return (
    <div className="loading">
      <span className="loading__spinner" />
      <span>{label}</span>
    </div>
  );
}
