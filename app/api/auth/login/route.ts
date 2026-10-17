import { NextRequest, NextResponse } from 'next/server';
import { supabaseAnon, usernameToEmail } from '../../../../lib/supabase';
import { loadProfile, setAuthCookies } from '../../../../lib/auth';

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username.includes('@') ? username.trim().toLowerCase() : usernameToEmail(username),
      password,
    });

    if (error || !data.session || !data.user) {
      console.log(`[LOGIN] Failed for "${username}": ${error?.message || 'no session'}`);
      if (isJson) {
        return NextResponse.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login?error=invalid', req.url), 302);
    }

    const profile = await loadProfile(data.user.id);
    if (!profile) {
      // Auth account exists (e.g. HR staff) but has no FixHub profile / is deactivated
      if (isJson) {
        return NextResponse.json({ success: false, message: 'บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน FixHub กรุณาติดต่อผู้ดูแลระบบ' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/login?error=noaccess', req.url), 302);
    }

    const { access_token, refresh_token } = data.session;

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
