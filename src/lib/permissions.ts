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
  // The four permission modules below are distinct namespaces from the
  // generic 'Employees' grid — an Admin can grant employee-roster access
  // (create/edit/salary) without also handing out Aadhaar/PAN/bank-detail
  // access, login-account control, or the security audit trail, and vice
  // versa. Each is enforced independently server-side via
  // requirePermission(request, '<module>', <action>) on its own route(s) —
  // never just hidden in the UI:
  //   KYC Vault        -> /api/erp/employees/:id/documents/**
  //   Employee Profile -> GET/PUT /api/erp/employees/:id
  //   Employee Login   -> .../login-access, .../reset-password, .../revoke-sessions
  //   Audit Logs       -> GET .../audit
  'KYC Vault',
  'Employee Profile',
  'Employee Login',
  'Audit Logs',
] as const;

export type ErpModule = typeof ERP_MODULES[number];
export const PERMISSION_ACTIONS: (keyof ModuleActionPermissions)[] = ['view', 'create', 'edit', 'delete', 'print', 'export'];

// The role dropdown's presets. An Admin may also assign a free-text "Custom
// Role" outside this list (see EmployeesModule.tsx) — Employee.role is a
// plain string precisely to allow that; any role name not found here (custom
// or otherwise) falls back to a conservative, mostly-no-access baseline via
// getDefaultPermissions below rather than inheriting another role's grid.
export const PRESET_ROLES = [
  'Super Admin',
  'Admin',
  'HR Manager',
  'Service Manager',
  'Technician',
  'Sales Executive',
  'Delivery Executive',
  'Accountant',
  'Store Manager',
  'Employee',
] as const;

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
// never weaken it. Roles without an explicit spec below (including any
// custom role text an Admin types in) get a conservative baseline
// (Dashboard + own Employee Profile view-only, everything else off) rather
// than silently inheriting another role's access.
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, ModulePermissions> = {
  'Super Admin': allFullAccess(),
  Admin: allFullAccess(),
  'HR Manager': {
    Dashboard: VIEW_ONLY, Repairing: NONE, 'Repair Jobs': NONE, 'CRM Leads': NONE,
    Billing: NONE, 'Invoice History': NONE, Stock: NONE, Employees: FULL_NO_DELETE,
    Attendance: FULL_NO_DELETE, Salary: FULL_NO_DELETE, Analytics: NONE, 'E-Wallet': NONE,
    Logistics: NONE, Settings: NONE, 'KYC Vault': FULL_NO_DELETE,
    'Employee Profile': FULL_NO_DELETE, 'Employee Login': FULL_NO_DELETE, 'Audit Logs': VIEW_ONLY,
  },
  'Service Manager': {
    Dashboard: VIEW_ONLY, Repairing: FULL, 'Repair Jobs': FULL, 'CRM Leads': VIEW_CREATE,
    Billing: VIEW_ONLY, 'Invoice History': VIEW_ONLY, Stock: FULL_NO_DELETE, Employees: NONE,
    Attendance: FULL_NO_DELETE, Salary: NONE, Analytics: VIEW_ONLY, 'E-Wallet': NONE,
    Logistics: VIEW_ONLY, Settings: NONE, 'KYC Vault': NONE,
    'Employee Profile': VIEW_ONLY, 'Employee Login': NONE, 'Audit Logs': NONE,
  },
  Technician: {
    Dashboard: VIEW_ONLY, Repairing: FULL, 'Repair Jobs': FULL_NO_DELETE, 'CRM Leads': VIEW_ONLY,
    Billing: NONE, 'Invoice History': VIEW_ONLY, Stock: VIEW_ONLY, Employees: NONE,
    Attendance: VIEW_CREATE, Salary: NONE, Analytics: NONE, 'E-Wallet': NONE,
    Logistics: VIEW_ONLY, Settings: NONE, 'KYC Vault': NONE,
    'Employee Profile': VIEW_ONLY, 'Employee Login': NONE, 'Audit Logs': NONE,
  },
  'Sales Executive': {
    Dashboard: VIEW_ONLY, Repairing: NONE, 'Repair Jobs': NONE, 'CRM Leads': FULL_NO_DELETE,
    Billing: VIEW_CREATE, 'Invoice History': VIEW_ONLY, Stock: VIEW_ONLY, Employees: NONE,
    Attendance: VIEW_CREATE, Salary: NONE, Analytics: VIEW_ONLY, 'E-Wallet': NONE,
    Logistics: VIEW_ONLY, Settings: NONE, 'KYC Vault': NONE,
    'Employee Profile': VIEW_ONLY, 'Employee Login': NONE, 'Audit Logs': NONE,
  },
  'Delivery Executive': {
    Dashboard: VIEW_ONLY, Repairing: NONE, 'Repair Jobs': VIEW_ONLY, 'CRM Leads': NONE,
    Billing: NONE, 'Invoice History': NONE, Stock: NONE, Employees: NONE,
    Attendance: VIEW_CREATE, Salary: NONE, Analytics: NONE, 'E-Wallet': NONE,
    Logistics: FULL_NO_DELETE, Settings: NONE, 'KYC Vault': NONE,
    'Employee Profile': VIEW_ONLY, 'Employee Login': NONE, 'Audit Logs': NONE,
  },
  Accountant: {
    Dashboard: VIEW_ONLY, Repairing: NONE, 'Repair Jobs': VIEW_ONLY, 'CRM Leads': NONE,
    Billing: FULL, 'Invoice History': FULL, Stock: VIEW_ONLY, Employees: NONE,
    Attendance: NONE, Salary: FULL, Analytics: VIEW_ONLY, 'E-Wallet': FULL,
    Logistics: NONE, Settings: NONE, 'KYC Vault': NONE,
    'Employee Profile': VIEW_ONLY, 'Employee Login': NONE, 'Audit Logs': NONE,
  },
  'Store Manager': {
    Dashboard: FULL, Repairing: VIEW_ONLY, 'Repair Jobs': FULL_NO_DELETE, 'CRM Leads': VIEW_CREATE,
    Billing: FULL_NO_DELETE, 'Invoice History': VIEW_ONLY, Stock: FULL, Employees: NONE,
    Attendance: FULL_NO_DELETE, Salary: VIEW_ONLY, Analytics: FULL, 'E-Wallet': VIEW_ONLY,
    Logistics: FULL_NO_DELETE, Settings: VIEW_ONLY, 'KYC Vault': NONE,
    'Employee Profile': VIEW_ONLY, 'Employee Login': NONE, 'Audit Logs': NONE,
  },
  Employee: {
    Dashboard: VIEW_ONLY, Repairing: FULL, 'Repair Jobs': FULL, 'CRM Leads': VIEW_ONLY,
    Billing: NONE, 'Invoice History': VIEW_ONLY, Stock: VIEW_ONLY, Employees: NONE,
    Attendance: FULL, Salary: NONE, Analytics: NONE, 'E-Wallet': NONE,
    Logistics: VIEW_ONLY, Settings: NONE, 'KYC Vault': NONE,
    'Employee Profile': VIEW_ONLY, 'Employee Login': NONE, 'Audit Logs': NONE,
  },
};

export function getDefaultPermissions(role: UserRole): ModulePermissions {
  const preset = DEFAULT_PERMISSIONS_BY_ROLE[role];
  if (!preset) {
    // Unknown/custom role — conservative baseline rather than no access at
    // all, so a newly-invented role can still see the dashboard and their
    // own profile until an Admin deliberately grants more.
    return { ...allNoAccess(), Dashboard: VIEW_ONLY, 'Employee Profile': VIEW_ONLY };
  }
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
