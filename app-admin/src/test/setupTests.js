// Setup global de testes do app-admin. Registra o cleanup do Testing Library
// depois de cada teste — sem isso, o DOM de um teste fica montado pro
// próximo (vite.config.js não liga test.globals, então o auto-cleanup do
// RTL não se registra sozinho) e queries tipo getAllByTitle passam a
// enxergar elementos de renders antigos.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
