# Bellas FixHub v2 🛠️ — ระบบแจ้งซ่อมช่าง + ไอที (Supabase)

> BellaVilla Pattaya Group · 7 สาขา (BV, BP, BC, BM, BB, BE, GB)
> Next.js 14 · Supabase (Postgres + Auth + Storage) · Vercel · LINE Messaging API · Groq AI
> URL: https://bellafixhub.bellavillapattaya.com

## สถาปัตยกรรม

```
[ผู้ใช้/มือถือ] ──► Vercel (Next.js App Router, region sin1)
                      │  middleware: ตรวจ/ต่ออายุ session (Supabase JWT ใน HttpOnly cookie)
                      ├─ /api/*  ──► Supabase Postgres  (schema fixhub, ผ่าน pooler 6543 — postgres.js)
                      │          ──► Supabase Auth       (login / สร้างผู้ใช้ / รีเซ็ตรหัส)
                      │          ──► Supabase Storage    (bucket ticket-images — รูปแนบใบงาน)
                      │          ──► LINE Messaging API  (แจ้งเตือนกลุ่มช่าง / ไอที)
                      │          ──► Groq AI             (แปล EN→TH, AI chat, AI report)
                      └─ Vercel Cron (vercel.json) ──► /api/cron/daily-summary (22:00) · /api/cron/pm-check (ทุกชั่วโมง)
```

- **โปรเจกต์ Supabase:** `bella-hr` (`kiguywlubwxdhvpkexcl`, Singapore) — FixHub ใช้ **schema `fixhub`** แยกจากระบบ HR (`public`)
- **บัญชีผู้ใช้:** Supabase Auth — username ถูก map เป็นอีเมล `<username>@fixhub.bellavilla.local` · ข้อมูล role/สาขา อยู่ใน `fixhub.profiles`
- **Schema SQL:** `supabase/migrations/0001_fixhub_schema.sql`, `0002_fixhub_seed.sql` (apply แล้วบน Supabase)

## ตาราง (schema `fixhub`)

| ตาราง | ใช้ทำอะไร |
|---|---|
| `branches` | 7 สาขา (seed แล้ว) |
| `categories` | 24 หมวดงาน (14 ช่าง + 10 ไอที) |
| `sla_config` | SLA ตาม priority (urgent 2 ชม. … non_urgent 72 ชม.) |
| `profiles` | ผู้ใช้ (FK → `auth.users`) role / department / branch_code / password_reset_required |
| `user_branches` | สาขาที่ผู้ใช้เข้าถึงได้ (หลายสาขา) |
| `tickets` | ใบงาน · เลขที่ `BV-EN-2026-10-00001` (ออกเลขแบบ atomic ด้วย `next_ticket_number()`) |
| `ticket_images` | รูปแนบ (URL จาก Storage) |
| `ticket_activity_log` | ประวัติทุกการกระทำ |
| `pm_schedules` / `pm_logs` | ตาราง PM และประวัติการสร้างใบงานอัตโนมัติ |
| `app_settings` | ค่าตั้ง LINE (บันทึกถาวร ไม่หายเมื่อ redeploy) |
| view `tickets_full` | ใบงาน + ชื่อหมวด/ผู้แจ้ง/ช่าง + `sla_overdue` |

RLS เปิดทุกตาราง (deny-by-default) — ทุกการเข้าถึงผ่าน server เท่านั้น

## ขั้นตอนติดตั้งใช้งานจริง (ทำครั้งเดียว)

### 1. เอาค่าจาก Supabase Dashboard (โปรเจกต์ bella-hr)
1. **Project Settings → API Keys** → copy `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`
2. **Connect (ปุ่มบนสุด) → Transaction pooler** → copy connection string (port **6543**) ใส่รหัสผ่าน DB → `DATABASE_URL`
   - ถ้าลืมรหัสผ่าน DB: Project Settings → Database → Reset database password
3. anon key อยู่ใน `.env.example` แล้ว

### 2. สร้าง secrets
```bash
node -e "console.log('SETUP_KEY='+require('crypto').randomBytes(24).toString('hex'))"
node -e "console.log('CRON_SECRET='+require('crypto').randomBytes(24).toString('hex'))"
```

### 3. สร้างโปรเจกต์บน Vercel (บัญชีเดียวกับ hr.bellavillapattaya.com)
1. Vercel → **Add New → Project** → Import `JayCuRicZzz/bellas-fixhub` → Framework: Next.js (auto) → ยังไม่ต้องกด Deploy
2. **Environment Variables** ใส่ทุกตัวตาม `.env.example` (Production + Preview)
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SETUP_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `LINE_*`, `AI_*`)
   - `CRON_SECRET` สำคัญ: Vercel Cron จะส่ง `Authorization: Bearer <CRON_SECRET>` มาเรียก `/api/cron/*` ให้อัตโนมัติ
3. **Deploy** → ได้ URL `*.vercel.app`
4. **Settings → Domains → Add** `bellafixhub.bellavillapattaya.com`
   - โดเมน `bellavillapattaya.com` ใช้กับ `hr.` บน Vercel อยู่แล้ว → ถ้า DNS อยู่ที่ผู้ให้บริการภายนอก เพิ่ม record
     `CNAME  bellafixhub  →  cname.vercel-dns.com` (Vercel จะบอกค่าที่ถูกต้องในหน้า Domains) · SSL ออกให้อัตโนมัติ
5. **Settings → Cron Jobs** ตรวจว่ามี 2 งาน (daily-summary 15:00 UTC = 22:00 ไทย, pm-check ทุกชั่วโมง)
   > แพลน Hobby จำกัด cron วันละครั้ง — ถ้าไม่ได้ใช้ Pro ให้แก้ `vercel.json` pm-check เป็น `"0 0 * * *"` (07:00 ไทย)

### 4. ตรวจสุขภาพระบบ
```
GET https://bellafixhub.bellavillapattaya.com/api/health
```
ต้องได้ `"ok": true` และ `"db": "ok (7 branches)"`

### 5. สร้างบัญชี admin คนแรก (ครั้งเดียว)
```bash
curl -X POST https://bellafixhub.bellavillapattaya.com/api/setup \
  -H "Content-Type: application/json" \
  -d '{"setup_key":"<SETUP_KEY>","username":"admin","password":"<รหัสผ่านอย่างน้อย 8 ตัว>","full_name":"ผู้ดูแลระบบ"}'
```
จากนั้น login ที่ `/login` → สร้างผู้ใช้คนอื่นที่ `/dashboard/admin` (เว้นรหัสว่าง = ระบบออกรหัสชั่วคราวให้ และบังคับเปลี่ยนตอน login ครั้งแรก)

### 6. ตั้งค่า LINE
`/dashboard/admin/line-settings` → ใส่ Channel access token + Group ID กลุ่มช่าง / กลุ่มไอที → กดทดสอบ

## รันในเครื่อง
```bash
cp .env.example .env.local   # ใส่ค่าจริง
npm install
npm run dev                  # http://localhost:3000
npm run typecheck            # ตรวจ TypeScript
```

## สิทธิ์ตาม role

| role | ทำอะไรได้ |
|---|---|
| `admin` | ทุกอย่าง + จัดการผู้ใช้ / PM / LINE |
| `gm` | ดูทุกสาขา อนุมัติ/ตีกลับ ให้คะแนน (รับงานไม่ได้) |
| `sup` / `supit` | หัวหน้าช่าง / หัวหน้าไอที: รับงาน ปิดงาน อนุมัติ ตีกลับ ระดับความยาก ให้คะแนน |
| `tech` / `it` | ช่าง / ไอที: รับงาน เริ่ม พักงาน ปิดงาน |
| `front` / `house` | ผู้แจ้ง: สร้างใบงาน ธงแดง (งานไม่เรียบร้อย) ให้คะแนน |

Workflow: `PENDING → (ACCEPTED) IN_PROGRESS ⇄ PAUSED → RESOLVED → APPROVED` · ตีกลับ/ธงแดง → กลับ `PENDING` · `CANCELLED`

## API

| Method | Path | หมายเหตุ |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` · `/api/auth/set-password` | Supabase Auth |
| GET | `/api/auth/me` | ผู้ใช้ปัจจุบัน + สาขา |
| GET/POST | `/api/tickets` | รายการ (filter: status, branch, department, q, limit) / สร้าง |
| GET/PUT | `/api/tickets/[id]` | รายละเอียด / เปลี่ยนสถานะ, คะแนน, ความยาก |
| GET | `/api/tickets/log/[id]` | activity log |
| POST/GET | `/api/upload` | อัปโหลดรูป → Supabase Storage |
| GET | `/api/categories` · `/api/sla` | ข้อมูลอ้างอิง |
| GET | `/api/reports/daily` · `performance` · `tech-performance` · `aircon` | รายงาน (เวลาไทย) |
| GET/POST, PUT/DELETE | `/api/pm` · `/api/pm/[id]` | ตาราง PM (admin) |
| GET/POST/PUT/PATCH/DELETE | `/api/admin/users` · `/api/admin/users/[id]` | จัดการผู้ใช้ (admin) |
| GET/POST | `/api/admin/line-config` | ตั้งค่า LINE + ทดสอบส่ง (`{"action":"test","group":"IT"}`) |
| GET | `/api/cron/daily-summary` · `/api/cron/pm-check` | ต้องส่ง `x-cron-key: CRON_SECRET` |
| POST/GET | `/api/setup` | bootstrap admin (ต้อง `SETUP_KEY`) |
| GET | `/api/health` | ตรวจ env + DB |

## Troubleshooting

| อาการ | แก้ |
|---|---|
| `/api/health` → `database_url: false` หรือ db error | ตรวจ `DATABASE_URL` ใช้ pooler port 6543 และรหัสผ่านถูก |
| login ได้แต่ขึ้น "ยังไม่ได้รับสิทธิ์ใช้งาน FixHub" | บัญชีมีใน Auth แต่ไม่มีแถวใน `fixhub.profiles` → ให้ admin สร้างผู้ใช้ใหม่ หรือ insert profile ให้ auth user เดิม |
| สร้างผู้ใช้ไม่ได้ / 500 | `SUPABASE_SERVICE_ROLE_KEY` ไม่ถูกต้อง |
| รูปไม่ขึ้น | bucket `ticket-images` ต้องเป็น public (seed ตั้งไว้แล้ว) |
| LINE ไม่ส่ง | ตรวจ token/Group ID ที่ `/dashboard/admin/line-settings` แล้วกดทดสอบ |
| cron ไม่ทำงาน | ตั้ง `CRON_SECRET` ใน Vercel env (Vercel ส่งเป็น Bearer ให้เอง) · ดู Vercel → Logs → Cron |

---
🛠️ พัฒนาโดย นายเดชาธร เดชอนุรักษ์ · 👾 JayCuRicZzz · IT Manager · Group BellaVillaPattaya · 📞 094-492-6155
