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
