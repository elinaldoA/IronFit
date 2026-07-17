// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkoutTemplateEditor from './WorkoutTemplateEditor';

function day(dia) {
  return { dia, foco: 'Peito', exercicios: [{ nome: 'Supino', series: '4', reps: '8-10', descanso: '90s', tecnica: '' }], pos: [] };
}

describe('WorkoutTemplateEditor', () => {
  it('renderiza um card por dia com o campo "Dia" bloqueado (não editável)', () => {
    render(<WorkoutTemplateEditor days={[day('Segunda'), day('Terça')]} onChange={() => {}} />);
    const diaInputs = screen.getAllByDisplayValue(/Segunda|Terça/);
    expect(diaInputs).toHaveLength(2);
    diaInputs.forEach(input => expect(input.disabled).toBe(true));
  });

  it('editar o foco de um dia não altera os outros dias', () => {
    const onChange = vi.fn();
    render(<WorkoutTemplateEditor days={[day('Segunda'), day('Terça')]} onChange={onChange} />);
    const focoInputs = screen.getAllByDisplayValue('Peito');
    fireEvent.change(focoInputs[0], { target: { value: 'Costas' } });
    const result = onChange.mock.calls[0][0];
    expect(result[0].foco).toBe('Costas');
    expect(result[1].foco).toBe('Peito');
  });
});
