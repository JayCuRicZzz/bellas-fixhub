# Bellas FixHub — Netlify Deployment (Step by Step) 🚀

## 📋 Overview

```
[ผู้ใช้] → [Netlify] → [Next.js API]
              ↓              ↓
         [R2 (รูป)]    [PlanetScale (DB)]
                            ↓
                      [LINE Notify]
```

---

## Step 1: GitHub — Push Code

```powershell
cd hotel-fix-nextjs

# Init git (ถ้ายังไม่เคย)
git init
git add .
git commit -m "Bellas FixHub v1.0 — ready for Netlify"

# Create repo on github.com → then:
git remote add origin https://github.com/YOUR_USERNAME/bellas-fixhub.git
git branch -M main
git push -u origin main
```

> **⚠️ .gitignore ป้องกัน .env.local, .env.production, node_modules, .next ไม่ให้ push ขึ้น**

---

## Step 2: PlanetScale — MySQL Cloud

### 2.1 สร้าง Database
1. ไป https://planetscale.com → Sign up with GitHub
2. Create Database → ชื่อ `hotel_fix`
3. Region: **Singapore** (ap-southeast-1)
4. Create

### 2.2 Import Schema
1. PlanetScale Dashboard → `hotel_fix` → **Console** tab
2. เปิด `hotel_fix.sql` ใน Notepad → copy ทั้งหมด
3. วางใน console → Enter

### 2.3 ปิด Foreign Key Check (ถ้า import ไม่ผ่าน)
```sql
-- ใน console พิมพ์ก่อน import:
SET FOREIGN_KEY_CHECKS = 0;

-- ... import SQL ...

-- หลัง import:
SET FOREIGN_KEY_CHECKS = 1;
```

### 2.4 Get Connection String
1. PlanetScale → `hotel_fix` → **Connect** button
2. เลือก "Connect with: MySQL2"
3. จดไว้:
   - `Host`: aws.connect.psdb.cloud
   - `Username`: xxxxxxxxxxxxxx
   - `Password`: ****************

### 2.5 เปิด SSL (สำคัญมาก!)
Netlify → PlanetScale ต้องใช้ SSL
```
# เพิ่มใน connection string หรือ env:
DB_SSL=require
```
(ถ้าใช้ `?ssl={"rejectUnauthorized":true}` ใน connection string ก็ได้)

---

## Step 3: Cloudflare R2 — เก็บรูป (ฟรี 10GB)

### 3.1 Create Bucket
1. ไป https://dash.cloudflare.com → Sign up
2. Left menu → **R2** → Create Bucket
3. Name: `bellas-fixhub`
4. Region: **Asia Pacific (APAC)**
5. Create

### 3.2 Create API Token
1. R2 Dashboard → **Manage R2 API Tokens**
2. Create API Token
3. Permission: **Object Read & Write**
4. Specify Bucket: `bellas-fixhub`
5. Create → **จดทันที (โชว์ครั้งเดียว!)**
   - `Access Key ID`: xxxxxxxxxxxxxxxxxxxx
   - `Secret Access Key`: xxxxxxxxxxxxxxxxxxxxxxxx

### 3.3 Get Account ID
1. Cloudflare Dashboard → หน้าแรก (Overview)
2. Right side → **Account ID** → copy
   - `Account ID`: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

### 3.4 Enable Public Access (ให้โหลดรูปจากเว็บได้)
1. R2 → `bellas-fixhub` → **Settings**
2. **Public Access** → Enable
3. Under **Custom Domains** → Connect Domain (หรือใช้ `r2.dev` subdomain ฟรี)
4. Copy URL เช่น: `https://pub-xxxxxxxxxxxx.r2.dev`

---

## Step 4: Netlify — Deploy

### 4.1 เชื่อม GitHub
1. ไป https://app.netlify.com → Sign up with GitHub
2. **Add new site** → **Import an existing project**
3. Connect to GitHub → เลือก `bellas-fixhub`
4. Build settings (auto-detected):
   - Build command: `npm run build`
   - Publish directory: `.next`
5. **Deploy site** (ตอนนี้จะ fail — ยังไม่ได้ตั้ง env vars → ปกติ!)

### 4.2 ตั้งค่า Environment Variables
Netlify → Site settings → **Environment variables**:

```
DB_HOST = aws.connect.psdb.cloud
DB_PORT = 3306
DB_USER = (จาก PlanetScale)
DB_PASSWORD = (จาก PlanetScale)
DB_NAME = hotel_fix

JWT_SECRET = (รัน node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

LINE_ACCESS_TOKEN = (จาก LINE Developers)
LINE_TARGET_ID_MAINT = (กลุ่มช่าง Group ID)
LINE_TARGET_ID_IT = (กลุ่มไอที Group ID)

R2_ACCOUNT_ID = (จาก Cloudflare)
R2_ACCESS_KEY_ID = (จาก Cloudflare R2 Token)
R2_SECRET_ACCESS_KEY = (จาก Cloudflare R2 Token)
R2_BUCKET = bellas-fixhub
R2_DEV_DOMAIN = https://pub-xxxxxxxxxxxx.r2.dev

NODE_ENV = production
```

### 4.3 Deploy อีกครั้ง
1. Netlify → **Deploys** → **Trigger deploy** → **Deploy site**
2. รอ 2-3 นาที → ✅ Published!

---

## Step 5: Domain — ต่อโดเมนตัวเอง

### 5.1 Netlify
1. Netlify → **Domain settings** → **Add custom domain**
2. ใส่โดเมน เช่น `fixhub.bellavilla.com`
3. Netlify จะบอกว่าให้ตั้ง DNS ยังไง

### 5.2 DNS Records (ที่ผู้ให้บริการโดเมน)
```
Type    Name      Value
CNAME   fixhub    your-app.netlify.app
```

หรือถ้าใช้ทั้งโดเมน:
```
Type    Name      Value
A       @         75.2.60.5
CNAME   www       your-app.netlify.app
```

### 5.3 SSL
Netlify → ต่อโดเมนเสร็จ → SSL อัตโนมัติ (Let's Encrypt)
ไม่ต้องทำอะไร — รอ 5-10 นาที

---

## Step 6: LINE Bot Setup

### 6.1 LINE Developers Console
1. ไป https://developers.line.biz/console
2. Messaging API → Channel settings
3. **Webhook URL** → `https://fixhub.bellavilla.com/api/line-webhook`
4. Verify → ✅

### 6.2 Group IDs
เพิ่ม LINE Bot เข้ากลุ่ม แล้วหา Group ID:
- ใช้ LINE API หรือดูจาก webhook events
- หรือตั้งค่าผ่านหน้า `/dashboard/admin/line-settings` หลัง deploy

---

## Step 7: Post-Deploy Checklist

- [ ] `https://fixhub.bellavilla.com/login` → เข้าได้
- [ ] Login ด้วย admin / 1234 → เข้า dashboard
- [ ] สร้างใบงานใหม่ → บันทึกสำเร็จ
- [ ] Upload รูป → รูปขึ้นจาก R2
- [ ] LINE notification → แจ้งเตือนเข้ากลุ่มช่าง/ไอที
- [ ] `/dashboard/admin/line-settings` → ตั้งค่า LINE ได้
- [ ] `/dashboard/reports` → รายงานโหลดได้
- [ ] เปลี่ยนรหัสผ่าน admin → ทันที!

---

## Step 8: เปลี่ยน Password ทั้งหมด!

```
admin → (เปลี่ยนก่อน!)
gm1, sup1, supit1, tech1, front1, house1 → เปลี่ยนทีหลัง
```

เปลี่ยนผ่านหน้า `/dashboard/admin` หรือ SQL โดยตรง

---

## 🔧 Troubleshooting

| ปัญหา | วิธีแก้ |
|---|---|
| **"Cannot connect to DB"** | เช็ค DB_HOST, DB_USER, DB_PASSWORD + PlanetScale SSL required |
| **รูปไม่ขึ้น** | เช็ค R2 bucket public access, R2_DEV_DOMAIN |
| **LINE ไม่ส่ง** | เช็ค LINE_ACCESS_TOKEN, Webhook URL |
| **Login loop** | ลบ cookie, เช็ค JWT_SECRET ตรงกันไหม |
| **Build failed** | Netlify → Deploy log ดู error → เช็ค env vars ครบไหม |
| **PlanetScale foreign key error** | รัน SET FOREIGN_KEY_CHECKS=0 ก่อน import |
| **R2 cors error (โหลดรูปไม่ได้)** | ตั้ง CORS ใน R2 bucket settings |

---

🛠️ **พัฒนาโดย** นายเดชาธร เดชอนุรักษ์ · 👾 JayCuRicZzz · 📞 094-492-6155
