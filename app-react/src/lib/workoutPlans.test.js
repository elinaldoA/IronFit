import { describe, it, expect, vi, beforeEach } from 'vitest';

// workoutPlans.js importa lib/supabase.js (createClient() na hora do import
// falha sem VITE_SUPABASE_URL). Mocka db.from(...) com um query builder falso
// que ecoa de volta o payload de insert/update, pra simular o comportamento
// real do Supabase (select().single() após insert devolve a linha inserida).
const { mockDb } = vi.hoisted(() => ({ mockDb: { from: vi.fn() } }));
vi.mock('./supabase', () => ({ db: mockDb }));

import { adjustNivelForVerdict, autoGenerateNextCycle } from './workoutPlans';
import { TODAY_DATE } from '../data/treinoData';

function chainResolving(resultFactory) {
  const chain = {
    _payload: undefined,
    insert(payload) { chain._payload = payload; return chain; },
    update(payload) { chain._payload = payload; return chain; },
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    single: () => Promise.resolve(resolve()),
    maybeSingle: () => Promise.resolve(resolve()),
    then: (resolveFn, reject) => Promise.resolve(resolve()).then(resolveFn, reject),
  };
  function resolve() {
    return typeof resultFactory === 'function' ? resultFactory(chain._payload) : resultFactory;
  }
  return chain;
}

function defaultDbMock() {
  mockDb.from.mockImplementation((table) => {
    if (table === 'workout_plans') {
      return chainResolving((payload) => ({ data: payload ? { id: 'new-plan-id', ...payload } : null, error: null }));
    }
    if (table === 'plan_days') {
      return chainResolving((payload) => ({ data: payload ? { id: 'day-id', ...payload } : null, error: null }));
    }
    return chainResolving({ data: null, error: null }); // plan_exercises
  });
}

beforeEach(() => {
  mockDb.from.mockReset();
  defaultDbMock();
});

describe('adjustNivelForVerdict', () => {
  it('sobe um nível no veredito positivo', () => {
    expect(adjustNivelForVerdict('iniciante', 'positivo')).toBe('intermediario');
    expect(adjustNivelForVerdict('intermediario', 'positivo')).toBe('avancado');
  });

  it('não passa do topo (avancado)', () => {
    expect(adjustNivelForVerdict('avancado', 'positivo')).toBe('avancado');
  });

  it('desce um nível no veredito negativo', () => {
    expect(adjustNivelForVerdict('avancado', 'negativo')).toBe('intermediario');
    expect(adjustNivelForVerdict('intermediario', 'negativo')).toBe('iniciante');
  });

  it('não passa do piso (iniciante)', () => {
    expect(adjustNivelForVerdict('iniciante', 'negativo')).toBe('iniciante');
  });

  it('mantém o nível em veredito neutro ou nível desconhecido', () => {
    expect(adjustNivelForVerdict('intermediario', 'neutro')).toBe('intermediario');
    expect(adjustNivelForVerdict('nivel-invalido', 'positivo')).toBe('nivel-invalido');
  });
});

describe('autoGenerateNextCycle', () => {
  const meta = { peso: 80, altura: 178, meta: 'massa', nivel: 'intermediario', weeklyGoal: 5 };
  const plan = { id: 'expired-plan', duration_weeks: 4 };

  it('gera e ativa um novo ciclo quando não há sucessor configurado', async () => {
    const result = await autoGenerateNextCycle('u1', plan, { verdict: 'positivo' }, meta);

    expect(result.switched).toBe(true);
    expect(result.successorName).toContain('Progressão automática');
    expect(result.successorName).toContain(TODAY_DATE);
  });

  it('ajusta a duração do novo ciclo conforme o veredito', async () => {
    let capturedDuration = null;
    mockDb.from.mockImplementation((table) => {
      if (table === 'workout_plans') {
        return chainResolving((payload) => {
          if (payload?.duration_weeks) capturedDuration = payload.duration_weeks;
          return { data: payload ? { id: 'new-plan-id', ...payload } : null, error: null };
        });
      }
      if (table === 'plan_days') {
        return chainResolving((payload) => ({ data: payload ? { id: 'day-id', ...payload } : null, error: null }));
      }
      return chainResolving({ data: null, error: null });
    });

    await autoGenerateNextCycle('u1', plan, { verdict: 'positivo' }, meta);
    expect(capturedDuration).toBe(3); // 4 semanas base - 1 (antecipa o próximo ciclo)

    await autoGenerateNextCycle('u1', plan, { verdict: 'negativo' }, meta);
    expect(capturedDuration).toBe(6); // 4 semanas base + 2 (mais tempo pra consolidar)
  });

  it('não gera plano se o perfil ainda não tem peso/altura', async () => {
    const result = await autoGenerateNextCycle('u1', plan, { verdict: 'positivo' }, { nivel: 'intermediario' });

    expect(result.switched).toBe(false);
    expect(mockDb.from).not.toHaveBeenCalled();
  });
});
