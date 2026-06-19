// Upload utility — local filesystem (dev) or R2/S3 (production)
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

let r2Client: S3Client | null = null;

function getR2Client(): S3Client | null {
  if (r2Client) return r2Client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKey || !secretKey) return null;
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
  return r2Client;
}

const BUCKET = process.env.R2_BUCKET || 'bellas-fixhub';

export async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const r2 = getR2Client();
  if (r2) {
    // Upload to Cloudflare R2
    const key = `tickets/${filename}`;
    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    // Return R2 public URL (if bucket is public) or use custom domain
    const r2Dev = process.env.R2_DEV_DOMAIN; // e.g. https://pub-xxx.r2.dev
    if (r2Dev) return `${r2Dev}/${key}`;
    return `/api/uploads/${key}`; // fallback: proxy through our API
  }

  // Local filesystem (dev)
  const { writeFile, mkdir } = await import('fs/promises');
  const path = await import('path');
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, filename);
  await writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}
