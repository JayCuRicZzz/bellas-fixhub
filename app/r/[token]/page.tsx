// QR ที่ติดในห้อง/บนอุปกรณ์ชี้มาที่ /r/<token>
//   middleware บังคับ login ก่อน (แล้วพากลับมาที่นี่) → ส่งต่อไปฟอร์มแจ้งซ่อมพร้อมข้อมูลห้อง/อุปกรณ์
import { redirect } from 'next/navigation';

export default function QrRedirect({ params }: { params: { token: string } }) {
  const token = String(params.token || '').replace(/[^a-z0-9]/gi, '').slice(0, 64);
  redirect(`/dashboard/create?qr=${token}`);
}
