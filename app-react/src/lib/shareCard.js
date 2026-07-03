import { formatDuration } from './utils';
import { getMuscleGroupsForDay } from '../data/treinoData';
import { FRONT_MUSCLE_PATHS, BACK_MUSCLE_PATHS, BODY_VIEW_SIZE } from '../data/bodyMuscleMap';
import bodyAnatomyImg from '../assets/body-anatomy.jpg';

// Desenha um card de resumo do treino num canvas offscreen (mesmo padrão de canvas
// usado em lib/imageUtils.js para compressão de imagem) e retorna um Blob PNG pronto
// pra compartilhar ou baixar.
const CARD_WIDTH = 1080;
const PAD_X = 40;
const CONTENT_W = CARD_WIDTH - PAD_X * 2;
const WATERMARK_H = 130;

const BODY_BOX_W = 220;
const BODY_BOX_H = Math.round((BODY_BOX_W * BODY_VIEW_SIZE.height) / BODY_VIEW_SIZE.width);
const BODY_BOX_GAP = 32;
const BODY_TITLE_H = 60;
const BODY_LABEL_H = 36;
const BODY_SECTION_H = BODY_TITLE_H + BODY_BOX_H + BODY_LABEL_H;
const MUSCLE_FILL = 'rgba(56,189,248,0.55)';
const MUSCLE_STROKE = 'rgba(56,189,248,0.9)';

const ROW_PAD = 24;
const NAME_H = 40;
const NAME_TO_PILLS_GAP = 14;
const PILL_H = 46;
const PILL_GAP_Y = 12;
const PILL_GAP_X = 14;
const PILL_PAD_X = 16;

// ctx.roundRect() não existe no Firefox < 112 nem no Safari < 16, então o caminho
// arredondado é montado manualmente em vez de depender da API nativa.
function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStatBox(ctx, x, y, w, h, value, label) {
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundedRectPath(ctx, x, y, w, h, 24);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 52px system-ui, sans-serif';
  ctx.fillText(value, x + w / 2, y + h / 2 - 4);

  ctx.font = '500 28px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(label, x + w / 2, y + h / 2 + 42);
}

function drawProgressBar(ctx, x, y, w, label, doneText, pct) {
  ctx.textAlign = 'left';
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, x, y);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(doneText, x + w, y);

  const barY = y + 20;
  const barH = 26;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundedRectPath(ctx, x, barY, w, barH, barH / 2);
  ctx.fill();

  const fillW = Math.max(barH, (w * pct) / 100);
  ctx.fillStyle = '#38bdf8';
  roundedRectPath(ctx, x, barY, fillW, barH, barH / 2);
  ctx.fill();
}

function measureChips(ctx, sets) {
  ctx.font = '600 26px system-ui, sans-serif';
  return (sets || []).map(s => {
    const text = `${s.reps ?? '–'}× ${s.carga ?? '–'}kg`;
    return { text, width: ctx.measureText(text).width + PILL_PAD_X * 2, done: s.done };
  });
}

function layoutChips(chips, maxW) {
  const lines = [];
  let line = [];
  let lineW = 0;
  chips.forEach(chip => {
    const w = chip.width + (line.length ? PILL_GAP_X : 0);
    if (lineW + w > maxW && line.length) {
      lines.push(line);
      line = [chip];
      lineW = chip.width;
    } else {
      line.push(chip);
      lineW += w;
    }
  });
  if (line.length) lines.push(line);
  return lines;
}

function exerciseRowHeight(lines) {
  const pillsH = lines.length ? lines.length * PILL_H + (lines.length - 1) * PILL_GAP_Y : 0;
  return ROW_PAD + NAME_H + (lines.length ? NAME_TO_PILLS_GAP + pillsH : 0) + ROW_PAD;
}

function drawExerciseRow(ctx, x, y, w, h, exercise, lines) {
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundedRectPath(ctx, x, y, w, h, 20);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(exercise.nome, x + ROW_PAD, y + ROW_PAD + 28);

  let py = y + ROW_PAD + NAME_H + NAME_TO_PILLS_GAP;
  lines.forEach(line => {
    let px = x + ROW_PAD;
    line.forEach(chip => {
      ctx.fillStyle = chip.done ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.12)';
      roundedRectPath(ctx, px, py, chip.width, PILL_H, PILL_H / 2);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.font = '600 26px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(chip.text, px + chip.width / 2, py + PILL_H / 2 + 9);

      px += chip.width + PILL_GAP_X;
    });
    py += PILL_H + PILL_GAP_Y;
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Recorta a metade (frente ou costas) de body-anatomy.jpg dentro de um box
// arredondado e pinta por cima os mesmos hotspots de músculo do BodyAvatar.
function drawBodyView(ctx, img, x, y, w, h, srcX, paths, activeGroups, label) {
  roundedRectPath(ctx, x, y, w, h, 16);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(x, y, w, h);
  ctx.drawImage(img, srcX, 0, BODY_VIEW_SIZE.width, BODY_VIEW_SIZE.height, x, y, w, h);

  ctx.translate(x, y);
  ctx.scale(w / BODY_VIEW_SIZE.width, h / BODY_VIEW_SIZE.height);
  ctx.lineWidth = 3;
  paths.forEach(p => {
    if (!activeGroups.has(p.muscle)) return;
    const path = new Path2D(p.d);
    ctx.fillStyle = MUSCLE_FILL;
    ctx.fill(path);
    ctx.strokeStyle = MUSCLE_STROKE;
    ctx.stroke(path);
  });
  ctx.restore();

  roundedRectPath(ctx, x, y, w, h, 16);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(label, x + w / 2, y + h + 30);
}

async function drawBodyAvatarSection(ctx, x, y, contentW, day) {
  ctx.textAlign = 'left';
  ctx.font = '700 32px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Músculos trabalhados', x, y + 32);

  const activeGroups = day ? getMuscleGroupsForDay(day) : new Set();
  const img = await loadImage(bodyAnatomyImg);

  const totalW = BODY_BOX_W * 2 + BODY_BOX_GAP;
  const startX = x + (contentW - totalW) / 2;
  const boxY = y + BODY_TITLE_H;

  drawBodyView(ctx, img, startX, boxY, BODY_BOX_W, BODY_BOX_H, 0, FRONT_MUSCLE_PATHS, activeGroups, 'Frente');
  drawBodyView(ctx, img, startX + BODY_BOX_W + BODY_BOX_GAP, boxY, BODY_BOX_W, BODY_BOX_H, BODY_VIEW_SIZE.width, BACK_MUSCLE_PATHS, activeGroups, 'Costas');
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

export async function renderWorkoutSummaryCard(summary) {
  const {
    day, durationMs, totalCarga, weekDone, weekTotal,
    exercises = [], totalSetsDone, totalPlannedSets,
  } = summary;

  const measureCtx = document.createElement('canvas').getContext('2d');
  const exerciseLayouts = exercises.map(ex => {
    const chips = measureChips(measureCtx, ex.sets);
    const lines = layoutChips(chips, CONTENT_W - ROW_PAD * 2);
    return { ex, lines, rowH: exerciseRowHeight(lines) };
  });

  const headerH = 190;
  const statsGap = 24;
  const statBoxH = 160;
  const progressH = 90;
  const sectionGap = 36;
  const exercisesTitleH = exerciseLayouts.length ? 60 : 0;
  const rowGap = 20;
  const exercisesH = exerciseLayouts.reduce((sum, l) => sum + l.rowH + rowGap, 0);

  const height = 60 + headerH + statBoxH * 2 + statsGap + sectionGap + progressH + sectionGap +
    BODY_SECTION_H + sectionGap + exercisesTitleH + exercisesH + WATERMARK_H + 40;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, height);
  gradient.addColorStop(0, '#0ea5e9');
  gradient.addColorStop(1, '#111827');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 40px system-ui, sans-serif';
  ctx.fillText('🏁 Treino concluído!', CARD_WIDTH / 2, 90);

  ctx.font = '600 32px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`${day?.dia ?? ''}${day?.foco ? ' · ' + day.foco : ''}`, CARD_WIDTH / 2, 140);

  let y = 60 + headerH;
  const boxW = (CONTENT_W - statsGap) / 2;

  drawStatBox(ctx, PAD_X, y, boxW, statBoxH, formatDuration(durationMs), 'duração');
  drawStatBox(ctx, PAD_X + boxW + statsGap, y, boxW, statBoxH, `${(totalCarga || 0).toLocaleString('pt-BR')}kg`, 'carga total');

  y += statBoxH + statsGap;
  drawStatBox(ctx, PAD_X, y, boxW, statBoxH, `${totalSetsDone}/${totalPlannedSets}`, 'séries concluídas');
  drawStatBox(ctx, PAD_X + boxW + statsGap, y, boxW, statBoxH, String(exercises.length), 'exercícios');

  y += statBoxH + sectionGap;
  const weekPct = weekTotal ? Math.min(100, (weekDone / weekTotal) * 100) : 0;
  drawProgressBar(ctx, PAD_X, y, CONTENT_W, 'Meta da semana', `${weekDone}/${weekTotal}`, weekPct);

  y += progressH + sectionGap;

  await drawBodyAvatarSection(ctx, PAD_X, y, CONTENT_W, day);
  y += BODY_SECTION_H + sectionGap;

  if (exerciseLayouts.length) {
    ctx.textAlign = 'left';
    ctx.font = '700 32px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Detalhes das séries', PAD_X, y + 32);
    y += exercisesTitleH;

    exerciseLayouts.forEach(({ ex, lines, rowH }) => {
      drawExerciseRow(ctx, PAD_X, y, CONTENT_W, rowH, ex, lines);
      y += rowH + rowGap;
    });
  }

  await drawWatermark(ctx, CARD_WIDTH, height - WATERMARK_H, WATERMARK_H);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export async function shareWorkoutSummary(summary) {
  const blob = await renderWorkoutSummaryCard(summary);
  if (!blob) throw new Error('Não foi possível gerar a imagem.');

  const file = new File([blob], 'meu-treino.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Meu treino', text: 'Confira meu treino no IronFit! 💪' });
    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meu-treino.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
