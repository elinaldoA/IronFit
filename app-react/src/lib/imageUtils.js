export const MAX_DIMENSION = 1024; // px — lado maior após redimensionar
export const JPEG_QUALITY = 0.85;

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

export function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível processar a imagem.'));
    img.src = dataUrl;
  });
}

// Redimensiona (lado maior ≤ maxDimension) e recomprime em JPEG antes de salvar,
// mantendo boa qualidade visual sem guardar o arquivo original inteiro.
export async function compressImage(file, { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}) {
  const original = await fileToDataUrl(file);
  const img = await loadImage(original);

  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height / width) * maxDimension);
      width = maxDimension;
    } else {
      width = Math.round((width / height) * maxDimension);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

export function assertValidImage(file, maxUploadSize) {
  if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.');
  if (file.size > maxUploadSize) throw new Error(`Imagem muito grande (máx. ${Math.round(maxUploadSize / (1024 * 1024))}MB).`);
}
