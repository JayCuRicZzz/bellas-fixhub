import { NextRequest, NextResponse } from 'next/server';
import { supabaseAnon, usernameToEmail } from '../../../../lib/supabase';
import { sql } from '../../../../lib/db';
import { loadProfile, setAuthCookies, invalidateUserCache } from '../../../../lib/auth';
import { employeeCodeToHrEmail, isHrEmail, looksLikeEmployeeCode, provisionFromHr } from '../../../../lib/hr-sync';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  try {
    let username = '', password = '';
    if (isJson) {
      const body = await req.json();
      username = String(body.username || '');
      password = String(body.password || '');
    } else {
      const formData = await req.formData();
      username = formData.get('username')?.toString() || '';
      password = formData.get('password')?.toString() || '';
    }

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    const supabase = supabaseAnon();
    const uname = username.trim().toLowerCase();
    // Candidate accounts: explicit email → as-is; employee code → HR account first, then FixHub; otherwise FixHub then HR
    const candidates = uname.includes('@')
      ? [uname]
      : looksLikeEmployeeCode(uname)
        ? [employeeCodeToHrEmail(uname), usernameToEmail(uname)]
        : [usernameToEmail(uname), employeeCodeToHrEmail(uname)];

    let data: any = null, error: any = null;
    for (const email of candidates) {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (!res.error && res.data.session && res.data.user) { data = res.data; error = null; break; }
      error = res.error;
    }

    if (error || !data?.session || !data?.user) {
      console.log(`[LOGIN] Failed for "${username}": ${error?.message || 'no session'}`);
      if (isJson) {
        return NextResponse.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login?error=invalid', req.url), 302);
    }

    let profile = await loadProfile(data.user.id);
    if (!profile && isHrEmail(data.user.email)) {
      // HR staff logging in for the first time → create FixHub profile from HR record
      const prov = await provisionFromHr(data.user.id);
      if (!prov.ok) {
        const msg = prov.reason === 'inactive' ? 'บัญชีพนักงานนี้ไม่ได้อยู่ในสถานะทำงาน'
          : prov.reason === 'no_branch' ? 'ไม่พบสาขาของพนักงานในระบบ HR กรุณาติดต่อผู้ดูแลระบบ'
          : 'ไม่พบข้อมูลพนักงานในระบบ HR';
        if (isJson) return NextResponse.json({ success: false, message: msg }, { status: 403 });
        return NextResponse.redirect(new URL('/login?error=noaccess', req.url), 302);
      }
      invalidateUserCache(data.user.id);
      profile = await loadProfile(data.user.id);
    } else if (profile && isHrEmail(data.user.email)) {
      // keep name/branch in sync with HR on every login (non-blocking on failure)
      try { await provisionFromHr(data.user.id); invalidateUserCache(data.user.id); profile = (await loadProfile(data.user.id)) || profile; } catch (e: any) { console.error('[LOGIN] HR sync failed:', e.message); }
    }
    if (!profile) {
      // Auth account exists (e.g. HR staff) but has no FixHub profile / is deactivated
      if (isJson) {
        return NextResponse.json({ success: false, message: 'บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน FixHub กรุณาติดต่อผู้ดูแลระบบ' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/login?error=noaccess', req.url), 302);
    }

    const { access_token, refresh_token } = data.session;
    // บันทึกเวลาเข้าใช้ล่าสุดทุกบัญชี (เดิมอัปเดตเฉพาะบัญชี HR)
    try { await sql`update fixhub.profiles set last_login_at = now() where user_id = ${data.user.id}`; } catch { /* ไม่ให้ login ล้มเพราะเรื่องนี้ */ }

    if (isJson) {
      const response = NextResponse.json({
        success: true,
        token: access_token,
        password_reset_required: !!profile.password_reset_required,
        user: profile,
      });
      setAuthCookies(response, access_token, refresh_token);
      return response;
    }

    const redirectUrl = profile.password_reset_required
      ? new URL('/login/set-password', req.url)
      : new URL('/dashboard', req.url);
    const response = NextResponse.redirect(redirectUrl, 302);
    setAuthCookies(response, access_token, refresh_token);
    return response;
  } catch (err: any) {
    console.error('[Login] Error:', err.message);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }, { status: 500 });
  }
}
