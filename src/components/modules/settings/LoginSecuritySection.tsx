"use client"

import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  Mail,
  Lock,
  Fingerprint,
  Smartphone,
  Trash2,
  Plus,
  ShieldCheck,
  LogOut,
  Loader2,
  AlertTriangle,
  Monitor,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/client-api';

// Pure client-side hinting only — the server (src/lib/password.ts) is the
// actual authority and re-validates independently on every request. Kept
// in sync with that same 8-char / letter / number policy.
function checkPasswordStrength(pw: string): string | null {
  if (!pw || pw.length < 8) return 'At least 8 characters';
  if (!/[a-zA-Z]/.test(pw)) return 'Include at least one letter';
  if (!/[0-9]/.test(pw)) return 'Include at least one number';
  return null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

// Small helper — Safari/older devices sometimes have `PublicKeyCredential`
// but not the browser package's own detection ready synchronously, so this
// mirrors exactly what the login page checks.
async function isPasskeySupported(): Promise<boolean> {
  const mod = await import('@simplewebauthn/browser');
  if (!mod.browserSupportsWebAuthn()) return false;
  return mod.platformAuthenticatorIsAvailable().catch(() => false);
}

// ---- Shared re-authentication dialog (used by: remove passkey, logout
// other devices, logout all devices — anything destructive enough to need
// the current password re-entered even though a session is already active) ----

function ReauthDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: (password: string) => void;
  busy: boolean;
}) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!open) setPassword('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-amber-400" /> {title}</DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">{description}</DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-1.5">
          <Label className="text-[10px] uppercase font-bold text-slate-500">Current Password</Label>
          <div className="relative">
            <Input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950 border-slate-800 h-11 pr-10"
              placeholder="••••••••"
              onKeyDown={(e) => { if (e.key === 'Enter' && password) onConfirm(password); }}
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} className="text-slate-400">Cancel</Button>
          <Button onClick={() => onConfirm(password)} disabled={!password || busy} className="bg-amber-600 hover:bg-amber-700">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Account: current email + change email (with verification token) ----

function AccountTab({ currentEmail }: { currentEmail: string }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ emailSendingConfigured: boolean; verificationPath?: string; expiresAt: string } | null>(null);

  const submit = async () => {
    if (!newEmail || !password) return;
    setLoading(true);
    try {
      const json = await apiFetch('/api/auth/change-email/request', {
        method: 'POST',
        body: JSON.stringify({ newEmail, currentPassword: password }),
      });
      setResult({ emailSendingConfigured: json.emailSendingConfigured, verificationPath: json.verificationPath, expiresAt: json.expiresAt });
      setPassword('');
      toast({ title: 'Verification Required', description: json.emailSendingConfigured ? 'A verification link has been sent to your new email.' : 'Email sending is not configured yet — see the link below.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Request Change', description: err?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!result?.verificationPath) return;
    const fullUrl = `${window.location.origin}${result.verificationPath}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast({ title: 'Copied', description: 'Verification link copied to clipboard.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could Not Copy', description: fullUrl });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-200"><Mail className="w-4 h-4 text-blue-400" /> Current Email</div>
        <p className="font-code text-lg text-white">{currentEmail || '—'}</p>

        {!editing ? (
          <Button variant="outline" onClick={() => setEditing(true)} className="border-slate-800 text-xs uppercase font-bold h-10">
            Change Email
          </Button>
        ) : (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">New Email Address</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-slate-950 border-slate-800 h-11" placeholder="new@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Current Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-950 border-slate-800 h-11" placeholder="••••••••" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setEditing(false); setResult(null); }} className="text-slate-400 text-xs uppercase font-bold">Cancel</Button>
              <Button onClick={submit} disabled={!newEmail || !password || loading} className="bg-[#123C8C] hover:bg-[#0D2E63] text-xs uppercase font-bold h-10 px-6">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Verification'}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase"><AlertTriangle className="w-4 h-4" /> {result.emailSendingConfigured ? 'Check Your New Inbox' : 'Email Sending Is Not Configured Yet'}</div>
            {!result.emailSendingConfigured && result.verificationPath && (
              <>
                <p className="text-[11px] text-slate-400 leading-relaxed">No SMTP/email provider is connected yet, so the link can't be delivered automatically. Since you're already signed in, you can open it directly to finish the change.</p>
                <div className="flex items-center gap-2">
                  <a href={result.verificationPath} target="_blank" rel="noreferrer" className="flex-1 truncate text-[10px] font-code text-blue-400 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                    {window.location.origin}{result.verificationPath}
                  </a>
                  <Button size="icon" variant="outline" onClick={copyLink} className="border-slate-800 h-9 w-9 shrink-0"><Copy className="w-3.5 h-3.5" /></Button>
                  <a href={result.verificationPath} target="_blank" rel="noreferrer"><Button size="icon" variant="outline" className="border-slate-800 h-9 w-9 shrink-0"><ExternalLink className="w-3.5 h-3.5" /></Button></a>
                </div>
              </>
            )}
            <p className="text-[9px] text-slate-600 uppercase font-bold">Expires {fmtDate(result.expiresAt)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Password ----

function PasswordTab() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const strengthError = newPassword ? checkPasswordStrength(newPassword) : null;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const submit = async () => {
    if (!currentPassword || !newPassword || strengthError || mismatch) return;
    setLoading(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast({ title: 'Password Changed', description: 'You have been signed out of every other device for security.' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Change Password', description: err?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-5 max-w-lg">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-200"><Lock className="w-4 h-4 text-blue-400" /> Change Password</div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase font-bold text-slate-500">Current Password</Label>
        <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-slate-950 border-slate-800 h-11" placeholder="••••••••" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase font-bold text-slate-500">New Password</Label>
        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-slate-950 border-slate-800 h-11" placeholder="••••••••" />
        {strengthError && <p className="text-[10px] text-amber-500">{strengthError}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase font-bold text-slate-500">Confirm New Password</Label>
        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-slate-950 border-slate-800 h-11" placeholder="••••••••" />
        {mismatch && <p className="text-[10px] text-rose-500">Passwords do not match</p>}
      </div>
      <Button
        onClick={submit}
        disabled={loading || !currentPassword || !newPassword || !!strengthError || mismatch}
        className="w-full h-11 bg-[#123C8C] hover:bg-[#0D2E63] text-xs uppercase font-bold"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
      </Button>
    </div>
  );
}

// ---- Biometric / Passkeys ----

interface CredentialRow {
  credentialId: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

function BiometricTab() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<CredentialRow[] | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [registering, setRegistering] = useState(false);
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = async () => {
    try {
      const json = await apiFetch('/api/auth/webauthn/credentials');
      setCredentials(json.credentials);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Load Passkeys', description: err?.message });
      setCredentials([]);
    }
  };

  useEffect(() => {
    load();
    isPasskeySupported().then(setSupported);
  }, []);

  const register = async () => {
    const name = deviceNameInput.trim() || 'Unnamed device';
    setRegistering(true);
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const optionsJson = await apiFetch('/api/auth/webauthn/register-options', { method: 'POST' });
      const attestation = await startRegistration({ optionsJSON: optionsJson.options });
      await apiFetch('/api/auth/webauthn/register-verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId: optionsJson.challengeId, response: attestation, deviceName: name }),
      });
      toast({ title: 'Passkey Registered', description: `"${name}" can now be used to sign in.` });
      setShowNameInput(false);
      setDeviceNameInput('');
      await load();
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        toast({ variant: 'destructive', title: 'Registration Failed', description: err?.message || 'Please try again.' });
      }
    } finally {
      setRegistering(false);
    }
  };

  const confirmRemove = async (password: string) => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await apiFetch(`/api/auth/webauthn/credentials/${encodeURIComponent(removeTarget)}`, {
        method: 'DELETE',
        body: JSON.stringify({ currentPassword: password }),
      });
      toast({ title: 'Passkey Removed' });
      setRemoveTarget(null);
      await load();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Remove Passkey', description: err?.message || 'Please try again.' });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      {supported === false && (
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-400">
          Biometric / Passkey login is not available on this device/browser. You can still register a passkey from a device that supports it (Windows Hello, Touch ID, Face ID, or Android biometrics).
        </div>
      )}

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200"><Fingerprint className="w-4 h-4 text-emerald-400" /> Registered Passkeys</div>
          {!showNameInput && (
            <Button size="sm" onClick={() => setShowNameInput(true)} disabled={supported === false} className="bg-emerald-600 hover:bg-emerald-700 text-[10px] uppercase font-bold h-9 disabled:opacity-40">
              <Plus className="w-3.5 h-3.5 mr-1" /> Register This Device
            </Button>
          )}
        </div>

        {showNameInput && (
          <div className="flex flex-col sm:flex-row gap-2 p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <Input
              value={deviceNameInput}
              onChange={(e) => setDeviceNameInput(e.target.value)}
              placeholder="e.g. My iPhone, Office Laptop"
              className="bg-slate-900 border-slate-800 h-10 flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') register(); }}
            />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowNameInput(false)} className="text-slate-400 text-[10px] uppercase font-bold">Cancel</Button>
              <Button onClick={register} disabled={registering} className="bg-emerald-600 hover:bg-emerald-700 text-[10px] uppercase font-bold h-10 px-5">
                {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {credentials === null && <p className="text-xs text-slate-600 italic">Loading…</p>}
          {credentials?.length === 0 && <p className="text-xs text-slate-600 italic">No passkeys registered yet.</p>}
          {credentials?.map((c) => (
            <div key={c.credentialId} className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0"><Smartphone className="w-4 h-4" /></div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-100 truncate">{c.deviceName}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">Added {fmtDate(c.createdAt)} • Last used {fmtDate(c.lastUsedAt)}</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setRemoveTarget(c.credentialId)} className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      </div>

      <ReauthDialog
        open={!!removeTarget}
        title="Remove Passkey"
        description="Enter your current password to confirm removing this passkey."
        onCancel={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
        busy={removing}
      />
    </div>
  );
}

// ---- Devices & Sessions ----

interface SessionRow {
  id: string;
  deviceInfo: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

function SessionsTab() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [pendingAction, setPendingAction] = useState<{ scope: 'others' | 'all'; label: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const json = await apiFetch('/api/auth/sessions');
      setSessions(json.sessions);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Load Sessions', description: err?.message });
      setSessions([]);
    }
  };

  useEffect(() => { load(); }, []);

  const logoutOne = async (session: SessionRow) => {
    try {
      await apiFetch('/api/auth/sessions', { method: 'DELETE', body: JSON.stringify({ scope: 'one', sessionId: session.id }) });
      toast({ title: 'Signed Out' });
      if (session.isCurrent) {
        localStorage.removeItem('gj5_auth_token');
        localStorage.removeItem('gj5_active_user');
        window.location.href = '/';
        return;
      }
      await load();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Sign Out', description: err?.message });
    }
  };

  const confirmBulk = async (password: string) => {
    if (!pendingAction) return;
    setBusy(true);
    try {
      const json = await apiFetch('/api/auth/sessions', { method: 'DELETE', body: JSON.stringify({ scope: pendingAction.scope, currentPassword: password }) });
      toast({ title: 'Done', description: `Signed out of ${json.count} device(s).` });
      setPendingAction(null);
      if (pendingAction.scope === 'all') {
        localStorage.removeItem('gj5_auth_token');
        localStorage.removeItem('gj5_active_user');
        window.location.href = '/';
        return;
      }
      await load();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Complete', description: err?.message || 'Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200"><Monitor className="w-4 h-4 text-blue-400" /> Active Sessions</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setPendingAction({ scope: 'others', label: 'Logout All Other Devices' })} className="border-slate-800 text-[10px] uppercase font-bold h-9">
              Logout All Other Devices
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPendingAction({ scope: 'all', label: 'Logout All Devices' })} className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[10px] uppercase font-bold h-9">
              <LogOut className="w-3.5 h-3.5 mr-1" /> Logout All Devices
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {sessions === null && <p className="text-xs text-slate-600 italic">Loading…</p>}
          {sessions?.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-xs text-slate-200 truncate max-w-[280px]">{s.deviceInfo || 'Unknown device'}</p>
                  {s.isCurrent && <Badge className="bg-emerald-500/10 text-emerald-400 text-[8px] uppercase h-4 px-1.5">This Device</Badge>}
                </div>
                <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5">Signed in {fmtDate(s.createdAt)} • Expires {fmtDate(s.expiresAt)}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => logoutOne(s)} className="text-[10px] uppercase font-bold text-slate-400 hover:text-rose-400 shrink-0">
                Log Out
              </Button>
            </div>
          ))}
        </div>
      </div>

      <ReauthDialog
        open={!!pendingAction}
        title={pendingAction?.label || ''}
        description="Enter your current password to confirm signing out other devices."
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmBulk}
        busy={busy}
      />
    </div>
  );
}

// ---- Root ----

export function LoginSecuritySection({ store }: { store: any }) {
  const currentEmail: string = store?.session?.email || localStorage.getItem('gj5_active_user') || '';

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-headline font-bold flex items-center gap-2"><KeyRound className="w-5 h-5 text-[#123C8C]" /> Login & Security</h3>
        <p className="text-slate-500 text-xs mt-1">Manage how you sign in — account email, password, passkeys, and where you're currently logged in.</p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="bg-slate-950/50 border border-slate-800 h-11 p-1 rounded-xl mb-6 grid grid-cols-2 sm:grid-cols-4 gap-1">
          <TabsTrigger value="account" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#123C8C] data-[state=active]:text-white">Account</TabsTrigger>
          <TabsTrigger value="password" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#123C8C] data-[state=active]:text-white">Password</TabsTrigger>
          <TabsTrigger value="biometric" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#123C8C] data-[state=active]:text-white">Passkeys</TabsTrigger>
          <TabsTrigger value="sessions" className="text-[10px] uppercase font-bold rounded-lg data-[state=active]:bg-[#123C8C] data-[state=active]:text-white">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="animate-in fade-in slide-in-from-bottom-2">
          <AccountTab currentEmail={currentEmail} />
        </TabsContent>
        <TabsContent value="password" className="animate-in fade-in slide-in-from-bottom-2">
          <PasswordTab />
        </TabsContent>
        <TabsContent value="biometric" className="animate-in fade-in slide-in-from-bottom-2">
          <BiometricTab />
        </TabsContent>
        <TabsContent value="sessions" className="animate-in fade-in slide-in-from-bottom-2">
          <SessionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
