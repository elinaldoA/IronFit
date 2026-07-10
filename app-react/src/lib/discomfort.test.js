import { describe, it, expect } from 'vitest';
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
