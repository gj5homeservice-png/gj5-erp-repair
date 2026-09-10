"use client"

import React, { useEffect, useState } from 'react';
import { History, LogIn, LogOut, KeyRound, ShieldCheck, UserPlus, UserCog, FileStack, Ban, CheckCircle2, XCircle, Mail, Fingerprint, Monitor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Employee, EmployeeAuditLogEntry, AuditEventType } from '@/lib/types';

const EVENT_META: Record<AuditEventType, { label: string; icon: typeof History; color: string }> = {
  employee_created: { label: 'Employee Created', icon: UserPlus, color: 'text-blue-400' },
  employee_edited: { label: 'Employee Updated', icon: UserCog, color: 'text-blue-400' },
  password_reset: { label: 'Password Reset', icon: KeyRound, color: 'text-amber-400' },
  login: { label: 'Login', icon: LogIn, color: 'text-emerald-400' },
  logout: { label: 'Logout', icon: LogOut, color: 'text-slate-400' },
  account_blocked: { label: 'Login Disabled', icon: Ban, color: 'text-rose-400' },
  account_unblocked: { label: 'Login Enabled', icon: CheckCircle2, color: 'text-emerald-400' },
  permission_changed: { label: 'Permission Changed', icon: ShieldCheck, color: 'text-blue-400' },
  kyc_uploaded: { label: 'KYC Uploaded', icon: FileStack, color: 'text-blue-400' },
  kyc_verified: { label: 'KYC Verified', icon: CheckCircle2, color: 'text-emerald-400' },
  kyc_rejected: { label: 'KYC Rejected', icon: XCircle, color: 'text-rose-400' },
  kyc_deleted: { label: 'KYC Deleted', icon: XCircle, color: 'text-slate-400' },
  employee_suspended: { label: 'Employee Suspended', icon: Ban, color: 'text-amber-400' },
  employee_activated: { label: 'Employee Activated', icon: CheckCircle2, color: 'text-emerald-400' },
  employee_terminated: { label: 'Employee Terminated', icon: XCircle, color: 'text-rose-400' },
  employee_disabled: { label: 'Employee Disabled', icon: Ban, color: 'text-rose-400' },
  password_changed: { label: 'Password Changed', icon: KeyRound, color: 'text-emerald-400' },
  email_changed: { label: 'Email Changed', icon: Mail, color: 'text-blue-400' },
  passkey_registered: { label: 'Passkey Registered', icon: Fingerprint, color: 'text-emerald-400' },
  passkey_removed: { label: 'Passkey Removed', icon: Fingerprint, color: 'text-rose-400' },
  sessions_revoked: { label: 'Sessions Signed Out', icon: Monitor, color: 'text-amber-400' },
};

// Read-only by design — there is deliberately no delete action anywhere in
// this component or its backing API route. Only Admin/Super Admin (or
// anyone an Admin has explicitly granted the 'Audit Logs' permission)
// reaches this tab at all; see EmployeesModule.tsx's canAccessAuditLogs gate
// and GET /api/erp/employees/:id/audit's own server-side 'Audit Logs' check.
export function EmployeeActivitySection({ employee, store }: { employee: Partial<Employee>; store: any }) {
  const { toast } = useToast();
  const [logs, setLogs] = useState<EmployeeAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employee.id) return;
    setLoading(true);
    store.listEmployeeAuditLog(employee.id)
      .then((data: EmployeeAuditLogEntry[]) => setLogs(data))
      .catch((err: any) => toast({ variant: 'destructive', title: 'Could not load activity', description: err?.message }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-headline font-bold text-white">Activity &amp; Audit Log</h2>
          <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest">Security and change history for this associate</p>
        </div>
      </div>

      {loading && <p className="text-xs text-slate-400 italic">Loading activity...</p>}
      {!loading && logs.length === 0 && <p className="text-xs text-slate-400 italic">No recorded activity yet.</p>}

      <div className="space-y-2">
        {logs.map((log) => {
          const meta = EVENT_META[log.eventType] || { label: log.eventType, icon: History, color: 'text-slate-400' };
          const Icon = meta.icon;
          return (
            <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className={cn('p-2 rounded-lg bg-slate-900 shrink-0', meta.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-100">{meta.label}</p>
                  <span className="text-[10px] text-slate-400 font-code">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Performed by <span className="text-slate-200 font-bold">{log.performedBy}</span></p>
                {log.details && <p className="text-[10px] text-slate-400 mt-1">{log.details}</p>}
                {(log.ipAddress || log.deviceInfo) && (
                  <p className="text-[9px] text-slate-400 mt-1 font-code truncate">
                    {log.ipAddress && <>IP: {log.ipAddress} </>}
                    {log.deviceInfo && <>· {log.deviceInfo.slice(0, 60)}</>}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
