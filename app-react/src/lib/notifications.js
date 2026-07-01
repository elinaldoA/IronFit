export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export async function sendNotification(title, options) {
  if (!isNotificationSupported()) throw new Error('Notificações não suportadas neste navegador');
  if (Notification.permission !== 'granted') throw new Error(`Permissão de notificação: ${Notification.permission}`);

  // Pages controlled by a service worker (this app is a PWA) can't use
  // `new Notification()` in Chrome/Edge — it throws "Illegal constructor".
  // Route through the SW registration instead when one is active.
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
  }
  new Notification(title, options);
}
