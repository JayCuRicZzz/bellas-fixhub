'use client';
// ข้อความ 4 ภาษา (ไทย · อังกฤษ · เขมร · พม่า) สำหรับหน้าแจ้งซ่อม แดชบอร์ด เมนู และการแจ้งเตือน
// แยกจาก *.json เพื่อเพิ่มได้ทีละจุดโดยไม่กระทบชนิดข้อมูลเดิม · ภาษาที่ขาดจะใช้อังกฤษแทน
import { useI18n } from './i18n';

type L4 = { th: string; en: string; km: string; my: string };

export const X = {
  // ── หน้าแจ้งซ่อม ──
  newTicket: { th: 'แจ้งซ่อมใหม่', en: 'New repair request', km: 'ស្នើសុំជួសជុលថ្មី', my: 'ပြင်ဆင်ရန် အသစ်တင်မည်' },
  newTicketSub: { th: 'กรอกข้อมูลเพื่อแจ้งซ่อมบำรุง', en: 'Fill in the details to report a repair', km: 'បំពេញព័ត៌មានដើម្បីស្នើសុំជួសជុល', my: 'ပြင်ဆင်ရန် အချက်အလက်ဖြည့်ပါ' },
  manualMode: { th: 'กรอกข้อมูลเอง', en: 'Fill in myself', km: 'បំពេញដោយខ្លួនឯង', my: 'ကိုယ်တိုင်ဖြည့်မည်' },
  aiMode: { th: 'AI ช่วยสร้าง', en: 'AI assist', km: 'AI ជួយបង្កើត', my: 'AI ဖြင့်ဖန်တီးမည်' },
  branch: { th: 'สาขา', en: 'Branch', km: 'សាខា', my: 'ဌာနခွဲ' },
  selectBranch: { th: 'เลือกสาขา', en: 'Select branch', km: 'ជ្រើសរើសសាខា', my: 'ဌာနခွဲ ရွေးပါ' },
  location: { th: 'ตำแหน่งที่เสีย', en: 'Location', km: 'ទីតាំងដែលខូច', my: 'ပျက်စီးသည့်နေရာ' },
  guestRoom: { th: '🛏️ ห้องพัก', en: '🛏️ Guest room', km: '🛏️ បន្ទប់ភ្ញៀវ', my: '🛏️ ဧည့်သည်အခန်း' },
  commonArea: { th: '📍 พื้นที่ส่วนกลาง', en: '📍 Common area', km: '📍 កន្លែងរួម', my: '📍 အများသုံးနေရာ' },
  roomNoPh: { th: 'เบอร์ห้อง เช่น 305', en: 'Room number, e.g. 305', km: 'លេខបន្ទប់ ឧ. 305', my: 'အခန်းနံပါတ် ဥပမာ 305' },
  roomNoErr: { th: 'เบอร์ห้องต้องเป็นตัวเลข 2–5 หลัก (เช่น 305, 1201, 10502)', en: 'Room number must be 2–5 digits (e.g. 305, 1201, 10502)', km: 'លេខបន្ទប់ត្រូវជាលេខ 2–5 ខ្ទង់ (ឧ. 305, 1201, 10502)', my: 'အခန်းနံပါတ်သည် ဂဏန်း ၂–၅ လုံး ဖြစ်ရမည် (ဥပမာ 305, 1201, 10502)' },
  selectArea: { th: '— เลือกพื้นที่ —', en: '— Select area —', km: '— ជ្រើសរើសកន្លែង —', my: '— နေရာ ရွေးပါ —' },
  areaRequired: { th: 'กรุณาเลือกพื้นที่', en: 'Please select an area', km: 'សូមជ្រើសរើសកន្លែង', my: 'နေရာ ရွေးပေးပါ' },
  roomSpotPh: { th: 'จุดในห้อง (ไม่บังคับ) เช่น ห้องน้ำ, ระเบียง', en: 'Spot in the room (optional), e.g. bathroom, balcony', km: 'កន្លែងក្នុងបន្ទប់ (ស្រេចចិត្ត) ឧ. បន្ទប់ទឹក, រានហាល', my: 'အခန်းထဲရှိနေရာ (မဖြစ်မနေမဟုတ်) ဥပမာ ရေချိုးခန်း၊ ဝရံတာ' },
  otherAreaPh: { th: 'ระบุจุดที่เสีย (บังคับ)', en: 'Describe the location (required)', km: 'បញ្ជាក់ទីតាំង (ចាំបាច់)', my: 'နေရာကို ရေးပါ (မဖြစ်မနေ)' },
  areaNotePh: { th: 'ระบุเพิ่ม (ไม่บังคับ) เช่น ชั้น 4, หน้าลิฟต์', en: 'More detail (optional), e.g. 4th floor, by the lift', km: 'ព័ត៌មានបន្ថែម (ស្រេចចិត្ត) ឧ. ជាន់ទី 4, មុខជណ្ដើរយន្ត', my: 'အသေးစိတ် (မဖြစ်မနေမဟုတ်) ဥပမာ ၄ ထပ်၊ ဓာတ်လှေကားရှေ့' },
  workType: { th: 'ประเภทงาน', en: 'Work type', km: 'ប្រភេទការងារ', my: 'အလုပ်အမျိုးအစား' },
  selectWorkType: { th: 'เลือกประเภทงาน', en: 'Select work type', km: 'ជ្រើសរើសប្រភេទការងារ', my: 'အလုပ်အမျိုးအစား ရွေးပါ' },
  maintenance: { th: 'งานช่าง', en: 'Maintenance', km: 'ជាងជួសជុល', my: 'ပြုပြင်ထိန်းသိမ်းရေး' },
  it: { th: 'งานไอที', en: 'IT', km: 'IT', my: 'IT' },
  hours: { th: 'ชม.', en: 'h', km: 'ម៉ោង', my: 'နာရီ' },
  p_non_urgent: { th: '⚪ ไม่เร่งด่วน', en: '⚪ Not urgent', km: '⚪ មិនបន្ទាន់', my: '⚪ အရေးမကြီး' },
  p_low: { th: '🟢 ต่ำ', en: '🟢 Low', km: '🟢 ទាប', my: '🟢 နိမ့်' },
  p_medium: { th: '🔵 ปานกลาง', en: '🔵 Medium', km: '🔵 មធ្យម', my: '🔵 အလယ်အလတ်' },
  p_high: { th: '🟠 สูง', en: '🟠 High', km: '🟠 ខ្ពស់', my: '🟠 မြင့်' },
  p_urgent: { th: '🔴 ด่วนมาก', en: '🔴 Urgent', km: '🔴 បន្ទាន់ខ្លាំង', my: '🔴 အလွန်အရေးကြီး' },
  attachPhotos: { th: 'แนบรูปภาพ (ไม่เกิน 5 รูป)', en: 'Attach photos (max 5)', km: 'ភ្ជាប់រូបភាព (អតិបរមា 5)', my: 'ဓာတ်ပုံ ပူးတွဲပါ (အများဆုံး ၅ ပုံ)' },
  tapPhotos: { th: 'แตะเพื่อเลือกรูปภาพ', en: 'Tap to choose photos', km: 'ចុចដើម្បីជ្រើសរើសរូបភាព', my: 'ဓာတ်ပုံရွေးရန် နှိပ်ပါ' },
  uploadingPhotos: { th: 'กำลังอัปโหลดรูป...', en: 'Uploading photos...', km: 'កំពុងផ្ទុករូបភាព...', my: 'ဓာတ်ပုံ တင်နေသည်...' },
  uploadFailed: { th: 'อัปโหลดรูปไม่สำเร็จ', en: 'Photo upload failed', km: 'ផ្ទុករូបភាពមិនបានសម្រេច', my: 'ဓာတ်ပုံတင်ခြင်း မအောင်မြင်ပါ' },
  error: { th: 'เกิดข้อผิดพลาด', en: 'Something went wrong', km: 'មានបញ្ហាកើតឡើង', my: 'အမှားတစ်ခု ဖြစ်ပွားခဲ့သည်' },
  connError: { th: 'เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง', en: 'Connection error, please try again', km: 'មិនអាចភ្ជាប់បាន សូមព្យាយាមម្ដងទៀត', my: 'ချိတ်ဆက်မရပါ ထပ်စမ်းကြည့်ပါ' },
  submitted: { th: 'แจ้งซ่อมสำเร็จ', en: 'Request submitted', km: 'បានស្នើសុំជួសជុលដោយជោគជ័យ', my: 'တင်ပြပြီးပါပြီ' },
  reporterDept: { th: 'แผนกผู้แจ้ง', en: 'Reporter department', km: 'ផ្នែករបស់អ្នករាយការណ៍', my: 'တင်ပြသူ၏ဌာန' },
  copied: { th: 'คัดลอกแล้ว', en: 'Copied!', km: 'បានចម្លង', my: 'ကူးယူပြီး' },
  copyLine: { th: 'คัดลอกส่ง LINE', en: 'Copy for LINE', km: 'ចម្លងផ្ញើ LINE', my: 'LINE အတွက် ကူးယူမည်' },
  reportAnother: { th: 'แจ้งใหม่', en: 'New request', km: 'ស្នើសុំថ្មី', my: 'အသစ်တင်မည်' },
  qrFrom: { th: 'แจ้งซ่อมจาก QR', en: 'Reporting from QR', km: 'ស្នើសុំពី QR', my: 'QR မှ တင်ပြခြင်း' },
  qrInvalid: { th: 'QR ไม่ถูกต้อง', en: 'Invalid QR code', km: 'QR មិនត្រឹមត្រូវ', my: 'QR မမှန်ကန်ပါ' },
  qrLoadFail: { th: 'โหลดข้อมูล QR ไม่สำเร็จ', en: 'Could not load the QR details', km: 'មិនអាចផ្ទុកព័ត៌មាន QR', my: 'QR အချက်အလက် မရနိုင်ပါ' },
  warranty: { th: 'อุปกรณ์นี้ยังอยู่ในประกันถึง', en: 'This equipment is under warranty until', km: 'ឧបករណ៍នេះនៅក្នុងការធានារហូតដល់', my: 'ဤပစ္စည်းသည် အာမခံရှိသည် —' },
  warrantyTail: { th: '— ช่างควรติดต่อผู้ขายก่อนซ่อมเอง', en: '— contact the vendor before repairing it yourself', km: '— គួរទាក់ទងអ្នកលក់មុនពេលជួសជុលខ្លួនឯង', my: '— ကိုယ်တိုင်မပြင်မီ ရောင်းချသူကို ဆက်သွယ်ပါ' },
  equipment: { th: 'อุปกรณ์ที่เสีย (ถ้ารู้)', en: 'Broken equipment (if known)', km: 'ឧបករណ៍ដែលខូច (បើដឹង)', my: 'ပျက်နေသည့်ပစ္စည်း (သိလျှင်)' },
  notSpecified: { th: '— ไม่ระบุ / อื่น ๆ —', en: '— Not specified / other —', km: '— មិនបញ្ជាក់ / ផ្សេងៗ —', my: '— မသတ်မှတ် / အခြား —' },
  openHere: { th: 'จุดนี้มีงานค้างอยู่แล้ว', en: 'Open jobs at this spot:', km: 'ការងារដែលនៅសល់នៅកន្លែងនេះ:', my: 'ဤနေရာတွင် မပြီးသေးသည့်အလုပ်:' },
  openHereTail: { th: 'ใบ — ตรวจก่อนแจ้งซ้ำ:', en: '— check before reporting again:', km: '— ពិនិត្យមុនពេលស្នើសុំម្ដងទៀត:', my: '— ထပ်မတင်မီ စစ်ဆေးပါ:' },
  photosOptional: { th: 'รูปภาพความเสียหาย (ถ้ามี)', en: 'Damage photos (if any)', km: 'រូបភាពការខូចខាត (បើមាន)', my: 'ပျက်စီးမှုဓာတ်ပုံ (ရှိလျှင်)' },
  uploading: { th: 'กำลังอัปโหลด...', en: 'Uploading...', km: 'កំពុងផ្ទុក...', my: 'တင်နေသည်...' },
  uploadPhoto: { th: 'อัปโหลดรูปภาพ', en: 'Upload photo', km: 'ផ្ទុករូបភាព', my: 'ဓာတ်ပုံတင်မည်' },
  // ── พื้นที่ส่วนกลาง (ค่าที่บันทึกเป็นภาษาไทยเสมอ เพื่อค้นย้อนหลังได้ตรงกัน — แปลเฉพาะที่แสดง) ──
  'ล็อบบี้': { th: 'ล็อบบี้', en: 'Lobby', km: 'ឡប់ប៊ី', my: 'ဧည့်ခန်းမ (Lobby)' },
  'ฟร้อนท์': { th: 'ฟร้อนท์', en: 'Front desk', km: 'តុទទួលភ្ញៀវ', my: 'ဧည့်ကြိုကောင်တာ' },
  'ทางเดิน / บันได': { th: 'ทางเดิน / บันได', en: 'Corridor / stairs', km: 'ផ្លូវដើរ / ជណ្ដើរ', my: 'စင်္ကြံ / လှေကား' },
  'ลิฟต์': { th: 'ลิฟต์', en: 'Lift', km: 'ជណ្ដើរយន្ត', my: 'ဓာတ်လှေကား' },
  'สระว่ายน้ำ': { th: 'สระว่ายน้ำ', en: 'Swimming pool', km: 'អាងហែលទឹក', my: 'ရေကူးကန်' },
  'ห้องอาหาร / บาร์': { th: 'ห้องอาหาร / บาร์', en: 'Restaurant / bar', km: 'ភោជនីយដ្ឋាន / បារ', my: 'စားသောက်ခန်း / ဘား' },
  'ครัว': { th: 'ครัว', en: 'Kitchen', km: 'ផ្ទះបាយ', my: 'မီးဖိုချောင်' },
  'ห้องประชุม': { th: 'ห้องประชุม', en: 'Meeting room', km: 'បន្ទប់ប្រជុំ', my: 'အစည်းအဝေးခန်း' },
  'ลานจอดรถ': { th: 'ลานจอดรถ', en: 'Car park', km: 'ចំណតរថយន្ត', my: 'ကားပါကင်' },
  'สวน / ภายนอกอาคาร': { th: 'สวน / ภายนอกอาคาร', en: 'Garden / outside', km: 'សួនច្បារ / ខាងក្រៅអគារ', my: 'ဥယျာဉ် / အဆောက်အအုံပြင်' },
  'ดาดฟ้า': { th: 'ดาดฟ้า', en: 'Rooftop', km: 'ដំបូលអគារ', my: 'ခေါင်မိုးထပ်' },
  'ห้องเครื่อง / ห้องปั๊ม': { th: 'ห้องเครื่อง / ห้องปั๊ม', en: 'Machine / pump room', km: 'បន្ទប់ម៉ាស៊ីន / ម៉ាស៊ីនបូម', my: 'စက်ခန်း / ပန့်ခန်း' },
  'ห้องพนักงาน / ออฟฟิศ': { th: 'ห้องพนักงาน / ออฟฟิศ', en: 'Staff room / office', km: 'បន្ទប់បុគ្គលិក / ការិយាល័យ', my: 'ဝန်ထမ်းခန်း / ရုံးခန်း' },
  'ห้องเก็บของ / Store': { th: 'ห้องเก็บของ / Store', en: 'Storeroom', km: 'បន្ទប់ឃ្លាំង', my: 'ပစ္စည်းသိုလှောင်ခန်း' },
  'อื่น ๆ': { th: 'อื่น ๆ', en: 'Other', km: 'ផ្សេងៗ', my: 'အခြား' },
  // ── แดชบอร์ด / เมนู ──
  welcome: { th: 'ยินดีต้อนรับ', en: 'Welcome', km: 'សូមស្វាគមន៍', my: 'ကြိုဆိုပါသည်' },
  dashSub: { th: 'ภาพรวมการแจ้งซ่อมและสถานะงาน', en: 'Overview of repair requests and their status', km: 'ទិដ្ឋភាពរួមនៃការស្នើសុំជួសជុល និងស្ថានភាព', my: 'ပြင်ဆင်ရန်တင်ပြချက်များနှင့် အခြေအနေ' },
  viewReports: { th: 'ดูรายงาน', en: 'View reports', km: 'មើលរបាយការណ៍', my: 'အစီရင်ခံစာ ကြည့်မည်' },
  today: { th: 'วันนี้', en: 'Today', km: 'ថ្ងៃនេះ', my: 'ယနေ့' },
  all: { th: 'ทั้งหมด', en: 'All', km: 'ទាំងអស់', my: 'အားလုံး' },
  noTickets: { th: 'ยังไม่มีรายการแจ้งซ่อมที่ตรงกับเงื่อนไข', en: 'No repair requests match your filters', km: 'មិនមានការស្នើសុំត្រូវនឹងលក្ខខណ្ឌ', my: 'စစ်ထုတ်ချက်နှင့် ကိုက်ညီသည့် တင်ပြချက် မရှိပါ' },
  appTagline: { th: 'ระบบแจ้งซ่อมบำรุงช่างและไอที', en: 'Maintenance & IT repair system', km: 'ប្រព័ន្ធស្នើសុំជួសជុល និង IT', my: 'ပြုပြင်ထိန်းသိမ်းရေးနှင့် IT တင်ပြမှုစနစ်' },
  menuPm: { th: '📅 ตาราง PM', en: '📅 PM schedule', km: '📅 កាលវិភាគថែទាំ', my: '📅 ကာကွယ်ထိန်းသိမ်းမှု အချိန်ဇယား' },
  menuAircon: { th: '🧊 เติมน้ำยาแอร์', en: '🧊 A/C refills', km: '🧊 ចាក់ហ្គាសម៉ាស៊ីនត្រជាក់', my: '🧊 လေအေးပေးစက် ဓာတ်ငွေ့ဖြည့်ခြင်း' },
  menuAssets: { th: '🧰 ทรัพย์สิน & QR', en: '🧰 Assets & QR', km: '🧰 ទ្រព្យសម្បត្តិ & QR', my: '🧰 ပိုင်ဆိုင်မှုများ & QR' },
  menuParts: { th: '📦 อะไหล่ & สต็อก', en: '📦 Spare parts & stock', km: '📦 គ្រឿងបន្លាស់ & ស្តុក', my: '📦 အပိုပစ္စည်း & စတော့' },
  menuPmAdmin: { th: '⚙️ จัดการ PM', en: '⚙️ Manage PM', km: '⚙️ គ្រប់គ្រងការថែទាំ', my: '⚙️ ကာကွယ်ထိန်းသိမ်းမှု စီမံရန်' },
  loggingIn: { th: '⏳ กำลังเข้าสู่ระบบ...', en: '⏳ Logging in...', km: '⏳ កំពុងចូល...', my: '⏳ ဝင်ရောက်နေသည်...' },
  loading: { th: '⏳ กำลังโหลด...', en: '⏳ Loading...', km: '⏳ កំពុងផ្ទុក...', my: '⏳ ဖွင့်နေသည်...' },
  // ── แจ้งเตือนบนมือถือ ──
  pushOn: { th: 'เครื่องนี้รับแจ้งเตือนงานใหม่แล้ว', en: 'This device receives new-job alerts', km: 'ឧបករណ៍នេះទទួលការជូនដំណឹងការងារថ្មីហើយ', my: 'ဤစက်သည် အလုပ်အသစ် အသိပေးချက် ရရှိနေပြီ' },
  pushOff: { th: 'รับแจ้งเตือนงานใหม่บนเครื่องนี้ (ฟรี เด้งเหมือนแอป)', en: 'Get new-job alerts on this device (free, like an app)', km: 'ទទួលការជូនដំណឹងការងារថ្មីលើឧបករណ៍នេះ (ឥតគិតថ្លៃ)', my: 'ဤစက်တွင် အလုပ်အသစ် အသိပေးချက် ရယူမည် (အခမဲ့)' },
  pushDenied: { th: 'การแจ้งเตือนถูกปิดไว้ — เปิดได้ที่ตั้งค่าเบราว์เซอร์ → การแจ้งเตือน → อนุญาตเว็บนี้', en: 'Notifications are blocked — allow this site in browser settings → Notifications', km: 'ការជូនដំណឹងត្រូវបានបិទ — អនុញ្ញាតគេហទំព័រនេះក្នុងការកំណត់កម្មវិធីរុករក', my: 'အသိပေးချက်ကို ပိတ်ထားသည် — ဘရောက်ဆာ ဆက်တင်တွင် ဤဆိုက်ကို ခွင့်ပြုပါ' },
  pushIos: { th: 'iPhone: กดปุ่มแชร์ → “เพิ่มไปยังหน้าจอโฮม” แล้วเปิดจากไอคอน FixHub จึงจะเปิดแจ้งเตือนได้', en: 'iPhone: tap Share → “Add to Home Screen”, then open FixHub from its icon to turn on alerts', km: 'iPhone: ចុច Share → “Add to Home Screen” រួចបើក FixHub ពីរូបតំណាង', my: 'iPhone: Share → “Add to Home Screen” နှိပ်ပြီး FixHub အိုင်ကွန်မှ ဖွင့်ပါ' },
  pushUnsupported: { th: 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน — ใช้ Chrome หรือเพิ่มแอปลงหน้าจอหลัก', en: 'This browser does not support alerts — use Chrome or add the app to your home screen', km: 'កម្មវិធីរុករកនេះមិនគាំទ្រការជូនដំណឹង — ប្រើ Chrome', my: 'ဤဘရောက်ဆာတွင် အသိပေးချက် မရနိုင်ပါ — Chrome ကို သုံးပါ' },
  pushEnable: { th: 'เปิดการแจ้งเตือน', en: 'Turn on alerts', km: 'បើកការជូនដំណឹង', my: 'အသိပေးချက် ဖွင့်မည်' },
  pushTest: { th: 'ทดสอบ', en: 'Test', km: 'សាកល្បង', my: 'စမ်းသပ်' },
  pushDisable: { th: 'ปิด', en: 'Turn off', km: 'បិទ', my: 'ပိတ်' },
  pushEnabledMsg: { th: 'เปิดแล้ว ✓ กด “ทดสอบ” เพื่อลองรับแจ้งเตือน', en: 'Turned on ✓ Tap “Test” to try it', km: 'បានបើក ✓ ចុច “សាកល្បង”', my: 'ဖွင့်ပြီး ✓ “စမ်းသပ်” ကို နှိပ်ပါ' },
  pushSent: { th: 'ส่งแล้ว — ดูแจ้งเตือนที่มุมจอ/หน้าจอล็อก', en: 'Sent — check your notifications', km: 'បានផ្ញើ — ពិនិត្យការជូនដំណឹង', my: 'ပို့ပြီး — အသိပေးချက်ကို စစ်ကြည့်ပါ' },
} satisfies Record<string, L4>;

export type XKey = keyof typeof X;

export function tx(lang: string, key: string): string {
  const e = (X as Record<string, L4>)[key];
  if (!e) return key;
  return (e as any)[lang] || e.en;
}

/** const x = useX(); x('newTicket') */
export function useX() {
  const { lang } = useI18n();
  return (key: XKey | string) => tx(lang, key);
}
