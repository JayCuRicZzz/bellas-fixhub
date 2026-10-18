import sql from './db';
import { getUserBranches, getWorkDeptScope } from './auth';
import { User } from '../types';

/** Same rule as the ticket list (/api/tickets): own branches, and — outside admin/gm —
 *  the user's work-department (MAINT/IT) or a ticket they reported themselves. */
export async function canSeeTicket(user: User, ticket: any): Promise<boolean> {
  const branches = await getUserBranches(user.id, user.role);
  if (!branches.includes(ticket.branch_code)) return false;
  const scope = getWorkDeptScope(user);
  return !scope || ticket.reporter_id === user.id || ticket.reporter_department === scope;
}

/** Load the minimal ticket row and check access. Returns 'notfound' | 'denied' | the row. */
export async function ticketAccess(user: User, ticketId: number): Promise<'notfound' | 'denied' | { status: string; branch_code: string }> {
  const rows = await sql`select ticket_id, branch_code, reporter_id, reporter_department, status from fixhub.tickets where ticket_id = ${ticketId}`;
  if (!rows.length) return 'notfound';
  return (await canSeeTicket(user, rows[0] as any)) ? (rows[0] as any) : 'denied';
}
