import { describe, it, expect, beforeEach } from 'vitest';
import { getMacroGoals, DEFAULT_MACROS } from './treinoData';

describe('getMacroGoals', () => {
  beforeEach(() => localStorage.clear());

  it('retorna os defaults quando não há usuário nem dados salvos', () => {
    expect(getMacroGoals(null)).toEqual(DEFAULT_MACROS);
  });

  it('calcula macros via Mifflin-St Jeor a partir do perfil completo (homem, massa)', () => {
    const user = { user_metadata: { sexo: 'M', idade: 25, peso: 80, altura: 180, meta: 'massa' } };
    expect(getMacroGoals(user)).toEqual({
      macroKcal: 3217,
      macroProteina: 160,
      macroCarboidrato: 464,
      macroGordura: 80,
      macroAgua: 2.8,
    });
  });

  it('usa BMR feminino (fórmula com -161) quando sexo é F', () => {
    const user = { user_metadata: { sexo: 'F', idade: 25, peso: 80, altura: 180, meta: 'massa' } };
    const macrosF = getMacroGoals(user);
    const macrosM = getMacroGoals({ user_metadata: { ...user.user_metadata, sexo: 'M' } });
    expect(macrosF.macroKcal).toBeLessThan(macrosM.macroKcal);
  });

  it('reduz kcal para o objetivo de emagrecimento e aumenta para massa, a partir do mesmo perfil', () => {
    const base = { sexo: 'M', idade: 30, peso: 90, altura: 175 };
    const massa = getMacroGoals({ user_metadata: { ...base, meta: 'massa' } });
    const emagrecer = getMacroGoals({ user_metadata: { ...base, meta: 'emagrecer' } });
    expect(emagrecer.macroKcal).toBeLessThan(massa.macroKcal);
  });

  it('dá prioridade a um valor de macro salvo explicitamente sobre o calculado', () => {
    const user = { user_metadata: { sexo: 'M', idade: 25, peso: 80, altura: 180, meta: 'massa', macroKcal: 3000 } };
    expect(getMacroGoals(user).macroKcal).toBe(3000);
  });

  it('cai para o valor salvo no localStorage quando o perfil está incompleto', () => {
    localStorage.setItem('profile_macroKcal', '2500');
    expect(getMacroGoals(null).macroKcal).toBe(2500);
  });

  it('não calcula a partir do perfil se faltar qualquer um dos campos (peso/altura/idade/sexo)', () => {
    const user = { user_metadata: { sexo: 'M', idade: 25, peso: 80 } }; // sem altura
    expect(getMacroGoals(user)).toEqual(DEFAULT_MACROS);
  });
});
