import { describe, it, expect } from 'vitest';
import { parseRepCeiling } from './utils';

describe('parseRepCeiling', () => {
  it('extrai o teto de uma faixa de reps', () => {
    expect(parseRepCeiling('8-10')).toBe(10);
    expect(parseRepCeiling('12-15')).toBe(15);
  });

  it('aceita um número único como teto', () => {
    expect(parseRepCeiling('12')).toBe(12);
  });

  it('retorna null pra texto sem faixa numérica no formato N-N ou N', () => {
    expect(parseRepCeiling('até a falha (máx 20)')).toBeNull();
    expect(parseRepCeiling('45s')).toBeNull();
    expect(parseRepCeiling('20min · 10% inclinação / 5km/h')).toBeNull();
  });
});
