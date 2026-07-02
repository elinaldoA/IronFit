import { useEffect, useState } from 'react';

function storageKey(dayName) {
  return `treino_${dayName}_timer`;
}

function loadState(dayName) {
  try {
    const raw = localStorage.getItem(storageKey(dayName));
    if (!raw) return { status: 'idle', accumulatedMs: 0, runningSince: null, startedAt: null, finishedAt: null };
    return JSON.parse(raw);
  } catch {
    return { status: 'idle', accumulatedMs: 0, runningSince: null, startedAt: null, finishedAt: null };
  }
}

// Tracks a per-day workout session (start/pause/resume/finish) with elapsed
// time persisted to localStorage so it survives reloads, including rest periods
// (the rest timer never stops this clock — it just keeps ticking underneath).
export function useWorkoutTimer(dayName) {
  const [state, setState] = useState(() => loadState(dayName));
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (state.status !== 'running') return;
    const id = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [state.status]);

  function persist(next) {
    setState(next);
    localStorage.setItem(storageKey(dayName), JSON.stringify(next));
  }

  // Returns the session's startedAt so callers can sync it.
  function start() {
    const startedAt = Date.now();
    persist({ status: 'running', accumulatedMs: 0, runningSince: startedAt, startedAt, finishedAt: null });
    return startedAt;
  }

  function pause() {
    if (state.status !== 'running') return;
    persist({ ...state, status: 'paused', accumulatedMs: state.accumulatedMs + (Date.now() - state.runningSince), runningSince: null });
  }

  function resume() {
    if (state.status !== 'paused') return;
    persist({ ...state, status: 'running', runningSince: Date.now() });
  }

  // Returns { accumulatedMs, startedAt, finishedAt } so callers can show/save a summary.
  function finish() {
    if (state.status !== 'running' && state.status !== 'paused') return null;
    const accumulatedMs = state.accumulatedMs + (state.status === 'running' ? Date.now() - state.runningSince : 0);
    const finishedAt = Date.now();
    persist({ status: 'finished', accumulatedMs, runningSince: null, startedAt: state.startedAt, finishedAt });
    return { accumulatedMs, startedAt: state.startedAt, finishedAt };
  }

  function reset() {
    persist({ status: 'idle', accumulatedMs: 0, runningSince: null, startedAt: null, finishedAt: null });
  }

  const elapsedMs = state.accumulatedMs + (state.status === 'running' && state.runningSince ? Date.now() - state.runningSince : 0);

  return { status: state.status, elapsedMs, start, pause, resume, finish, reset };
}
