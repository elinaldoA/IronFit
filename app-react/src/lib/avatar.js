import { db } from './supabase';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB — tamanho máximo aceito do arquivo original
const MAX_DIMENSION = 1024; // px — lado maior após redimensionar
const JPEG_QUALITY = 0.85;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível processar a imagem.'));
    img.src = dataUrl;
  });
}

// Redimensiona (lado maior ≤ 1024px) e recomprime em JPEG antes de salvar,
// mantendo boa qualidade visual sem guardar o arquivo original de até 5MB inteiro.
async function compressImage(file) {
  const original = await fileToDataUrl(file);
  const img = await loadImage(original);

  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = Math.round((height / width) * MAX_DIMENSION);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width / height) * MAX_DIMENSION);
      height = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

export async function saveAvatar(userId, file) {
  if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.');
  if (file.size > MAX_UPLOAD_SIZE) throw new Error('Imagem muito grande (máx. 5MB).');

  const dataUrl = await compressImage(file);
  const { error } = await db
    .from('profiles')
    .upsert({ id: userId, avatar_data: dataUrl }, { onConflict: 'id' });
  if (error) throw error;
  return dataUrl;
}

export async function fetchAvatar(userId) {
  const { data, error } = await db
    .from('profiles')
    .select('avatar_data')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.avatar_data || null;
}
