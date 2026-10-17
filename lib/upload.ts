// Image upload → Supabase Storage (bucket: ticket-images, public read)
import { supabaseAdmin } from './supabase';
import sharp from 'sharp';

export const IMAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'ticket-images';
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;   // accepted from client (phones send 3–8 MB)
export const MAX_IMAGE_EDGE = 1600;                 // stored size: longest edge ≤ 1600 px
export const IMAGE_QUALITY = 78;                    // WebP quality → typically 80–250 KB per photo
export const MAX_IMAGES_PER_TICKET = 5;

export interface ProcessedImage { buffer: Buffer; contentType: string; ext: string; width: number; height: number }

/** Normalise any uploaded photo: auto-rotate (EXIF), strip metadata, resize, encode as WebP. */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const img = sharp(input, { failOn: 'none', limitInputPixels: 50_000_000 }).rotate();
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error('ไฟล์รูปไม่ถูกต้อง');
  const out = await img
    .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: IMAGE_QUALITY, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: out.data, contentType: 'image/webp', ext: 'webp', width: out.info.width, height: out.info.height };
}

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

export function safeImageFilename(ext: string = 'webp'): string {
  return `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
}
