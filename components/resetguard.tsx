'use client';
// บังคับเปลี่ยนรหัสผ่านก่อนใช้งาน: ผู้ใช้ที่แอดมินรีเซ็ต/สร้างด้วยรหัสชั่วคราว (password_reset_required)
// จะถูกส่งไปหน้า /login/set-password ทุกครั้งที่เข้าหน้าในระบบ จนกว่าจะตั้งรหัสใหม่
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './authprovider';

export default function ResetGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const mustReset = !!user?.password_reset_required;
  useEffect(() => { if (mustReset) router.replace('/login/set-password'); }, [mustReset, router]);
  if (mustReset) return null;
  return <>{children}</>;
}
