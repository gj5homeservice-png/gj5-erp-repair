import {
  LayoutDashboard,
  Wrench,
  ClipboardList,
  BarChart3,
  Receipt,
  History,
  Package,
  Users,
  CalendarCheck,
  DollarSign,
  Wallet,
  Truck,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface SidebarModuleDef {
  name: string;
  icon: LucideIcon;
}

// The full set of top-level ERP sidebar destinations — shared between the
// actual sidebar (DashboardClient.tsx) and the Sidebar Customization panel
// (Settings > Sidebar Customization) so the two can never drift out of sync
// on which modules exist or what icon represents each one.
export const ALL_SIDEBAR_MODULES: SidebarModuleDef[] = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Repairing', icon: Wrench },
  { name: 'Repair Jobs', icon: ClipboardList },
  { name: 'CRM Leads', icon: BarChart3 },
  { name: 'Billing', icon: Receipt },
  { name: 'Invoice History', icon: History },
  { name: 'Stock', icon: Package },
  { name: 'Employees', icon: Users },
  { name: 'Attendance', icon: CalendarCheck },
  { name: 'Salary', icon: DollarSign },
  { name: 'Analytics', icon: BarChart3 },
  { name: 'E-Wallet', icon: Wallet },
  { name: 'Logistics', icon: Truck },
  { name: 'Settings', icon: Settings },
];

export const DEFAULT_SIDEBAR_ORDER: string[] = [
  'Dashboard',
  'Logistics',
  'Repairing',
  'Repair Jobs',
  'CRM Leads',
  'E-Wallet',
  'Stock',
  'Billing',
  'Invoice History',
  'Employees',
  'Attendance',
  'Salary',
  'Analytics',
  'Settings',
];

// Hiding Settings would remove the only path back to Sidebar Customization,
// so it's always kept visible regardless of saved preference.
export const ALWAYS_VISIBLE_MODULE = 'Settings';

// Resolves a saved (possibly stale or partial) order against the current
// module list: known names keep the saved sequence, and any module not
// present in the saved order (e.g. a new one added to the app later) is
// appended at the end rather than silently disappearing.
export function resolveSidebarOrder(navOrder: string[] | null | undefined): SidebarModuleDef[] {
  const order = navOrder && navOrder.length ? navOrder : DEFAULT_SIDEBAR_ORDER;
  const byName = new Map(ALL_SIDEBAR_MODULES.map((m) => [m.name, m]));
  const seen = new Set<string>();
  const ordered: SidebarModuleDef[] = [];
  for (const name of order) {
    const mod = byName.get(name);
    if (mod && !seen.has(name)) {
      ordered.push(mod);
      seen.add(name);
    }
  }
  for (const mod of ALL_SIDEBAR_MODULES) {
    if (!seen.has(mod.name)) ordered.push(mod);
  }
  return ordered;
}
