"use client";
// สวิตช์สว่าง/มืดแบบสไลด์ฉากกลางวัน↔กลางคืน — แบบเดียวกับระบบใบเสนอราคา (bvg-quotation)
//   ลูกบิด: ซ้าย = ดวงอาทิตย์ (สว่าง) · ขวา = พระจันทร์ (มืด)
//   🔑 ภาพทั้งหมดขับด้วย CSS จาก :root[data-theme] (app/globals.css) ไม่ใช่ state ของ React
//      → ไม่กระพริบหลัง hydrate · state เหลือไว้ทำ aria-checked อย่างเดียว
//   ค่าเริ่มต้นของ FixHub = มืด · จำค่าที่ผู้ใช้เลือกไว้ใน localStorage "fixhub-theme"
import { useEffect, useState } from "react";

export const THEME_KEY = "fixhub-theme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(true);
  useEffect(() => { setDark(document.documentElement.getAttribute("data-theme") !== "light"); }, []);

  const flip = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* โหมดส่วนตัว/บล็อก storage */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "light" ? "#eef2f8" : "#0d1423");
    setDark(!dark);
  };

  return (
    <button
      type="button"
      onClick={flip}
      className={"tt-btn " + className}
      role="switch"
      aria-checked={dark}
      aria-label="สลับโหมดสว่าง/มืด"
      title="สลับโหมดสว่าง/มืด"
      data-t="theme-toggle"
      suppressHydrationWarning
    >
      <svg className="tt" viewBox="0 0 64 32" aria-hidden>
        <defs>
          <linearGradient id="ttDay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4FADE4" />
            <stop offset="72%" stopColor="#BFE8F6" />
          </linearGradient>
          <linearGradient id="ttNight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#101838" />
            <stop offset="100%" stopColor="#2C2452" />
          </linearGradient>
          <radialGradient id="ttSun" cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#FFF6D2" />
            <stop offset="100%" stopColor="#FFB531" />
          </radialGradient>
          <clipPath id="ttClip"><rect x="0" y="0" width="64" height="32" rx="16" /></clipPath>
        </defs>

        <g clipPath="url(#ttClip)">
          {/* ── กลางวัน ─────────────────────────────────────────── */}
          <g className="tt-el tt-day">
            <rect width="64" height="32" fill="url(#ttDay)" />
            {/* เนินหน้า — ใช้สีมิ้นต์ของแบรนด์ให้สวิตช์กลืนกับระบบ */}
            <path d="M0 25 Q14 19 26 24 Q40 30 52 22 Q58 19 64 21 L64 32 L0 32 Z" fill="#10B981" opacity=".8" />
            <path d="M0 28.5 Q16 24 30 28.5 Q46 33 64 26.5 L64 32 L0 32 Z" fill="#0B8F62" />
            {/* เมฆ */}
            <g fill="#FFFFFF" opacity=".92">
              <ellipse cx="40" cy="9.5" rx="6" ry="3.1" />
              <ellipse cx="45" cy="10.6" rx="4.4" ry="2.5" />
              <ellipse cx="35.6" cy="11" rx="3.9" ry="2.2" />
              <ellipse cx="54" cy="17.5" rx="4.2" ry="2.2" />
              <ellipse cx="57.4" cy="18.1" rx="3" ry="1.7" />
            </g>
          </g>

          {/* ── กลางคืน ─────────────────────────────────────────── */}
          <g className="tt-el tt-night">
            <rect width="64" height="32" fill="url(#ttNight)" />
            <g fill="#FFFFFF">
              <circle cx="10" cy="8" r=".85" opacity=".9" />
              <circle cx="20" cy="5" r=".6" opacity=".7" />
              <circle cx="27" cy="12" r=".7" opacity=".8" />
              <circle cx="15" cy="17" r=".5" opacity=".6" />
              <circle cx="34" cy="6.5" r=".55" opacity=".7" />
              <circle cx="41" cy="14" r=".5" opacity=".55" />
              <circle cx="8" cy="21" r=".45" opacity=".5" />
              <circle cx="24" cy="21.5" r=".5" opacity=".5" />
              <circle cx="47" cy="8" r=".55" opacity=".6" />
            </g>
            {/* ดาวตก */}
            <path d="M5.5 12.5 L13.5 8.8" stroke="#FFFFFF" strokeWidth=".9" strokeLinecap="round" opacity=".42" />
            {/* เนินเงาดำตัดขอบฟ้า */}
            <path d="M0 26.5 Q12 21.5 24 25.5 Q38 31 52 23.5 Q58 20.5 64 22.5 L64 32 L0 32 Z" fill="#0A1230" />
          </g>

          {/* ── ลูกบิด: ซ้าย = ดวงอาทิตย์ (สว่าง) · ขวา = พระจันทร์ (มืด) ── */}
          <g className="tt-knob">
            <circle cx="16" cy="16.6" r="11.8" fill="#06121A" opacity=".22" />
            <circle className="tt-el tt-day" cx="16" cy="16" r="11.4" fill="url(#ttSun)" />
            <g className="tt-el tt-night">
              <circle cx="16" cy="16" r="11.4" fill="#E9EEF7" />
              <circle cx="12.4" cy="12.8" r="2.2" fill="#C6D0E2" />
              <circle cx="19.4" cy="18.6" r="1.7" fill="#C6D0E2" />
              <circle cx="14.2" cy="20.2" r="1.2" fill="#C6D0E2" />
            </g>
          </g>
        </g>
        {/* ขอบในบาง ๆ ให้เม็ดยาดูมีความลึก */}
        <rect x=".6" y=".6" width="62.8" height="30.8" rx="15.4" fill="none"
              stroke="#000000" strokeOpacity=".18" strokeWidth="1.2" />
      </svg>
    </button>
  );
}
