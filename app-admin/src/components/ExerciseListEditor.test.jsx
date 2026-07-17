// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExerciseListEditor from './ExerciseListEditor';

function setup(exercises) {
  const onChange = vi.fn();
  render(<ExerciseListEditor title="Exercícios" exercises={exercises} onChange={onChange} />);
  return onChange;
}

describe('ExerciseListEditor', () => {
  it('adiciona um exercício vazio ao clicar em "Adicionar exercício"', () => {
    const onChange = setup([]);
    fireEvent.click(screen.getByText('+ Adicionar exercício'));
    expect(onChange).toHaveBeenCalledWith([{ nome: '', series: '', reps: '', descanso: '', tecnica: '' }]);
  });

  it('remove o exercício correto ao clicar em ✕', () => {
    const onChange = setup([
      { nome: 'A', series: '3', reps: '10', descanso: '60s', tecnica: '' },
      { nome: 'B', series: '3', reps: '10', descanso: '60s', tecnica: '' },
    ]);
    fireEvent.click(screen.getAllByTitle('Remover')[0]);
    expect(onChange).toHaveBeenCalledWith([{ nome: 'B', series: '3', reps: '10', descanso: '60s', tecnica: '' }]);
  });

  it('move um exercício para baixo', () => {
    const onChange = setup([
      { nome: 'A', series: '3', reps: '10', descanso: '60s', tecnica: '' },
      { nome: 'B', series: '3', reps: '10', descanso: '60s', tecnica: '' },
    ]);
    fireEvent.click(screen.getAllByTitle('Mover para baixo')[0]);
    expect(onChange.mock.calls[0][0].map(e => e.nome)).toEqual(['B', 'A']);
  });

  it('desabilita mover pra cima no primeiro item e pra baixo no último', () => {
    setup([
      { nome: 'A', series: '', reps: '', descanso: '', tecnica: '' },
      { nome: 'B', series: '', reps: '', descanso: '', tecnica: '' },
    ]);
    expect(screen.getAllByTitle('Mover para cima')[0].disabled).toBe(true);
    expect(screen.getAllByTitle('Mover para baixo')[1].disabled).toBe(true);
  });

  it('atualiza um campo mantendo os demais exercícios intactos', () => {
    const onChange = setup([{ nome: 'A', series: '3', reps: '10', descanso: '60s', tecnica: '' }]);
    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Supino' } });
    expect(onChange).toHaveBeenCalledWith([{ nome: 'Supino', series: '3', reps: '10', descanso: '60s', tecnica: '' }]);
  });
});
