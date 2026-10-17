// Authentication — Supabase Auth (JWT issued by Supabase) + fixhub.profiles for app data
import { NextRequest, NextResponse } from 'next/server';
import { User } from '../types';
import sql from './db';
import { supabaseAnon } from './supabase';

export const ACCESS_COOKIE = 'fx_token';
export const REFRESH_COOKIE = 'fx_refresh';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (JWT inside is refreshed by middleware)

// ---------- cookies ----------
export function setAuthCookies(res: NextResponse, accessToken: string, refreshToken?: string | null) {
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true, sameSite: 'lax', path: '/', secure, maxAge: COOKIE_MAX_AGE,
  });
  if (refreshToken) {
    res.cookies.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true, sameSite: 'lax', path: '/', secure, maxAge: COOKIE_MAX_AGE,
    });
  }
  // legacy cookie name used by older frontend builds
  res.cookies.set('token', '', { path: '/', maxAge: 0 });
}

export function clearAuthCookies(res: NextResponse) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, 'token']) {
    res.cookies.set(name, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  }
}

/** Decode JWT payload without verification (used only for expiry checks). */
export function decodeJwtPayload(token: string): any | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ---------- token → user ----------
interface CacheEntry { user: User; expires: number }
const userCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

async function verifyToken(token: string): Promise<string | null> {
  try {
    const supabase = supabaseAnon();
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return data.claims.sub as string;
  } catch {
    return null;
  }
}

export async function loadProfile(userId: string): Promise<User | null> {
  const rows = await sql`
    select p.user_id, p.username, p.full_name, p.role, p.branch_code, p.department,
           p.password_reset_required, p.active, p.employee_code, p.managed_by_hr,
           coalesce(array_agg(ub.branch_code order by ub.branch_code) filter (where ub.branch_code is not null), '{}') as branches
    from fixhub.profiles p
    left join fixhub.user_branches ub on ub.user_id = p.user_id
    where p.user_id = ${userId}
    group by p.user_id`;
  if (rows.length === 0) return null;
  const p: any = rows[0];
  if (!p.active) return null;
  const branches: string[] = p.branches?.length ? p.branches : (p.branch_code ? [p.branch_code] : []);
  return {
    id: p.user_id,
    user_id: p.user_id,
    username: p.username,
    full_name: p.full_name,
    role: p.role,
    branch_code: p.branch_code || branches[0] || '',
    department: p.department || undefined,
    branches,
    password_reset_required: !!p.password_reset_required,
    employee_code: p.employee_code || undefined,
    managed_by_hr: !!p.managed_by_hr,
  };
}

export async function getUserFromToken(token: string | null | undefined): Promise<User | null> {
  if (!token || token.length < 20 || token === 'null' || token === 'undefined') return null;
  const cached = userCache.get(token);
  if (cached && cached.expires > Date.now()) return cached.user;
  const sub = await verifyToken(token);
  if (!sub) return null;
  const user = await loadProfile(sub);
  if (user) userCache.set(token, { user, expires: Date.now() + CACHE_TTL_MS });
  return user;
}

export function getTokenFromRequest(req: NextRequest): { header: string | null; cookie: string | null } {
  const authHeader = req.headers.get('authorization');
  const header = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const cookie = req.cookies.get(ACCESS_COOKIE)?.value || null;
  return { header, cookie };
}

/**
 * Resolve the logged-in user for an API request.
 * Order: Authorization: Bearer (if valid) → HttpOnly cookie. Falls back so a stale
 * localStorage token never locks a user out while the cookie is still fresh.
 */
export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const { header, cookie } = getTokenFromRequest(req);
  if (header) {
    const u = await getUserFromToken(header);
    if (u) return u;
  }
  if (cookie && cookie !== header) {
    return getUserFromToken(cookie);
  }
  return null;
}

export function invalidateUserCache(userId?: string) {
  if (!userId) { userCache.clear(); return; }
  userCache.forEach((v, k) => { if (v.user.id === userId) userCache.delete(k); });
}

// ---------- roles ----------
export const ROLES = {
  ADMIN: 'admin',
  GM: 'gm',
  SUPERVISOR: 'sup',
  SUPERVISOR_IT: 'supit',
  TECHNICIAN: 'tech',
  TECHNICIAN_IT: 'it',
  FRONT_DESK: 'front',
  HOUSEKEEPING: 'house',
} as const;

export const ALL_ROLES: string[] = Object.values(ROLES);

export function canCreateTicket(role: string): boolean {
  return ([ROLES.FRONT_DESK, ROLES.HOUSEKEEPING, ROLES.ADMIN, ROLES.GM] as string[]).includes(role);
}
export function canManageTicket(role: string): boolean {
  return ([ROLES.TECHNICIAN, ROLES.TECHNICIAN_IT, ROLES.SUPERVISOR, ROLES.SUPERVISOR_IT, ROLES.ADMIN, ROLES.GM] as string[]).includes(role);
}
export function canApproveTicket(role: string): boolean {
  return ([ROLES.SUPERVISOR, ROLES.SUPERVISOR_IT, ROLES.ADMIN, ROLES.GM] as string[]).includes(role);
}
export function isReporterRole(role: string): boolean {
  return ([ROLES.FRONT_DESK, ROLES.HOUSEKEEPING] as string[]).includes(role);
}
export function isTechnicianRole(role: string): boolean {
  return ([ROLES.TECHNICIAN, ROLES.TECHNICIAN_IT] as string[]).includes(role);
}
export function isSupervisorRole(role: string): boolean {
  return ([ROLES.SUPERVISOR, ROLES.SUPERVISOR_IT] as string[]).includes(role);
}
export function isAdminOrGm(role: string): boolean {
  return role === 'admin' || role === 'gm';
}
export function canRateKpi(role: string): boolean {
  return ['sup', 'supit', 'admin', 'gm'].includes(role);
}
export function getDepartmentFromRole(role: string): string | null {
  if (['tech', 'sup'].includes(role)) return 'ช่าง';
  if (['it', 'supit'].includes(role)) return 'ไอที';
  return null;
}

/** Work department (MAINT / IT) a user belongs to, for ticket scoping. null = sees everything. */
export function getWorkDeptScope(user: User): 'MAINT' | 'IT' | null {
  if (isAdminOrGm(user.role)) return null;
  const byRole: Record<string, 'MAINT' | 'IT'> = {
    tech: 'MAINT', sup: 'MAINT', it: 'IT', supit: 'IT', front: 'MAINT', house: 'MAINT',
  };
  const d = user.department;
  if (d === 'MAINT' || d === 'MAINTENANCE') return 'MAINT';
  if (d === 'IT') return 'IT';
  return byRole[user.role] || null;
}

/** Branch codes a user may see. Admin/GM = all branches. */
export async function getUserBranches(userId: string, role: string): Promise<string[]> {
  if (isAdminOrGm(role)) {
    const rows = await sql`select branch_code from fixhub.branches where active order by sort_order`;
    return rows.map((r: any) => r.branch_code);
  }
  const rows = await sql`select branch_code from fixhub.user_branches where user_id = ${userId} order by branch_code`;
  if (rows.length > 0) return rows.map((r: any) => r.branch_code);
  const own = await sql`select branch_code from fixhub.profiles where user_id = ${userId}`;
  return own.length && own[0].branch_code ? [own[0].branch_code] : [];
}
