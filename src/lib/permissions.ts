import { ModuleActionPermissions, ModulePermissions, UserRole } from './types';

// Single source of truth for the module list, matching exactly what's in the
// sidebar today (src/app/dashboard/page.tsx's DEFAULT_NAV_ORDER +
// STANDALONE_REPAIR_ITEMS + the always-present Settings entry) — do not
// duplicate this list elsewhere; import it.
export const ERP_MODULES = [
  'Dashboard',
  'Repairing',
  'Repair Jobs',
  'CRM Leads',
  'Billing',
  'Invoice History',
  'Stock',
  'Employees',
  'Attendance',
  'Salary',
  'Analytics',
  'E-Wallet',
  'Logistics',
  'Settings',
] as const;

export type ErpModule = typeof ERP_MODULES[number];
export const PERMISSION_ACTIONS: (keyof ModuleActionPermissions)[] = ['view', 'create', 'edit', 'delete', 'print', 'export'];

const NONE: ModuleActionPermissions = { view: false, create: false, edit: false, delete: false, print: false, export: false };
const FULL: ModuleActionPermissions = { view: true, create: true, edit: true, delete: true, print: true, export: true };
const VIEW_ONLY: ModuleActionPermissions = { ...NONE, view: true };
const VIEW_CREATE: ModuleActionPermissions = { ...NONE, view: true, create: true };
const FULL_NO_DELETE: ModuleActionPermissions = { ...FULL, delete: false };

function buildAll(action: ModuleActionPermissions): ModulePermissions {
  return Object.fromEntries(ERP_MODULES.map((m) => [m, { ...action }]));
}

export function allFullAccess(): ModulePermissions { return buildAll(FULL); }
export function allViewOnly(): ModulePermissions { return buildAll(VIEW_ONLY); }
export function allNoAccess(): ModulePermissions { return buildAll(NONE); }

// Role defaults. Admin/Super Admin are always full-access — enforced again at
// save time server-side (src/lib/erp/employees.ts) so a stray UI state can
// never weaken it. Roles without an explicit spec below get a conservative
// baseline (Dashboard view-only, everything else off) rather than silently
// inheriting Technician's access.
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, ModulePermissions> = {
  'Super Admin': allFullAccess(),
  Admin: allFullAccess(),
  Manager: {
    Dashboard: FULL, Repairing: FULL, 'Repair Jobs': FULL, 'CRM Leads': FULL,
    Billing: FULL, 'Invoice History': FULL, Stock: FULL, Employees: FULL,
    Attendance: FULL, Salary: VIEW_ONLY, Analytics: FULL, 'E-Wallet': FULL,
    Logistics: FULL, Settings: VIEW_ONLY,
  },
  Accountant: {
    Dashboard: VIEW_ONLY, Repairing: NONE, 'Repair Jobs': VIEW_ONLY, 'CRM Leads': NONE,
    Billing: FULL, 'Invoice History': FULL, Stock: VIEW_ONLY, Employees: NONE,
    Attendance: NONE, Salary: FULL, Analytics: VIEW_ONLY, 'E-Wallet': FULL,
    Logistics: NONE, Settings: NONE,
  },
  'Service Manager': {
    Dashboard: VIEW_ONLY, Repairing: FULL, 'Repair Jobs': FULL, 'CRM Leads': VIEW_CREATE,
    Billing: VIEW_ONLY, 'Invoice History': VIEW_ONLY, Stock: FULL_NO_DELETE, Employees: NONE,
    Attendance: FULL_NO_DELETE, Salary: NONE, Analytics: VIEW_ONLY, 'E-Wallet': NONE,
    Logistics: VIEW_ONLY, Settings: NONE,
  },
  Technician: {
    Dashboard: VIEW_ONLY, Repairing: FULL, 'Repair Jobs': FULL_NO_DELETE, 'CRM Leads': VIEW_ONLY,
    Billing: NONE, 'Invoice History': VIEW_ONLY, Stock: VIEW_ONLY, Employees: NONE,
    Attendance: VIEW_CREATE, Salary: NONE, Analytics: NONE, 'E-Wallet': NONE,
    Logistics: VIEW_ONLY, Settings: NONE,
  },
  'Sales Executive': {
    Dashboard: VIEW_ONLY, Repairing: NONE, 'Repair Jobs': NONE, 'CRM Leads': FULL_NO_DELETE,
    Billing: VIEW_CREATE, 'Invoice History': VIEW_ONLY, Stock: VIEW_ONLY, Employees: NONE,
    Attendance: VIEW_CREATE, Salary: NONE, Analytics: VIEW_ONLY, 'E-Wallet': NONE,
    Logistics: VIEW_ONLY, Settings: NONE,
  },
  'Delivery Executive': {
    Dashboard: VIEW_ONLY, Repairing: NONE, 'Repair Jobs': VIEW_ONLY, 'CRM Leads': NONE,
    Billing: NONE, 'Invoice History': NONE, Stock: NONE, Employees: NONE,
    Attendance: VIEW_CREATE, Salary: NONE, Analytics: NONE, 'E-Wallet': NONE,
    Logistics: FULL_NO_DELETE, Settings: NONE,
  },
  Employee: {
    Dashboard: VIEW_ONLY, Repairing: FULL, 'Repair Jobs': FULL, 'CRM Leads': VIEW_ONLY,
    Billing: NONE, 'Invoice History': VIEW_ONLY, Stock: VIEW_ONLY, Employees: NONE,
    Attendance: FULL, Salary: NONE, Analytics: NONE, 'E-Wallet': NONE,
    Logistics: VIEW_ONLY, Settings: NONE,
  },
};

export function getDefaultPermissions(role: UserRole): ModulePermissions {
  const preset = DEFAULT_PERMISSIONS_BY_ROLE[role];
  if (!preset) return allNoAccess();
  return Object.fromEntries(ERP_MODULES.map((m) => [m, { ...(preset[m] || NONE) }]));
}

const isSuperAccessRole = (role: UserRole) => role === 'Admin' || role === 'Super Admin';

// Records saved before this feature existed (or mid-migration) won't have a
// complete grid — fall back to that employee's role defaults, module by
// module, rather than showing a blank/broken row.
export function resolvePermissions(role: UserRole, saved?: ModulePermissions | null): ModulePermissions {
  if (isSuperAccessRole(role)) return allFullAccess(); // never trust a stored value to reduce Admin access
  const defaults = getDefaultPermissions(role);
  if (!saved) return defaults;
  const merged: ModulePermissions = {};
  for (const m of ERP_MODULES) merged[m] = { ...defaults[m], ...(saved[m] || {}) };
  return merged;
}

// Hard safety net used at save time — Admin/Super Admin can never be
// persisted with reduced access, no matter what the UI sent.
export function enforceRolePermissions(role: UserRole, permissions?: ModulePermissions | null): ModulePermissions {
  if (isSuperAccessRole(role)) return allFullAccess();
  return resolvePermissions(role, permissions);
}

export function hasPermission(permissions: ModulePermissions | undefined | null, module: string, action: keyof ModuleActionPermissions): boolean {
  return !!permissions?.[module]?.[action];
}
