import { describe, it, expect } from 'vitest';
import { generateMealPlan } from './mealTemplates';
import { dietaData } from './treinoData';

describe('generateMealPlan', () => {
  it('usa o cardápio padrão para o objetivo "massa"', () => {
    expect(generateMealPlan({ meta: 'massa' })).toEqual(dietaData);
  });

  it('retorna uma cópia, não a mesma referência do array padrão (evita mutação acidental)', () => {
    const meals = generateMealPlan({ meta: 'massa' });
    expect(meals).not.toBe(dietaData);
    meals[0].nome = 'alterado';
    expect(dietaData[0].nome).not.toBe('alterado');
  });

  it('gera um cardápio não-vazio, com horario/nome/descricao, para cada objetivo', () => {
    for (const meta of ['forca', 'emagrecer', 'definicao', 'saude']) {
      const meals = generateMealPlan({ meta });
      expect(meals.length).toBeGreaterThan(0);
      meals.forEach(m => {
        expect(m).toHaveProperty('horario');
        expect(m).toHaveProperty('nome');
        expect(m).toHaveProperty('descricao');
      });
    }
  });

  it('cai no cardápio de "saude" para um objetivo desconhecido', () => {
    const meals = generateMealPlan({ meta: 'inexistente' });
    expect(meals).toEqual(generateMealPlan({ meta: 'saude' }));
  });
});
