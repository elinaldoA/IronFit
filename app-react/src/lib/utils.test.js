import { describe, it, expect } from 'vitest';
import { parseRepCeiling, parseDecimal, mealMacroContribution } from './utils';

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

describe('parseDecimal', () => {
  it('aceita decimal em formato pt-BR (vírgula)', () => {
    expect(parseDecimal('12,5')).toBe(12.5);
    expect(parseDecimal('0,8')).toBe(0.8);
  });

  it('continua aceitando ponto normalmente', () => {
    expect(parseDecimal('12.5')).toBe(12.5);
  });

  it('aceita número inteiro sem separador', () => {
    expect(parseDecimal('150')).toBe(150);
  });

  it('retorna NaN pra texto vazio ou não numérico', () => {
    expect(Number.isNaN(parseDecimal(''))).toBe(true);
    expect(Number.isNaN(parseDecimal('abc'))).toBe(true);
  });
});

describe('mealMacroContribution', () => {
  const meal = { kcal: 600, proteina: 40, carboidrato: 70, gordura: 15 };

  it('sem alimentos registrados e não marcada: não conta nada', () => {
    expect(mealMacroContribution(meal, [], false)).toEqual({ kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 });
  });

  it('sem alimentos registrados e marcada: usa a estimativa da refeição', () => {
    expect(mealMacroContribution(meal, [], true)).toEqual({ kcal: 600, proteina: 40, carboidrato: 70, gordura: 15 });
  });

  it('com alimentos registrados: soma os alimentos, ignora a estimativa (mesmo marcada)', () => {
    const items = [
      { kcal: 200, proteina: 10, carboidrato: 20, gordura: 5 },
      { kcal: 100, proteina: 5, carboidrato: 10, gordura: 2 },
    ];
    expect(mealMacroContribution(meal, items, true)).toEqual({ kcal: 300, proteina: 15, carboidrato: 30, gordura: 7 });
    expect(mealMacroContribution(meal, items, false)).toEqual({ kcal: 300, proteina: 15, carboidrato: 30, gordura: 7 });
  });

  it('refeição sem estimativa própria (ex.: refeição customizada antiga): conta 0', () => {
    const semEstimativa = { kcal: undefined, proteina: undefined, carboidrato: undefined, gordura: undefined };
    expect(mealMacroContribution(semEstimativa, [], true)).toEqual({ kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 });
  });
});
