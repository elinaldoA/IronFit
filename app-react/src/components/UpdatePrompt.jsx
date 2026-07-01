import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="update-banner">
      <span>Nova versão disponível</span>
      <button className="btn btn--primary btn--sm" onClick={() => updateServiceWorker(true)}>
        Atualizar
      </button>
    </div>
  );
}
