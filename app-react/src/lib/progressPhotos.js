import { db } from './supabase';
import { compressImage, assertValidImage } from './imageUtils';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB — tamanho máximo aceito do arquivo original

export async function fetchPhotos(userId) {
  const { data, error } = await db
    .from('progress_photos')
    .select('id, photo_date, image_data, note')
    .eq('user_id', userId)
    .order('photo_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addPhoto(userId, { file, date, note }) {
  assertValidImage(file, MAX_UPLOAD_SIZE);

  const dataUrl = await compressImage(file);
  const { data, error } = await db
    .from('progress_photos')
    .insert({ user_id: userId, photo_date: date, image_data: dataUrl, note: note?.trim() || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Conta sem baixar o base64 de cada foto (fetchPhotos seria caro só para contar).
export async function countPhotos(userId) {
  const { count, error } = await db
    .from('progress_photos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count || 0;
}

export async function deletePhoto(id) {
  const { error } = await db.from('progress_photos').delete().eq('id', id);
  if (error) throw error;
}
