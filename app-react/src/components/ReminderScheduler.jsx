import { useEffect, useRef } from 'react';
import { getDietaData, TODAY_DATE, WATER_STORAGE_KEY, getMacroGoals } from '../data/treinoData';
import { useAuth } from '../context/AuthContext';
import { sendNotification } from '../lib/notifications';

const WATER_REMINDER_TIMES = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00'];

function mealKey(meal) {
  return `dieta_${TODAY_DATE}_${meal.nome}`;
}

// Fires a browser notification for each meal/workout slot in dietaData whose
// horario matches the current minute, plus periodic water reminders, while
// the tab stays open. There's no push server, so nothing fires once the
// app/tab is fully closed.
export default function ReminderScheduler() {
  const { user } = useAuth();
  const notifiedRef = useRef(new Set());
  const waterNotifiedRef = useRef(new Set());

  useEffect(() => {
    function checkReminders() {
      if (localStorage.getItem('reminders_enabled') !== 'true') return;

      const now = new Date();
      const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      getDietaData(user).forEach(meal => {
        if (meal.horario !== current) return;
        if (notifiedRef.current.has(meal.nome)) return;
        if (localStorage.getItem(mealKey(meal)) === 'true') return;

        sendNotification(`⏰ ${meal.nome}`, {
          body: meal.descricao.replace(/<[^>]+>/g, ''),
          tag: mealKey(meal),
        }).catch(err => console.error('sendNotification:', err));
        notifiedRef.current.add(meal.nome);
      });

      if (WATER_REMINDER_TIMES.includes(current) && !waterNotifiedRef.current.has(current)) {
        waterNotifiedRef.current.add(current);
        const goalMl = getMacroGoals(user).macroAgua * 1000;
        const currentMl = parseInt(localStorage.getItem(WATER_STORAGE_KEY), 10) || 0;
        if (currentMl < goalMl) {
          sendNotification('💧 Hora de beber água', {
            body: `Você bebeu ${(currentMl / 1000).toFixed(1)}L de ${(goalMl / 1000).toFixed(1)}L hoje.`,
            tag: `water-${TODAY_DATE}-${current}`,
          }).catch(err => console.error('sendNotification:', err));
        }
      }
    }

    checkReminders();
    const id = setInterval(checkReminders, 30000);
    return () => clearInterval(id);
  }, [user]);

  return null;
}
