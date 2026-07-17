// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LandingItemListEditor from './LandingItemListEditor';

function renderFields(item, update) {
  return <input placeholder="Título" value={item.title} onChange={e => update({ title: e.target.value })} />;
}

function setup(items) {
  const onChange = vi.fn();
  render(
    <LandingItemListEditor
      items={items} onChange={onChange}
      emptyItem={{ title: '', description: '' }}
      addLabel="Adicionar passo"
      renderFields={renderFields}
    />
  );
  return onChange;
}

describe('LandingItemListEditor', () => {
  it('adiciona um item vazio ao clicar em "+ Adicionar passo"', () => {
    const onChange = setup([]);
    fireEvent.click(screen.getByText('+ Adicionar passo'));
    expect(onChange).toHaveBeenCalledWith([{ title: '', description: '' }]);
  });

  it('remove o item correto ao clicar em ✕', () => {
    const onChange = setup([{ title: 'A', description: '' }, { title: 'B', description: '' }]);
    fireEvent.click(screen.getAllByTitle('Remover')[0]);
    expect(onChange).toHaveBeenCalledWith([{ title: 'B', description: '' }]);
  });

  it('move um item para baixo', () => {
    const onChange = setup([{ title: 'A', description: '' }, { title: 'B', description: '' }]);
    fireEvent.click(screen.getAllByTitle('Mover para baixo')[0]);
    expect(onChange.mock.calls[0][0].map(i => i.title)).toEqual(['B', 'A']);
  });

  it('desabilita mover pra cima no primeiro item e pra baixo no último', () => {
    setup([{ title: 'A', description: '' }, { title: 'B', description: '' }]);
    expect(screen.getAllByTitle('Mover para cima')[0].disabled).toBe(true);
    expect(screen.getAllByTitle('Mover para baixo')[1].disabled).toBe(true);
  });

  it('atualiza um campo mantendo os demais itens intactos', () => {
    const onChange = setup([{ title: 'A', description: 'x' }]);
    fireEvent.change(screen.getByPlaceholderText('Título'), { target: { value: 'Novo' } });
    expect(onChange).toHaveBeenCalledWith([{ title: 'Novo', description: 'x' }]);
  });
});
