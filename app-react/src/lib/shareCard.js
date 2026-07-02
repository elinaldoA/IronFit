// Desenha um card de progresso num canvas offscreen (mesmo padrão de canvas usado
// em lib/imageUtils.js para compressão de imagem) e retorna um Blob PNG pronto pra
// compartilhar ou baixar.
function drawStatBox(ctx, x, y, w, h, value, label) {
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 24);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 56px system-ui, sans-serif';
  ctx.fillText(value, x + w / 2, y + h / 2 - 4);

  ctx.font = '500 30px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(label, x + w / 2, y + h / 2 + 44);
}

function drawMiniChart(ctx, x, y, w, h, values, label, unit) {
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 24);
  ctx.fill();

  const padding = 22;
  const chartX = x + padding;
  const chartY = y + 40;
  const chartW = w - padding * 2;
  const chartH = h - 88;

  if (!values || values.length < 2) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 28px system-ui, sans-serif';
    ctx.fillText(values?.length === 1 ? `${values[0]}${unit}` : 'Sem dados ainda', x + w / 2, y + h / 2 + 8);
  } else {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = chartW / (values.length - 1);
    const pointAt = i => ({
      px: chartX + i * stepX,
      py: chartY + chartH - ((values[i] - min) / range) * chartH,
    });

    ctx.beginPath();
    values.forEach((_, i) => {
      const { px, py } = pointAt(i);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    values.forEach((_, i) => {
      const { px, py } = pointAt(i);
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    ctx.textAlign = 'right';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${values[values.length - 1]}${unit}`, x + w - padding, y + 30);
  }

  ctx.textAlign = 'center';
  ctx.font = '500 26px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(label, x + w / 2, y + h - 16);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Watermark discreto (só a logo) pra identificar o app quando o card circula
// fora do IronFit, sem competir visualmente com as estatísticas.
async function drawWatermark(ctx, width, y, height) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, y, width, height);

  try {
    const icon = await loadImage(`${import.meta.env.BASE_URL}icon-192.png`);
    const size = 84;
    ctx.drawImage(icon, width / 2 - size / 2, y + (height - size) / 2, size, size);
  } catch {
    // sem ícone disponível, deixa só a faixa
  }
}

export async function renderShareCard({
  nome, streak, treinosSemana, weeklyGoal, totalTreinos,
  volumeKg = 0, horas = 0, pesoSeries = [], volumeSeries = [],
}) {
  const width = 1080;
  const height = 1620;
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
  ctx.fillText(nome ? `Progresso de ${nome}` : 'Meu progresso', width / 2, 130);

  ctx.font = '900 220px system-ui, sans-serif';
  ctx.fillText(String(streak), width / 2, 440);

  ctx.font = '700 44px system-ui, sans-serif';
  ctx.fillText('dias de sequência 🔥', width / 2, 510);

  const gap = 28;
  const boxW = (width - 80 - gap) / 2;
  const boxH = 170;
  const col1 = 40;
  const col2 = col1 + boxW + gap;
  let row = 590;

  drawStatBox(ctx, col1, row, boxW, boxH, `${treinosSemana}/${weeklyGoal}`, 'treinos esta semana');
  drawStatBox(ctx, col2, row, boxW, boxH, String(totalTreinos), 'treinos no total');

  row += boxH + gap;
  drawStatBox(ctx, col1, row, boxW, boxH, `${volumeKg}kg`, 'volume total levantado');
  drawStatBox(ctx, col2, row, boxW, boxH, `${horas}h`, 'horas treinadas');

  row += boxH + gap;
  drawMiniChart(ctx, col1, row, boxW, boxH, pesoSeries, 'Evolução do peso', 'kg');
  drawMiniChart(ctx, col2, row, boxW, boxH, volumeSeries, 'Volume por treino', 'kg');

  await drawWatermark(ctx, width, height - 140, 140);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export async function shareProgress(data) {
  const blob = await renderShareCard(data);
  if (!blob) throw new Error('Não foi possível gerar a imagem.');

  const file = new File([blob], 'meu-progresso.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Meu progresso', text: 'Confira meu progresso no IronFit! 💪' });
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
