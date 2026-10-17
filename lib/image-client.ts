// Client-side image downscale before upload (saves bandwidth on mobile; server re-encodes anyway)
export const CLIENT_MAX_EDGE = 1600;
export const CLIENT_QUALITY = 0.82;

export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, CLIENT_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 600 * 1024) { bitmap.close(); return file; }
    const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); return file; }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', CLIENT_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/** Vercel serverless accepts request bodies up to 4.5 MB — refuse before sending. */
export const UPLOAD_HARD_LIMIT = 4 * 1024 * 1024;

export interface UploadResult { ok: boolean; url?: string; error?: string }

/** Shrink then POST to /api/upload. Never throws. */
export async function uploadImageFile(file: File, extra: Record<string, string> = {}, token?: string | null): Promise<UploadResult> {
  try {
    const small = await shrinkImage(file);
    if (small.size > UPLOAD_HARD_LIMIT) {
      return { ok: false, error: `รูป ${file.name} ใหญ่เกินไป (${(small.size / 1024 / 1024).toFixed(1)} MB) กรุณาถ่ายใหม่หรือเลือกรูปที่เล็กกว่า 4 MB` };
    }
    const fd = new FormData();
    fd.append('image', small);
    for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    const res = await fetch('/api/upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || `อัปโหลดไม่สำเร็จ (${res.status})` };
    return { ok: true, url: data.url };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'อัปโหลดไม่สำเร็จ' };
  }
}
