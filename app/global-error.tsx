"use client";
// พังตั้งแต่ root layout (error.tsx จับไม่ได้) — ต้องมี <html>/<body> เอง และไม่พึ่ง CSS ของระบบ
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
                     background: "#0a0f1a", color: "#e5e7eb", fontFamily: "Sarabun, 'Noto Sans Thai', sans-serif", textAlign: "center", padding: 20 }}>
        <div>
          <div style={{ fontSize: 56 }}>⚠️</div>
          <h1 style={{ fontSize: 24, margin: "12px 0 4px" }}>ระบบขัดข้องชั่วคราว</h1>
          <p style={{ opacity: .75, margin: 0 }}>Something went wrong on our side</p>
          {error?.digest && <p style={{ marginTop: 16, fontSize: 13 }}>รหัสอ้างอิง: <code>{error.digest}</code></p>}
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => reset()} style={{ background: "#d4a825", color: "#0a0f1a", border: 0, borderRadius: 10, padding: "12px 20px", fontWeight: 700, cursor: "pointer" }}>ลองใหม่อีกครั้ง</button>
            <a href="/dashboard" style={{ color: "#d4a825", padding: "12px 20px" }}>กลับหน้าแรก</a>
          </div>
          <p style={{ marginTop: 32, fontSize: 12, opacity: .6 }}>ไอที 📞 094-492-6155</p>
        </div>
      </body>
    </html>
  );
}
