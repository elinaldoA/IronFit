export function imcInfo(peso, altura) {
  if (!peso || !altura || peso < 30 || altura < 100) return null;
  const imc = peso / ((altura / 100) ** 2);
  const cls =
    imc < 18.5 ? 'Abaixo do peso' :
    imc < 25 ? 'Peso normal' :
    imc < 30 ? 'Sobrepeso' :
    imc < 35 ? 'Obesidade grau I' : 'Obesidade grau II+';
  return { value: imc.toFixed(1), cls };
}

export function metaProgress(pesoAtual, pesoAlvo, weightLogs) {
  if (!pesoAtual || !pesoAlvo) return null;
  const diff = pesoAtual - pesoAlvo;
  if (Math.abs(diff) < 0.1) return { done: true, msg: '🎉 Meta de peso alcançada!' };

  const first = weightLogs[0]?.peso ?? pesoAtual;
  const totalSpan = Math.abs(first - pesoAlvo) || 1;
  const covered = Math.abs(first - pesoAtual);
  const pct = Math.max(0, Math.min(100, (covered / totalSpan) * 100));
  const msg = `Faltam ${Math.abs(diff).toFixed(1)}kg para a meta de ${pesoAlvo}kg`;
  return { done: false, pct, msg };
}
