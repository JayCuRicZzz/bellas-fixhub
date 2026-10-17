// Shared filter builder for report endpoints (postgres.js fragments)
import sql from './db';
import { User } from '../types';
import { getUserBranches, getWorkDeptScope } from './auth';

export interface ReportScope {
  branches: string[];
  dept: 'MAINT' | 'IT' | '';
  workType: string;             // category dept_type: MAINTENANCE | IT | ''
  dateFrag: any;   // postgres.js SQL fragments
  branchFrag: any;
  deptFrag: any;
  workFrag: any;
  whereFrag: any;
}

const BKK = 'Asia/Bangkok';

/** Date condition on t.created_at in Bangkok local time. */
export function dateFragment(params: URLSearchParams) {
  const start = params.get('start_date');
  const end = params.get('end_date');
  const period = params.get('period') || 'today';
  if (start && end && /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return sql`(t.created_at at time zone ${BKK})::date between ${start}::date and ${end}::date`;
  }
  if (period === 'week') return sql`(t.created_at at time zone ${BKK})::date >= fixhub.today_bkk() - 7`;
  if (period === 'month') return sql`(t.created_at at time zone ${BKK})::date >= fixhub.today_bkk() - 30`;
  if (period === 'year') return sql`(t.created_at at time zone ${BKK})::date >= fixhub.today_bkk() - 365`;
  if (period === 'all') return sql`true`;
  return sql`(t.created_at at time zone ${BKK})::date = fixhub.today_bkk()`;
}

export function normalizeDept(d: string | null | undefined): 'MAINT' | 'IT' | '' {
  if (!d) return '';
  if (d === 'MAINT' || d === 'MAINTENANCE' || d === 'ช่าง') return 'MAINT';
  if (d === 'IT' || d === 'ไอที') return 'IT';
  return '';
}

export function normalizeWorkType(w: string | null | undefined): string {
  if (!w) return '';
  if (w === 'MAINT' || w === 'MAINTENANCE' || w === 'ช่าง') return 'MAINTENANCE';
  if (w === 'IT' || w === 'ไอที') return 'IT';
  return '';
}

/** Build scope for a report: respects user branches + department scope; `t` = tickets_full alias. */
export async function buildReportScope(user: User, params: URLSearchParams): Promise<ReportScope> {
  const branches = await getUserBranches(user.id, user.role);
  const requestedBranch = params.get('branch') || '';
  const effectiveBranches = requestedBranch && branches.includes(requestedBranch) ? [requestedBranch] : branches;

  const userScope = getWorkDeptScope(user);
  const requested = normalizeDept(params.get('department'));
  const dept: 'MAINT' | 'IT' | '' = userScope ? (requested && requested === userScope ? requested : userScope) : requested;
  const workType = normalizeWorkType(params.get('work_type'));

  const dateFrag = dateFragment(params);
  const branchFrag = effectiveBranches.length > 0 ? sql`and t.branch_code = any(${effectiveBranches})` : sql`and false`;
  const deptFrag = dept ? sql`and t.reporter_department = ${dept}` : sql``;
  const workFrag = workType ? sql`and t.dept_type = ${workType}` : sql``;
  const whereFrag = sql`${dateFrag} ${branchFrag} ${deptFrag} ${workFrag}`;

  return { branches: effectiveBranches, dept, workType, dateFrag, branchFrag, deptFrag, workFrag, whereFrag };
}
