"use client";
// หน้าเมื่อระบบขัดข้อง (แบบเดียวกับระบบใบเสนอราคา) — ต่างจาก 404: อันนี้คือ "พังฝั่งเรา"
//   🔑 แสดง digest ให้ผู้ใช้อ่าน/คัดลอกได้ — เป็นรหัสที่ค้นใน Vercel Logs ได้ทันที
//   ⚠ ไม่โชว์ข้อความ error ดิบ
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[fixhub] page error", error); }, [error]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-navy-950 px-5 py-12 text-center text-gray-100">
      <div className="er-pulse" aria-hidden="true">
        <svg width="140" height="140" viewBox="0 0 140 140" fill="none" role="presentation">
          <circle cx="70" cy="70" r="52" fill="var(--warn-bg)" />
          <circle cx="70" cy="70" r="52" stroke="var(--warn-ink)" strokeWidth="2.5" opacity=".55" />
          <rect x="66" y="42" width="8" height="42" rx="4" fill="var(--warn-ink)" />
          <circle cx="70" cy="96" r="5.5" fill="var(--warn-ink)" />
        </svg>
      </div>

      <h1 className="er-up mt-6 text-2xl font-bold text-ink" style={{ animationDelay: ".05s" }}>ระบบขัดข้องชั่วคราว</h1>
      <p className="er-up mt-1 text-base text-gray-300" style={{ animationDelay: ".12s" }}>Something went wrong on our side</p>

      <p className="er-up mt-5 max-w-md text-sm text-gray-400" style={{ animationDelay: ".2s" }}>
        ลองกด “ลองใหม่อีกครั้ง” ก่อน · ถ้ายังไม่ได้ กรุณาแจ้งฝ่ายไอทีพร้อมรหัสด้านล่าง
        <br />
        Please try again. If it keeps happening, send the code below to our IT team.
      </p>

      {error?.digest && (
        <div className="er-up mt-4" style={{ animationDelay: ".26s" }}>
          <div className="text-xs text-gray-500">รหัสอ้างอิง · Reference code</div>
          <code className="select-all font-mono text-sm text-ink">{error.digest}</code>
        </div>
      )}

      <div className="er-up mt-7 flex flex-wrap justify-center gap-3" style={{ animationDelay: ".33s" }}>
        <button type="button" className="btn-primary" onClick={() => reset()}>
          ลองใหม่อีกครั้ง · Try again
        </button>
        <a className="btn-secondary" href="/dashboard">กลับหน้าแรก · Home</a>
      </div>

      <p className="er-up mt-10 text-xs text-gray-500" style={{ animationDelay: ".4s" }}>
        Bella Villa Group · Pattaya · ไอที 📞 094-492-6155
      </p>
    </main>
  );
}
