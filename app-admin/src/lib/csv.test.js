import { describe, it, expect } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('gera cabeçalho e linhas na ordem das colunas', () => {
    const csv = toCsv(
      [{ email: 'a@b.com', is_admin: true }, { email: 'c@d.com', is_admin: false }],
      [{ key: 'email', label: 'Email' }, { key: 'is_admin', label: 'Admin' }]
    );
    expect(csv).toBe('Email,Admin\na@b.com,true\nc@d.com,false');
  });

  it('escapa células com vírgula, aspas ou quebra de linha', () => {
    const csv = toCsv([{ nome: 'Silva, João "Jota"' }], [{ key: 'nome', label: 'Nome' }]);
    expect(csv).toBe('Nome\n"Silva, João ""Jota"""');
  });

  it('trata valores nulos/indefinidos como célula vazia', () => {
    const csv = toCsv([{ x: null, y: undefined }], [{ key: 'x', label: 'X' }, { key: 'y', label: 'Y' }]);
    expect(csv).toBe('X,Y\n,');
  });
});
