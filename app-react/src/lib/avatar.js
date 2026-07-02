import { db } from './supabase';
import { compressImage, assertValidImage } from './imageUtils';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB — tamanho máximo aceito do arquivo original

export async function saveAvatar(userId, file) {
  assertValidImage(file, MAX_UPLOAD_SIZE);

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
