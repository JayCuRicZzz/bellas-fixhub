// User administration — Supabase Auth (auth.users) + fixhub.profiles + fixhub.user_branches
import sql from './db';
import { supabaseAdmin, usernameToEmail, isFixhubEmail } from './supabase';
import { ALL_ROLES, invalidateUserCache } from './auth';

export interface NewUserInput {
  username: string;
  password?: string;
  full_name: string;
  role: string;
  department?: string | null;
  branch_codes?: string[];
  password_reset_required?: boolean;
}

export function generateTempPassword(): string {
  return Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 90 + 10);
}

export function validateUsername(username: string): string | null {
  const u = (username || '').trim();
  if (u.length < 3) return 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร';
  if (!/^[a-zA-Z0-9._-]+$/.test(u)) return 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีด';
  return null;
}

export function validateRole(role: string): boolean {
  return ALL_ROLES.includes(role);
}

async function syncBranches(userId: string, branchCodes: string[] | undefined) {
  await sql`delete from fixhub.user_branches where user_id = ${userId}`;
  if (branchCodes && branchCodes.length > 0) {
    const rows = branchCodes.map(bc => ({ user_id: userId, branch_code: bc }));
    await sql`insert into fixhub.user_branches ${sql(rows, 'user_id', 'branch_code')} on conflict do nothing`;
  }
}

/** Create a FixHub user: auth account + profile. Returns { id, temp_password? }. */
export async function createUser(input: NewUserInput): Promise<{ id: string; temp_password?: string }> {
  const username = input.username.trim().toLowerCase();
  const admin = supabaseAdmin();
  const email = usernameToEmail(username);
  const password = input.password || generateTempPassword();
  const usedTemp = !input.password;

  const existing = await sql`select user_id from fixhub.profiles where username = ${username}`;
  if (existing.length > 0) throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { app: 'fixhub', username, full_name: input.full_name },
  });
  if (error || !data.user) {
    throw new Error(error?.message?.includes('already') ? 'ชื่อผู้ใช้นี้มีอยู่แล้วในระบบ Auth' : (error?.message || 'สร้างบัญชีไม่สำเร็จ'));
  }
  const userId = data.user.id;
  const primaryBranch = input.branch_codes?.[0] || null;

  try {
    await sql`
      insert into fixhub.profiles (user_id, username, full_name, role, department, branch_code, password_reset_required)
      values (${userId}, ${username}, ${input.full_name}, ${input.role}, ${input.department || null}, ${primaryBranch},
              ${input.password_reset_required ?? usedTemp})`;
    await syncBranches(userId, input.branch_codes);
  } catch (e) {
    // roll back the auth account so we don't leave an orphan
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    throw e;
  }

  return { id: userId, temp_password: usedTemp ? password : undefined };
}

export async function updateUser(userId: string, input: Partial<NewUserInput>) {
  const admin = supabaseAdmin();
  const current = await sql`select username from fixhub.profiles where user_id = ${userId}`;
  if (current.length === 0) throw new Error('ไม่พบผู้ใช้');

  const username = input.username ? input.username.trim().toLowerCase() : current[0].username;
  if (username !== current[0].username) {
    const dup = await sql`select 1 from fixhub.profiles where username = ${username} and user_id <> ${userId}`;
    if (dup.length > 0) throw new Error('ชื่อผู้ใช้นี้มีอยู่แล้ว');
  }

  const authPatch: any = {};
  if (input.password) authPatch.password = input.password;
  if (username !== current[0].username) {
    const { data: au } = await admin.auth.admin.getUserById(userId);
    if (au?.user && isFixhubEmail(au.user.email)) authPatch.email = usernameToEmail(username);
  }
  if (Object.keys(authPatch).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(userId, { ...authPatch, email_confirm: true });
    if (error) throw new Error(error.message);
  }

  const primaryBranch = input.branch_codes && input.branch_codes.length > 0 ? input.branch_codes[0] : null;
  await sql`
    update fixhub.profiles set
      username = ${username},
      full_name = coalesce(${input.full_name ?? null}, full_name),
      role = coalesce(${input.role ?? null}, role),
      department = ${input.department ?? null},
      branch_code = ${primaryBranch},
      password_reset_required = case when ${!!input.password} then false else password_reset_required end,
      managed_by_hr = false
    where user_id = ${userId}`;
  if (input.branch_codes) await syncBranches(userId, input.branch_codes);
  invalidateUserCache(userId);
}

export async function resetPassword(userId: string): Promise<string> {
  const admin = supabaseAdmin();
  const temp = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: temp });
  if (error) throw new Error(error.message);
  await sql`update fixhub.profiles set password_reset_required = true where user_id = ${userId}`;
  invalidateUserCache(userId);
  return temp;
}

/** Delete a user. Auth account is removed only if it belongs to FixHub (not a shared HR account). */
export async function deleteUser(userId: string) {
  const admin = supabaseAdmin();
  await sql`delete from fixhub.profiles where user_id = ${userId}`; // cascades user_branches
  const { data } = await admin.auth.admin.getUserById(userId);
  if (data?.user && isFixhubEmail(data.user.email)) {
    await admin.auth.admin.deleteUser(userId);
  }
  invalidateUserCache(userId);
}

export async function listUsers() {
  const rows = await sql`
    select p.user_id as id, p.username, p.full_name, p.role, p.department, p.branch_code,
           p.password_reset_required, p.active, p.created_at, p.employee_code, p.managed_by_hr, p.last_login_at,
           coalesce(array_agg(ub.branch_code order by ub.branch_code) filter (where ub.branch_code is not null), '{}') as branches
    from fixhub.profiles p
    left join fixhub.user_branches ub on ub.user_id = p.user_id
    group by p.user_id
    order by p.created_at, p.username`;
  return rows.map((u: any) => ({
    ...u,
    branches: u.branches?.length ? u.branches : [u.branch_code].filter(Boolean),
  }));
}
