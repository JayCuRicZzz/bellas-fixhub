"use client";
// หน้า 404 — แบบเดียวกับระบบใบเสนอราคา (โปสเตอร์ทีมไอที IT iNdY + เลข 0 เป็นมาสคอตนั่งสมาธิ)
//   FixHub มีแต่คนในระบบ (พนักงาน/ช่าง/ไอที) จึงใช้หน้าตา "คนในระบบ" อย่างเดียว
//   ตั้งธีมเองด้วย เพราะ notFound() จากหน้าที่ match route แล้ว Next จะไม่ผ่าน root layout (บทเรียนจากระบบใบเสนอราคา)
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";
import MascotOm from "../components/mascotom";

const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function NotFoundView() {
  useIsoLayout(() => {
    const el = document.documentElement;
    try {
      const saved = localStorage.getItem("fixhub-theme");
      if (saved === "light" || saved === "dark") el.setAttribute("data-theme", saved);
      else if (!el.getAttribute("data-theme")) el.setAttribute("data-theme", "dark");
    } catch { if (!el.getAttribute("data-theme")) el.setAttribute("data-theme", "dark"); }
  }, []);

  const raw = usePathname() ?? "";
  let path = raw;
  try { path = decodeURIComponent(raw); } catch { /* ใช้ของเดิม */ }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-navy-950 px-5 py-12 text-center text-gray-100">
      <div className="mx-auto grid w-full max-w-4xl items-center gap-8 md:grid-cols-[minmax(0,320px)_1fr] md:text-left">
        <div className="nf-float relative mx-auto w-full max-w-[300px]" aria-hidden="true">
          <div className="nf-glow absolute -inset-6 rounded-[28px]"
               style={{ background: "radial-gradient(circle,#FF8A00 0%,transparent 70%)", filter: "blur(26px)" }} />
          <div className="nf-scan relative overflow-hidden rounded-2xl"
               style={{ boxShadow: "0 18px 50px rgba(0,0,0,.45), 0 0 0 3px rgba(255,138,0,.35)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/it-indy-404.jpg" alt="IT iNdY Pattaya — ทีมไอที Bella Villa Group"
                 width={820} height={1093} className="block w-full" />
          </div>
        </div>

        <div>
          <div className="nf-up font-mono text-xs uppercase tracking-wider" style={{ color: "#FF8A00", animationDelay: ".05s" }}>
            system online <span className="nf-flick">·</span> page not found
          </div>
          <h1 className="nf-up mt-1 flex items-baseline justify-center gap-1 font-bold leading-none md:justify-start"
              style={{ fontSize: "clamp(56px,14vw,104px)", color: "#FF8A00", animationDelay: ".1s" }}>
            <span>4</span>
            <MascotOm ariaLabel="0" variant="head"
                      style={{ height: "1.02em", width: "auto", overflow: "visible", marginBottom: "0.06em" }} />
            <span>4</span>
          </h1>
          <p className="nf-up mt-2 text-xl font-semibold text-ink" style={{ animationDelay: ".18s" }}>
            หน้านี้ไม่มีอยู่ในระบบ
          </p>
          <p className="nf-up mt-3 max-w-md text-sm text-gray-400" style={{ animationDelay: ".24s" }}>
            ลิงก์อาจถูกย้าย ถูกลบ หรือพิมพ์ที่อยู่ผิด · ถ้าคิดว่าหน้านี้ควรจะมีอยู่
            แคปหน้าจอนี้ส่งให้ทีมไอทีได้เลย
          </p>
          <div className="nf-up mx-auto mt-4 max-w-md rounded-xl px-3 py-2 text-left md:mx-0"
               style={{ background: "color-mix(in srgb,#FF8A00 10%,rgb(var(--navy-800)))", animationDelay: ".3s" }}>
            <span className="text-xs text-gray-400">ที่อยู่ที่เปิด · requested path</span>
            <div className="select-all break-all font-mono text-xs text-ink">{path || "—"}</div>
          </div>
          <div className="nf-up mt-6 flex flex-wrap justify-center gap-3 md:justify-start" style={{ animationDelay: ".36s" }}>
            <Link className="btn-primary" href="/dashboard">กลับหน้าแรก</Link>
            <Link className="btn-secondary" href="/dashboard/create">แจ้งซ่อมใหม่</Link>
          </div>
          <p className="nf-up mt-8 text-xs text-gray-500" style={{ animationDelay: ".42s" }}>
            IT iNdY Pattaya · Calm mind · Fast fix · Smart support · 📞 094-492-6155
          </p>
        </div>
      </div>
    </main>
  );
}
