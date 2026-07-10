import { describe, it, expect, vi } from 'vitest';

// summarizeDiscomfortByExercise é lógica pura e não usa `db`, mas o import de
// discomfort.js arrasta lib/supabase.js, que chama createClient() na hora do
// import — sem VITE_SUPABASE_URL (não setado no step de test do CI) isso
// lança. Mocka pra manter o teste isolado de configuração de ambiente.
vi.mock('./supabase', () => ({ db: {} }));

import { summarizeDiscomfortByExercise } from './discomfort';

describe('summarizeDiscomfortByExercise', () => {
  it('agrupa por exercício e conta ocorrências', () => {
    const reports = [
      { exercise_name: 'Supino reto', severity: 'leve', log_date: '2026-07-01' },
      { exercise_name: 'Supino reto', severity: 'forte', log_date: '2026-07-05' },
      { exercise_name: 'Agachamento', severity: 'moderada', log_date: '2026-07-03' },
    ];
    const result = summarizeDiscomfortByExercise(reports);

    expect(result).toEqual([
      { exerciseName: 'Supino reto', count: 2, lastSeverity: 'forte', lastDate: '2026-07-05' },
      { exerciseName: 'Agachamento', count: 1, lastSeverity: 'moderada', lastDate: '2026-07-03' },
    ]);
  });

  it('ordena por contagem desc, mesmo fora de ordem cronológica', () => {
    const reports = [
      { exercise_name: 'A', severity: 'leve', log_date: '2026-07-10' },
      { exercise_name: 'B', severity: 'leve', log_date: '2026-07-01' },
      { exercise_name: 'B', severity: 'leve', log_date: '2026-07-02' },
      { exercise_name: 'B', severity: 'leve', log_date: '2026-07-03' },
    ];
    const result = summarizeDiscomfortByExercise(reports);

    expect(result.map(r => r.exerciseName)).toEqual(['B', 'A']);
    expect(result[0].count).toBe(3);
  });

  it('retorna array vazio pra lista vazia', () => {
    expect(summarizeDiscomfortByExercise([])).toEqual([]);
  });
});
