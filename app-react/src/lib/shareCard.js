// Desenha um card de progresso num canvas offscreen (mesmo padrão de canvas usado
// em lib/imageUtils.js para compressão de imagem) e retorna um Blob PNG pronto pra
// compartilhar ou baixar.
export function renderShareCard({ nome, streak, treinosSemana, weeklyGoal, totalTreinos }) {
  const width = 1080;
  const height = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0ea5e9');
  gradient.addColorStop(1, '#111827');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';

  ctx.font = '700 42px system-ui, sans-serif';
  ctx.fillText(nome ? `Progresso de ${nome}` : 'Meu progresso', width / 2, 140);

  ctx.font = '900 220px system-ui, sans-serif';
  ctx.fillText(String(streak), width / 2, 480);

  ctx.font = '700 48px system-ui, sans-serif';
  ctx.fillText('dias de sequência 🔥', width / 2, 560);

  ctx.font = '600 40px system-ui, sans-serif';
  ctx.fillText(`${treinosSemana}/${weeklyGoal} treinos esta semana`, width / 2, 720);
  ctx.fillText(`${totalTreinos} treinos no total`, width / 2, 780);

  ctx.font = '500 28px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('Meu Plano', width / 2, height - 60);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export async function shareProgress(data) {
  const blob = await renderShareCard(data);
  if (!blob) throw new Error('Não foi possível gerar a imagem.');

  const file = new File([blob], 'meu-progresso.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Meu progresso', text: 'Confira meu progresso no Meu Plano!' });
    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meu-progresso.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
