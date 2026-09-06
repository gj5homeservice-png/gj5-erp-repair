"use client"

import React, { useState } from 'react';
import { ShieldCheck, Search, Lock, Eye, Plus, Pencil, Trash2, Printer, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Employee, ModuleActionPermissions } from '@/lib/types';
import {
  ERP_MODULES,
  PERMISSION_ACTIONS,
  resolvePermissions,
  getDefaultPermissions,
  allFullAccess,
  allViewOnly,
  allNoAccess,
} from '@/lib/permissions';

const ACTION_META: Record<keyof ModuleActionPermissions, { label: string; icon: typeof Eye }> = {
  view: { label: 'View', icon: Eye },
  create: { label: 'Create', icon: Plus },
  edit: { label: 'Edit', icon: Pencil },
  delete: { label: 'Delete', icon: Trash2 },
  print: { label: 'Print', icon: Printer },
  export: { label: 'Export', icon: Download },
};

export function ModuleAccessSection({
  formData,
  setFormData,
}: {
  formData: Partial<Employee>;
  setFormData: (v: Partial<Employee>) => void;
}) {
  const [search, setSearch] = useState('');
  const role = formData.role || 'Employee';
  const isAdmin = role === 'Admin' || role === 'Super Admin';
  const permissions = resolvePermissions(role, formData.modulePermissions);

  const applyAll = (next: Record<string, ModuleActionPermissions>) => {
    setFormData({ ...formData, modulePermissions: next });
  };

  const toggleAction = (module: string, action: keyof ModuleActionPermissions, value: boolean) => {
    setFormData({
      ...formData,
      modulePermissions: { ...permissions, [module]: { ...permissions[module], [action]: value } },
    });
  };

  const visibleModules = ERP_MODULES.filter((m) => m.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-headline font-bold text-white">Module Access</h2>
          <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest">Control which ERP modules this associate can access</p>
        </div>
      </div>

      {isAdmin ? (
        <div className="p-6 bg-blue-600/5 rounded-2xl border border-blue-600/20 flex items-center gap-4">
          <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Admins always have full access to every module.</p>
            <p className="text-[10px] text-slate-400 mt-1">This is enforced automatically and cannot be reduced from this screen — change the System Role above if this associate shouldn't be an Admin.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => applyAll(allFullAccess())} className="h-8 border-slate-800 text-slate-200 text-[10px] font-bold uppercase hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30">
                Enable All
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyAll(allNoAccess())} className="h-8 border-slate-800 text-slate-200 text-[10px] font-bold uppercase hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30">
                Disable All
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyAll(allViewOnly())} className="h-8 border-slate-800 text-slate-200 text-[10px] font-bold uppercase hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30">
                Read Only
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyAll(getDefaultPermissions(role))} className="h-8 border-slate-800 text-slate-200 text-[10px] font-bold uppercase hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30">
                Reset To Role Defaults
              </Button>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <Input
                placeholder="Search modules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="text-left text-[10px] font-black uppercase text-slate-300 tracking-widest px-4 py-3">Module</th>
                  {PERMISSION_ACTIONS.map((action) => (
                    <th key={action} className="text-center text-[9px] font-black uppercase text-slate-300 tracking-widest px-2 py-3">{ACTION_META[action].label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleModules.map((module) => {
                  const modulePerm = permissions[module];
                  return (
                    <tr key={module} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-900/30">
                      <td className="px-4 py-3 text-xs font-bold text-slate-100 whitespace-nowrap">{module}</td>
                      {PERMISSION_ACTIONS.map((action) => (
                        <td key={action} className="px-2 py-3 text-center">
                          <Switch
                            checked={!!modulePerm?.[action]}
                            onCheckedChange={(v) => toggleAction(module, action, v)}
                            className={cn(modulePerm?.[action] ? 'data-[state=checked]:bg-emerald-500' : '')}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {visibleModules.length === 0 && (
                  <tr><td colSpan={PERMISSION_ACTIONS.length + 1} className="p-8 text-center text-slate-400 text-xs italic">No modules match "{search}".</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
