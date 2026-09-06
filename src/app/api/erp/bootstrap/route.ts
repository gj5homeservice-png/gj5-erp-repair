import { NextResponse } from 'next/server';
import { requireUser, isAuthError } from '@/lib/api-auth';
import { getFullSnapshotData } from '@/lib/erp/snapshot';
import { getEmployeeAccessContext } from '@/lib/erp/employees';

// Maps each snapshot key to the module whose "view" permission gates it.
// Frontend tab-hiding is not security — an employee session with, say,
// Salary = No Access must not receive salary data in this payload at all,
// regardless of what the UI would have shown. Owner/admin sessions
// (employeeId === null) are unaffected and always get the full snapshot.
const SNAPSHOT_MODULE_MAP: Record<string, string> = {
  calls: 'Repairing',
  repairJobs: 'Repair Jobs',
  inquiries: 'CRM Leads',
  invoices: 'Billing',
  stock: 'Stock',
  employees: 'Employees',
  attendance: 'Attendance',
  attendanceLinks: 'Attendance',
  salaries: 'Salary',
  transactions: 'E-Wallet',
  walletBalance: 'E-Wallet',
  expenses: 'E-Wallet',
  transportationLogs: 'Logistics',
  salesOrders: 'CRM Leads',
  salesInvoices: 'CRM Leads',
  salesDeliveries: 'Logistics',
  salesCustomers: 'CRM Leads',
  settings: 'Settings',
};

// One combined "load everything" response for the logged-in tenant, so the
// dashboard's initial load is a single round trip instead of ~20 waterfalled
// requests. Used to seed SWR's cache; every subsequent read/write still goes
// through the focused per-entity routes (which each enforce their own
// permission independently).
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (isAuthError(auth)) return auth;
  try {
    const data: any = await getFullSnapshotData(auth.email);

    if (auth.employeeId) {
      const context = await getEmployeeAccessContext(auth.email, auth.employeeId);
      if (!context || context.status !== 'Active') {
        return NextResponse.json({ success: false, error: 'Your account is not active. Contact your administrator.' }, { status: 403 });
      }
      for (const [key, module] of Object.entries(SNAPSHOT_MODULE_MAP)) {
        if (!context.permissions[module]?.view) {
          if (Array.isArray(data[key])) data[key] = [];
          else if (key === 'walletBalance') data[key] = 0;
          else data[key] = null;
        }
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
