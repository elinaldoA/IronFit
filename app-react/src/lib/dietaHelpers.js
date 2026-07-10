import { TODAY_DATE } from '../data/treinoData';

export function mealKey(meal) {
  return `dieta_${TODAY_DATE}_${meal.nome}`;
}

// Escapa tudo e só então reabre `**negrito**` — texto de refeição é editável
// pelo usuário, então nunca pode virar HTML/script arbitrário na tela de outra pessoa.
export function descHtml(text) {
  const escaped = String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return { __html: escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') };
}

export function sumMacros(acc, m) {
  return {
    kcal: acc.kcal + (parseFloat(m.kcal) || 0),
    proteina: acc.proteina + (parseFloat(m.proteina) || 0),
    carboidrato: acc.carboidrato + (parseFloat(m.carboidrato) || 0),
    gordura: acc.gordura + (parseFloat(m.gordura) || 0),
  };
}

// Antes ficava em 0 assim que o macro era excedido, sem indicar o quanto —
// agora guarda o excedente pra exibir "+Xg excedido" em vez de esconder.
export function macroRemaining(goal, value) {
  const diff = Math.round(goal - value);
  return diff >= 0 ? { value: diff, over: false } : { value: -diff, over: true };
}
