"use client"

import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Eye, EyeOff, RotateCcw, LogOut as RevokeIcon, Clock, Wand2, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Employee } from '@/lib/types';

// Local-only helper — never sent anywhere as-is except into the password
// field the Admin can see and copy; the server hashes it same as any other
// password on save.
function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = 0; i < 8; i++) pwd += pick(all);
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

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

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword();
    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    toast({ title: 'Password Generated', description: 'Copy it now — it will not be shown again after saving.' });
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

      <div className="flex items-center justify-between p-4 bg-blue-600/5 border border-blue-600/20 rounded-xl">
        <div>
          <p className="text-sm font-bold text-white">Enable Employee Login</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Turn off to block sign-in immediately, without deleting the account</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={cn('text-[9px] font-black uppercase px-2 h-5 border-0', loginEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
            {loginEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
          <Switch checked={loginEnabled} onCheckedChange={setLoginEnabled} />
        </div>
      </div>

      <div className={cn('space-y-6 transition-opacity', !loginEnabled && 'opacity-60')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-300">Username / Login ID</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} disabled={hasExistingAccess} className="bg-slate-950 border-slate-800 h-11 font-code text-slate-100 placeholder:text-slate-600 disabled:text-slate-500" placeholder="e.g. raj.technician" />
            {hasExistingAccess && <p className="text-[9px] text-slate-500">Username cannot be changed once set.</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-300">Login Email</Label>
            <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="bg-slate-950 border-slate-800 h-11 text-slate-100 placeholder:text-slate-600" placeholder="Optional — can also log in with this" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-300">{hasExistingAccess ? 'New Password (leave blank to keep current)' : 'Password'}</Label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-950 border-slate-800 h-11 pr-10 text-slate-100 placeholder:text-slate-600" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-slate-300">Confirm Password</Label>
            <div className="flex gap-2">
              <Input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-slate-950 border-slate-800 h-11 text-slate-100 placeholder:text-slate-600" placeholder="••••••••" />
              <Button type="button" variant="outline" onClick={handleGeneratePassword} className="border-slate-700 text-slate-200 h-11 px-3 shrink-0 hover:bg-slate-800" title="Generate Password">
                <Wand2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
          <div>
            <p className="text-xs font-bold text-slate-100">Force Password Change on First Login</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest">Require a new password the first time they sign in</p>
          </div>
          <Switch checked={forcePasswordChange} onCheckedChange={setForcePasswordChange} />
        </div>
      </div>

      <Button type="button" onClick={handleSaveAccess} disabled={!canSave || saving} className="bg-[#0066FF] hover:bg-blue-600 h-11 px-8 font-bold uppercase text-xs">
        {saving ? 'Saving...' : 'Save Login Access'}
      </Button>

      {hasExistingAccess && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300"><Clock className="w-3.5 h-3.5 text-slate-400" /> Last Login: <span className="text-slate-100 font-bold">{employee.loginAccess?.lastLoginAt ? new Date(employee.loginAccess.lastLoginAt).toLocaleString() : 'Never'}</span></div>
            <div className="text-slate-300">Device: <span className="text-slate-100">{employee.loginAccess?.lastLoginDevice ? employee.loginAccess.lastLoginDevice.slice(0, 40) : '—'}</span></div>
            <div className="text-slate-300 flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-slate-400" /> IP: <span className="text-slate-100 font-code">{employee.loginAccess?.lastLoginIp || '—'}</span></div>
            <div className="text-slate-300">Created: <span className="text-slate-100">{employee.loginAccess?.createdAt ? new Date(employee.loginAccess.createdAt).toLocaleDateString() : '—'}</span></div>
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
