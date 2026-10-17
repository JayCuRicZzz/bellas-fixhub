// Bella HR ↔ FixHub account link.
// Staff log in with their HR account (employee code + HR password). On first login we create a
// fixhub.profiles row from the HR employee record (department → role via fixhub.hr_role_map).
import sql from './db';

export const HR_EMAIL_DOMAIN = 'staff.bellahr.local';

export function employeeCodeToHrEmail(code: string): string {
  return `${code.trim().toLowerCase()}@${HR_EMAIL_DOMAIN}`;
}
export function isHrEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase().endsWith(`@${HR_EMAIL_DOMAIN}`);
}
/** Employee codes are 5 digits (e.g. 00197). */
export function looksLikeEmployeeCode(username: string): boolean {
  return /^\d{4,8}$/.test(username.trim());
}

export interface HrEmployee {
  employee_id: string;
  employee_code: string;
  full_name: string;
  dept_code: string | null;
  branch_code: string | null;
  is_department_head: boolean;
  status: string;
  line_user_id: string | null;
  must_change_password: boolean;
}

export async function getHrEmployeeForAuth(authUserId: string): Promise<HrEmployee | null> {
  const rows = await sql`select * from fixhub.hr_employee_for_auth(${authUserId})`;
  return (rows[0] as HrEmployee) || null;
}

interface RoleMap { role: string; head_role: string | null; department: string | null }

async function mapRole(deptCode: string | null, isHead: boolean): Promise<RoleMap> {
  const fallback: RoleMap = { role: 'front', head_role: 'front', department: null };
  if (!deptCode) return fallback;
  const rows = await sql`select role, head_role, department from fixhub.hr_role_map where dept_code = ${deptCode}`;
  if (rows.length === 0) return fallback;
  const m = rows[0] as RoleMap;
  return { role: isHead && m.head_role ? m.head_role : m.role, head_role: m.head_role, department: m.department };
}

export type ProvisionResult =
  | { ok: true; created: boolean }
  | { ok: false; reason: 'not_employee' | 'inactive' | 'no_branch' };

/**
 * Create or refresh the FixHub profile for an HR-linked auth user.
 * - New profile: role/department from hr_role_map, branch from HR.
 * - Existing profile with managed_by_hr = true: refresh name/branch/role from HR.
 * - Existing profile edited by admin (managed_by_hr = false): only refresh name + employee link.
 */
export async function provisionFromHr(authUserId: string): Promise<ProvisionResult> {
  const emp = await getHrEmployeeForAuth(authUserId);
  if (!emp) return { ok: false, reason: 'not_employee' };
  if (emp.status && emp.status !== 'active') {
    await sql`update fixhub.profiles set active = false where user_id = ${authUserId} and managed_by_hr`;
    return { ok: false, reason: 'inactive' };
  }
  const branchOk = emp.branch_code
    ? (await sql`select 1 from fixhub.branches where branch_code = ${emp.branch_code}`).length > 0
    : false;

  const existing = await sql`select user_id, managed_by_hr, username from fixhub.profiles where user_id = ${authUserId}`;
  const { role, department } = await mapRole(emp.dept_code, emp.is_department_head);
  const username = emp.employee_code.toLowerCase();

  if (existing.length === 0) {
    if (!branchOk) return { ok: false, reason: 'no_branch' };
    // username collision (e.g. someone manually created the same code) → suffix
    const taken = await sql`select 1 from fixhub.profiles where username = ${username}`;
    const finalUsername = taken.length ? `${username}-hr` : username;
    await sql`
      insert into fixhub.profiles (user_id, username, full_name, role, department, branch_code,
                                   password_reset_required, active, employee_id, employee_code, managed_by_hr, last_login_at)
      values (${authUserId}, ${finalUsername}, ${emp.full_name}, ${role}, ${department ?? emp.dept_code}, ${emp.branch_code},
              false, true, ${emp.employee_id}, ${emp.employee_code}, true, now())`;
    await sql`insert into fixhub.user_branches (user_id, branch_code) values (${authUserId}, ${emp.branch_code}) on conflict do nothing`;
    return { ok: true, created: true };
  }

  const managed = !!existing[0].managed_by_hr;
  if (managed) {
    await sql`
      update fixhub.profiles set
        full_name = ${emp.full_name}, role = ${role}, department = ${department ?? emp.dept_code},
        branch_code = coalesce(${branchOk ? emp.branch_code : null}, branch_code),
        employee_id = ${emp.employee_id}, employee_code = ${emp.employee_code}, active = true, last_login_at = now()
      where user_id = ${authUserId}`;
    if (branchOk) {
      await sql`insert into fixhub.user_branches (user_id, branch_code) values (${authUserId}, ${emp.branch_code}) on conflict do nothing`;
    }
  } else {
    await sql`
      update fixhub.profiles set
        full_name = coalesce(nullif(full_name,''), ${emp.full_name}),
        employee_id = ${emp.employee_id}, employee_code = ${emp.employee_code}, last_login_at = now()
      where user_id = ${authUserId}`;
  }
  return { ok: true, created: false };
}
