// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MealTemplateEditor from './MealTemplateEditor';

describe('MealTemplateEditor', () => {
  it('adiciona uma refeição vazia', () => {
    const onChange = vi.fn();
    render(<MealTemplateEditor meals={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Adicionar refeição'));
    expect(onChange).toHaveBeenCalledWith([{ horario: '', nome: '', descricao: '', kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 }]);
  });

  it('converte campos numéricos pra number ao editar', () => {
    const onChange = vi.fn();
    const meals = [{ horario: '08:00', nome: 'Café', descricao: '', kcal: 100, proteina: 0, carboidrato: 0, gordura: 0 }];
    render(<MealTemplateEditor meals={meals} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('100'), { target: { value: '350' } });
    expect(onChange.mock.calls[0][0][0].kcal).toBe(350);
  });

  it('remove a refeição correta', () => {
    const onChange = vi.fn();
    const meals = [
      { horario: '08:00', nome: 'Café', descricao: '', kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 },
      { horario: '12:00', nome: 'Almoço', descricao: '', kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 },
    ];
    render(<MealTemplateEditor meals={meals} onChange={onChange} />);
    fireEvent.click(screen.getAllByTitle('Remover')[0]);
    expect(onChange.mock.calls[0][0]).toEqual([meals[1]]);
  });
});
