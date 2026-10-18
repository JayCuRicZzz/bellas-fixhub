// ★ 12 ก.ย. 2569 — มาสคอตนั่งสมาธิของทีมไอที (IT SUPPORT · PEOPLE. IDEAS. BEYOND.)
//   วาดเป็น SVG จาก **ภาพที่พี่เจวาดไว้เอง** (พี่ส่งไฟล์มาแล้วสั่ง "เอาไปแปลงให้เป็นแบบนี้")
//   ❗ ใช้ 2 ที่แล้ว (หน้า 404 ฝั่งคนใน + หน้าเข้าสู่ระบบ) — แก้ที่นี่ที่เดียว เปลี่ยนทั้งสองหน้า
//
//   📐 ทุกพิกัดในไฟล์นี้ **วัดจากรูปต้นฉบับจริง ไม่ได้กะเอา**
//      (ทำ mask สีใน numpy → หาจุดกึ่งกลางดอก · รัศมีปลายกลีบ · จำนวนกลีบจากยอดของกราฟรัศมีรายมุม
//       · กรอบตา · จุดขาว · แนวไหล่/ปลอกแขน/ข้อมือ/ตัก แล้วสเกลลงมาที่ viewBox นี้)
//      ผลที่วัดได้: กลีบ **12 กลีบ** ห่างกัน 30.0° · ปลายกลีบรัศมี 344px · จานหน้ารัศมี ~0.60 ของปลายกลีบ
//      ตาอยู่ **ใต้** กลางดอก 0.18R · จุดขาวอยู่กลางดอกพอดี · สีส้ม #FA7A22 · ตาเกือบดำสนิท #0D0D0D
//
//   viewBox 208×316 (สัดส่วน 0.658 — ต้นฉบับ 0.650)
//   กลางดอก (104,100) · ปลายกลีบรัศมี 100 · จานหน้ารัศมี 60 · ก้นที่นั่งอยู่ที่ y≈314
const CX = 104, CY = 100, R_TIP = 100, R_DISC = 60;
const OR = "#FA7A22";        // ส้มหลัก (ค่าเฉลี่ยที่วัดได้จากกลีบ/จานหน้า)
const OR_DEEP = "#E0701B";   // ส้มเข้ม — ขอบและเงา
const OR_LITE = "#FF9448";   // ส้มอ่อน — ไฮไลต์บนปลอกแขน/ลูกประคำ
const EYE = "#0D0D0D";
const ROBE = "#FFFFFF", ROBE_SHADE = "#EAE5E4", ROBE_LINE = "#DAD3D2";

/** ลูกประคำ: สุ่มไม่ได้ ต้องคงที่ทุกครั้งที่เรนเดอร์ → คำนวณจากเส้นโค้งเบซิเยร์กำลังสอง */
function beads(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n: number) {
  const out: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / (n + 1), u = 1 - t;
    out.push({
      x: u * u * x0 + 2 * u * t * cx + t * t * x1,
      y: u * u * y0 + 2 * u * t * cy + t * t * y1,
      r: 2.9 + 2.2 * t,            // เม็ดใหญ่ขึ้นเรื่อย ๆ ตอนลงไปหาจี้ ตามต้นฉบับ
    });
  }
  return out;
}
const MALA_L = beads(84, 164, 82, 216, 104, 228, 9);
const MALA_R = beads(124, 164, 126, 216, 104, 228, 9);

export default function MascotOm({
  className = "nf-om",
  ariaLabel,
  style,
  x, y, width, height,
  pedestal = false,
  variant = "full",
}: {
  className?: string;
  /** ใส่เมื่อมาสคอตทำหน้าที่แทนตัวอักษร (หน้า 404 ใช้แทนเลข 0) · ไม่ใส่ = ภาพประกอบ ซ่อนจากโปรแกรมอ่านหน้าจอ */
  ariaLabel?: string;
  style?: React.CSSProperties;
  /** ใส่ 4 ตัวนี้เมื่อเอาไปวางซ้อนใน <svg> ของฉากอื่น (หน้าเข้าสู่ระบบวางไว้ใต้โคมไฟ) */
  x?: number; y?: number; width?: number; height?: number;
  /** วาดแท่นส้มใต้ก้นแบบในรูปต้นฉบับด้วย — ไม่ใส่ป้าย "IT SUPPORT" เพราะขนาดที่ใช้จริงอ่านไม่ออก กลายเป็นขี้มูก */
  pedestal?: boolean;
  /** "full" = ทั้งตัวนั่งสมาธิ · "head" = เฉพาะหัวดอก (หน้า 404 ใช้แทนเลข 0 — ทั้งตัวจะผอมสูงจนไม่เป็นเลข 0) */
  variant?: "full" | "head";
}) {
  const headOnly = variant === "head";
  const label = ariaLabel
    ? { role: "img" as const, "aria-label": ariaLabel }
    : { "aria-hidden": true as const };
  return (
    <svg className={className} viewBox={`0 0 208 ${headOnly ? 200 : pedestal ? 372 : 316}`} {...label} style={style}
         x={x} y={y} width={width} height={height}>
      {!headOnly && (<>
      {pedestal && (
        /* แท่นนั่ง — ต้นฉบับเป็นโต๊ะหมู่ขาสั้น */
        <g>
          <rect x="14" y="316" width="180" height="12" rx="4" fill={OR_LITE} />
          <rect x="20" y="326" width="168" height="22" rx="4" fill={OR} />
          <rect x="24" y="346" width="28" height="22" rx="4" fill={OR_DEEP} />
          <rect x="156" y="346" width="28" height="22" rx="4" fill={OR_DEEP} />
          <path d="M52 348 Q104 364 156 348 L156 346 L52 346 Z" fill={OR_DEEP} opacity=".55" />
        </g>
      )}

      {/* ══ ตัว — วาดก่อนหัว เพราะกลีบล่างต้องทับไหล่เหมือนต้นฉบับ ══════════
          ลำดับ: ลำตัว → แขน → ตัก → มือ
          (แขนต้องอยู่ **หน้า** ลำตัว ไม่งั้นขาวชนขาวแล้วมองไม่เห็นว่ามีแขน) */}
      <g stroke={OR_DEEP} strokeOpacity=".5" strokeWidth="2.2" strokeLinejoin="round">
        {/* ลำตัว — ไหล่กว้าง ~0.62 ของความกว้างดอก ตามสัดส่วนต้นฉบับ */}
        <path d="M104 166 C72 166 47 178 43 203 L41 255 C39 271 55 280 75 280 L133 280 C153 280 169 271 167 255 L165 203 C161 178 136 166 104 166 Z"
              fill={ROBE} />
      </g>

      {/* คอเสื้อไขว้ + รอยพับบนลำตัว (ต้องมาก่อนแขน ไม่งั้นเส้นพาดข้ามแขน) */}
      <g fill="none" stroke={ROBE_LINE} strokeWidth="2.2" strokeLinecap="round">
        <path d="M84 172 L104 204 L124 172" />
        <path d="M104 206 L70 250" strokeOpacity=".75" />
      </g>

      {/* ⚠ อย่าเอาแขน (เส้นหนาสีขาว) ไปไว้ใน <g> ที่ตั้ง strokeOpacity ไว้
          ลูกจะสืบทอด strokeOpacity แม้เขียนทับ stroke แล้ว → ขาว 55% บนพื้นดำ = ก้อนเทาที่ไหล่ (เจอมาแล้ว) */}
      <g fill="none" strokeWidth="27" strokeLinecap="round">
        <path d="M52 208 C36 230 41 256 74 268" stroke={OR_DEEP} strokeWidth="29.5" strokeOpacity=".45" />
        <path d="M156 208 C172 230 167 256 134 268" stroke={OR_DEEP} strokeWidth="29.5" strokeOpacity=".45" />
        <path d="M52 208 C36 230 41 256 74 268" stroke={ROBE} strokeOpacity="1" />
        <path d="M156 208 C172 230 167 256 134 268" stroke={ROBE} strokeOpacity="1" />
      </g>

      {/* ตักและขาขัดสมาธิ — อยู่หน้าแขนท่อนล่าง */}
      <path d="M12 314 C2 300 5 279 31 271 C59 262 86 269 104 275 C122 269 149 262 177 271 C203 279 206 300 196 314 Z"
            fill={ROBE} stroke={OR_DEEP} strokeOpacity=".5" strokeWidth="2.2" strokeLinejoin="round" />
      <g fill="none" stroke={ROBE_LINE} strokeWidth="2.2" strokeLinecap="round" strokeOpacity=".55">
        <path d="M44 294 Q72 288 98 297" />
        <path d="M164 294 Q136 288 110 297" />
      </g>

      {/* ปลอกแขน + ปลอกข้อมือ — วางบนเส้นแขนจริง (คำนวณจุดบนเบซิเยร์ที่ t≈0.2 และ 0.85) */}
      <g>
        <rect x="26" y="221" width="36" height="15" rx="7" fill={OR} transform="rotate(-8 44 228)" />
        <rect x="26" y="221" width="36" height="5" rx="2.5" fill={OR_LITE} transform="rotate(-8 44 228)" />
        <rect x="146" y="221" width="36" height="15" rx="7" fill={OR} transform="rotate(8 164 228)" />
        <rect x="146" y="221" width="36" height="5" rx="2.5" fill={OR_LITE} transform="rotate(8 164 228)" />
        <rect x="53" y="255" width="26" height="14" rx="6.5" fill={OR} transform="rotate(20 66 262)" />
        <rect x="129" y="255" width="26" height="14" rx="6.5" fill={OR} transform="rotate(-20 142 262)" />
      </g>

      {/* มือประสานบนตัก */}
      <ellipse cx="104" cy="268" rx="24" ry="11" fill={ROBE} stroke={OR_DEEP} strokeOpacity=".5" strokeWidth="2.2" />
      <path d="M93 267 Q104 262 115 267" fill="none" stroke={ROBE_LINE} strokeWidth="2.2" strokeLinecap="round" />

      {/* ลูกประคำ — เม็ดโตขึ้นเรื่อย ๆ ลงมาหาจี้กลม ตามต้นฉบับ · เม็ดบนสุดจะถูกหัวดอกบังพอดี */}
      <g>
        {[...MALA_L, ...MALA_R].map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={OR} />
        ))}
        <circle cx="104" cy="236" r="10" fill={OR_DEEP} />
        <circle cx="104" cy="233" r="7" fill={OR} />
        <circle cx="101.6" cy="231" r="2.2" fill={OR_LITE} />
      </g>

      </>)}

      {/* ══ หัวดอกไม้ ══════════════════════════════════════════════════════ */}
      {/* 12 กลีบ — วาดเป็นเส้นหนาปลายมน (แคปซูล) รัศมี 44→83 กว้าง 34 → ปลายสุดพอดี 100
          หมุนเริ่มที่ 15° เพราะต้นฉบับ **ไม่มีกลีบชี้ขึ้นตรง ๆ** มีร่องอยู่กลางบน */}
      <g className="nf-svg nf-petal">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={CX} y1={CY - 44} x2={CX} y2={CY - 83}
                stroke={OR} strokeWidth="34" strokeLinecap="round"
                transform={`rotate(${i * 30 + 15} ${CX} ${CY})`} />
        ))}
      </g>
      <circle cx={CX} cy={CY} r={R_DISC} fill={OR} />

      {/* จุดขาวกลางหน้าผาก — อยู่ตรงกลางดอกพอดี (วัดแล้ว) */}
      <circle cx={CX} cy="102" r="4.2" fill="#FFFFFF" />
      <circle cx={CX} cy="102" r="4.2" fill="none" stroke={OR_DEEP} strokeWidth=".7" strokeOpacity=".35" />

      {/* ตาหลับ — พระจันทร์เสี้ยวปลายแหลม ไม่ใช่เส้นหนาเท่ากันทั้งเส้น */}
      <path d="M68 114 Q81.5 138 95 114 Q81.5 122 68 114 Z" fill={EYE} />
      <path d="M113 114 Q126.5 138 140 114 Q126.5 122 113 114 Z" fill={EYE} />
    </svg>
  );
}
