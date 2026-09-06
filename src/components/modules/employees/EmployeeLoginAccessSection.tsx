"use client"

import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Eye, EyeOff, RotateCcw, LogOut as RevokeIcon, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/lib/types';

// Password fields are local, transient UI state ONLY — never merged into the
// shared `formData` object the rest of the modal saves generically. They are
// sent through their own dedicated, permission-gated endpoint
// (PUT/POST .../login-access, .../reset-password) and the hash is never
// returned by any response this component reads.
export function EmployeeLoginAccessSection({
  employee,
  store,
}: {
  employee: Partial<Employee>;
  store: any;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState(employee.loginAccess?.username || '');
  const [loginEmail, setLoginEmail] = useState(employee.loginAccess?.loginEmail || employee.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginEnabled, setLoginEnabled] = useState(employee.loginAccess?.loginEnabled ?? true);
  const [forcePasswordChange, setForcePasswordChange] = useState(employee.loginAccess?.forcePasswordChange ?? false);
  const [saving, setSaving] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const hasExistingAccess = !!employee.loginAccess?.username;
  const canSave = !!employee.id;

  const handleSaveAccess = async () => {
    if (!canSave) {
      toast({ variant: 'destructive', title: 'Save the associate first', description: 'Login access can be configured once this associate record is saved.' });
      return;
    }
    if (!hasExistingAccess && (!username || !password)) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Username and password are required to create login access.' });
      return;
    }
    if (password && password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match', description: 'Password and Confirm Password must be identical.' });
      return;
    }
    setSaving(true);
    try {
      await store.setEmployeeLoginAccess(employee.id, {
        username: username || undefined,
        loginEmail: loginEmail || undefined,
        password: password || undefined,
        loginEnabled,
        forcePasswordChange,
      });
      toast({ title: 'Login Access Saved', description: `Access ${loginEnabled ? 'enabled' : 'disabled'} for ${username || employee.name}.` });
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err?.message || 'Could not save login access.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!employee.id || !resetPassword) return;
    setResetting(true);
    try {
      await store.resetEmployeePassword(employee.id, resetPassword);
      toast({ title: 'Password Reset', description: 'The associate must use the new password on their next login.' });
      setResetPassword('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Reset Failed', description: err?.message || 'Could not reset password.' });
    } finally {
      setResetting(false);
    }
  };

  const handleRevokeSessions = async () => {
    if (!employee.id) return;
    setRevoking(true);
    try {
      await store.revokeEmployeeSessions(employee.id);
      toast({ title: 'Sessions Revoked', description: 'This associate has been signed out of every device.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err?.message || 'Could not revoke sessions.' });
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-headline font-bold text-white">Login &amp; Security</h2>
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Manage this associate's own sign-in access</p>
        </div>
      </div>

      {!canSave && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-400">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          Save the Profile tab first — login access is configured after the associate record exists.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase font-bold text-slate-400">Username / Login ID</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} disabled={hasExistingAccess} className="bg-slate-950 border-slate-800 h-11 font-code" placeholder="e.g. raj.technician" />
          {hasExistingAccess && <p className="text-[9px] text-slate-600">Username cannot be changed once set.</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase font-bold text-slate-400">Login Email</Label>
          <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="bg-slate-950 border-slate-800 h-11" placeholder="Optional — can also log in with this" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase font-bold text-slate-400">{hasExistingAccess ? 'New Password (leave blank to keep current)' : 'Password'}</Label>
          <div className="relative">
            <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-950 border-slate-800 h-11 pr-10" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase font-bold text-slate-400">Confirm Password</Label>
          <Input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-slate-950 border-slate-800 h-11" placeholder="••••••••" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
          <div>
            <p className="text-xs font-bold text-slate-200">Login Enabled</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Turn off to block sign-in immediately</p>
          </div>
          <Switch checked={loginEnabled} onCheckedChange={setLoginEnabled} />
        </div>
        <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
          <div>
            <p className="text-xs font-bold text-slate-200">Force Password Change</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Require a new password on next login</p>
          </div>
          <Switch checked={forcePasswordChange} onCheckedChange={setForcePasswordChange} />
        </div>
      </div>

      <Button type="button" onClick={handleSaveAccess} disabled={!canSave || saving} className="bg-[#0066FF] hover:bg-blue-600 h-11 px-8 font-bold uppercase text-xs">
        {saving ? 'Saving...' : 'Save Login Access'}
      </Button>

      {hasExistingAccess && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-400"><Clock className="w-3.5 h-3.5" /> Last Login: <span className="text-slate-200 font-bold">{employee.loginAccess?.lastLoginAt ? new Date(employee.loginAccess.lastLoginAt).toLocaleString() : 'Never'}</span></div>
            <div className="text-slate-400">Device: <span className="text-slate-200">{employee.loginAccess?.lastLoginDevice ? employee.loginAccess.lastLoginDevice.slice(0, 40) : '—'}</span></div>
            <div className="text-slate-400">Created: <span className="text-slate-200">{employee.loginAccess?.createdAt ? new Date(employee.loginAccess.createdAt).toLocaleDateString() : '—'}</span></div>
          </div>

          <div className="flex flex-wrap items-end gap-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Label className="text-[10px] uppercase font-bold text-rose-400">Reset Password</Label>
              <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="bg-slate-950 border-slate-800 h-10" placeholder="New password" />
            </div>
            <Button type="button" variant="outline" onClick={handleResetPassword} disabled={!resetPassword || resetting} className="border-rose-500/30 text-rose-400 h-10 hover:bg-rose-500/10">
              <RotateCcw className="w-4 h-4 mr-2" /> {resetting ? 'Resetting...' : 'Reset Password'}
            </Button>
            <Button type="button" variant="outline" onClick={handleRevokeSessions} disabled={revoking} className="border-slate-700 text-slate-400 h-10 hover:bg-slate-800">
              <RevokeIcon className="w-4 h-4 mr-2" /> {revoking ? 'Revoking...' : 'Revoke All Sessions'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
