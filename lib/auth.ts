import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'hotel-fix-jwt-secret-key-2024';

export function signToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      branch_code: user.branch_code,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    return decoded;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): User | null {
  // Check Authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token && token.length >= 10) {
      const user = verifyToken(token);
      if (user) return user;
    }
  }
  // Fallback: check cookie (for browser requests)
  const cookieToken = req.cookies.get('token')?.value;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }
  return null;
}

export function getTokenFromCookies(req: NextRequest): string | null {
  const cookie = req.cookies.get('token');
  return cookie?.value || null;
}

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

const ALLOWED_ROLES: string[] = Object.values(ROLES);

export function canCreateTicket(role: string): boolean {
  return ([ROLES.FRONT_DESK, ROLES.HOUSEKEEPING, ROLES.ADMIN, ROLES.GM] as string[]).includes(role);
}

export function canManageTicket(role: string): boolean {
  return ([
    ROLES.TECHNICIAN,
    ROLES.TECHNICIAN_IT,
    ROLES.SUPERVISOR,
    ROLES.SUPERVISOR_IT,
    ROLES.ADMIN,
    ROLES.GM,
  ] as string[]).includes(role);
}

export function canApproveTicket(role: string): boolean {
  return ([
    ROLES.SUPERVISOR,
    ROLES.SUPERVISOR_IT,
    ROLES.ADMIN,
    ROLES.GM,
  ] as string[]).includes(role);
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

export function getDepartmentFromRole(role: string): string | null {
  if (['tech', 'sup'].includes(role)) return 'ช่าง';
  if (['it', 'supit'].includes(role)) return 'ไอที';
  return null;
}

/**
 * Get all branch codes a user has access to.
 * Admin/GM see all branches. Other roles only see their assigned branches from user_branches table.
 */
export async function getUserBranches(userId: number, role: string): Promise<string[]> {
  const { default: db } = await import('@/lib/db');

  // Admin and GM see all branches
  if (role === 'admin' || role === 'gm') {
    const [rows]: any = await db.query('SELECT branch_code FROM branches ORDER BY branch_code');
    return rows.map((r: any) => r.branch_code);
  }

  // Check user_branches table
  const [rows]: any = await db.query(
    'SELECT branch_code FROM user_branches WHERE user_id = ?',
    [userId]
  );

  if (rows.length === 0) {
    // Fallback: query user's own branch_code
    const [userRows]: any = await db.query(
      'SELECT branch_code FROM users WHERE user_id = ?',
      [userId]
    );
    return userRows.length > 0 && userRows[0].branch_code ? [userRows[0].branch_code] : [];
  }

  return rows.map((r: any) => r.branch_code);
}

/**
 * Check if user can rate KPI (supervisor, admin, gm)
 */
export function canRateKpi(role: string): boolean {
  return ['sup', 'supit', 'admin', 'gm'].includes(role);
}
