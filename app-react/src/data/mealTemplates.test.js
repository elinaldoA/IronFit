import { describe, it, expect, vi } from 'vitest';
import { dietaData } from './treinoData';

// generateMealPlan agora busca o template-base em public.meal_templates
// primeiro (editável via app-admin) e só cai pros arrays locais (testados
// aqui) se o fetch falhar — força a falha pra continuar testando a lógica
// local sem depender de rede.
vi.mock('../lib/supabase', () => ({
  db: { from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'offline' } }) }) }) }) },
}));

const { generateMealPlan } = await import('./mealTemplates');

describe('generateMealPlan', () => {
  it('usa o cardápio padrão para o objetivo "massa"', async () => {
    expect(await generateMealPlan({ meta: 'massa' })).toEqual(dietaData);
  });

  it('retorna uma cópia, não a mesma referência do array padrão (evita mutação acidental)', async () => {
    const meals = await generateMealPlan({ meta: 'massa' });
    expect(meals).not.toBe(dietaData);
    meals[0].nome = 'alterado';
    expect(dietaData[0].nome).not.toBe('alterado');
  });

  it('gera um cardápio não-vazio, com horario/nome/descricao, para cada objetivo', async () => {
    for (const meta of ['forca', 'emagrecer', 'definicao', 'saude']) {
      const meals = await generateMealPlan({ meta });
      expect(meals.length).toBeGreaterThan(0);
      meals.forEach(m => {
        expect(m).toHaveProperty('horario');
        expect(m).toHaveProperty('nome');
        expect(m).toHaveProperty('descricao');
      });
    }
  });

  it('cai no cardápio de "saude" para um objetivo desconhecido', async () => {
    const meals = await generateMealPlan({ meta: 'inexistente' });
    expect(meals).toEqual(await generateMealPlan({ meta: 'saude' }));
  });
});
