// Image upload → Supabase Storage (bucket: ticket-images, public read)
import { supabaseAdmin } from './supabase';

export const IMAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'ticket-images';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface UploadedImage {
  url: string;
  path: string;
}

export async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: string = 'tickets'
): Promise<UploadedImage> {
  const supabase = supabaseAdmin();
  const path = `${folder}/${filename}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, buffer, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function deleteImage(path: string): Promise<void> {
  const supabase = supabaseAdmin();
  await supabase.storage.from(IMAGE_BUCKET).remove([path]);
}

export function safeImageFilename(originalName: string): string {
  const ext = (originalName.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
}
