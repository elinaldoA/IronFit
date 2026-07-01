import { TODAY_DATE } from '../data/treinoData';

export function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff).toISOString().split('T')[0];
}

export function calcStreak(dates) {
  if (!dates.length) return 0;
  const unique = [...new Set(dates)].sort().reverse();
  let streak = 0;
  let prev = new Date(TODAY_DATE);
  for (const d of unique) {
    const curr = new Date(d);
    const diff = Math.round((prev - curr) / 86400000);
    if (diff <= 1) { streak++; prev = curr; }
    else break;
  }
  return streak;
}
