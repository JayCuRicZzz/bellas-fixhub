// รูปที่ผู้แจ้งถ่าย → JPEG สำหรับ LINE
// LINE รับเฉพาะ JPEG/PNG (originalContentUrl ≤ 10 MB, previewImageUrl ≤ 1 MB) แต่ระบบเก็บรูปเป็น WebP
// → ย่อเหลือด้านยาว 1024 px คุณภาพ 78 (ราว 100–250 KB) ใช้ไฟล์เดียวเป็นทั้งรูปเต็มและรูปตัวอย่าง
import sharp from 'sharp';
import { SUPABASE_URL } from './supabase';
import { IMAGE_BUCKET, uploadImage } from './upload';

export const LINE_MAX_IMAGES = 4;          // 1 ข้อความ + 4 รูป = 5 (เพดานต่อ 1 ครั้งที่ส่งของ LINE)
const LINE_EDGE = 1024;
const PREVIEW_LIMIT = 1024 * 1024;

/** คืน URL รูป JPEG ที่ LINE ใช้ได้ — รูปไหนแปลงไม่สำเร็จจะถูกข้าม (ไม่ throw) */
export async function toLineImageUrls(urls: string[], ticketId: number): Promise<string[]> {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const list = urls.filter(u => typeof u === 'string' && u.startsWith(prefix)).slice(0, LINE_MAX_IMAGES);
  const out = await Promise.all(list.map(async (u, i) => {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const buf = await sharp(Buffer.from(await res.arrayBuffer()), { failOn: 'none' })
        .resize({ width: LINE_EDGE, height: LINE_EDGE, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer();
      if (buf.length > PREVIEW_LIMIT) return null;
      const name = `t${ticketId}-${i + 1}-${Date.now().toString(36)}.jpg`;
      return (await uploadImage(buf, name, 'image/jpeg', 'line')).url;
    } catch (e: any) {
      console.error('[LINE] image convert failed:', e?.message);
      return null;
    }
  }));
  return out.filter((x): x is string => !!x);
}
