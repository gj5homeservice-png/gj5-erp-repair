"use client"

import React, { useState, useRef } from 'react';
import {
  Building2,
  MapPin,
  Receipt,
  Percent,
  Package,
  Truck,
  ShieldCheck,
  CalendarCheck,
  Hash,
  Bell,
  MessageSquare,
  Mail,
  SlidersHorizontal,
  DatabaseBackup,
  CloudUpload,
  Users,
  Camera,
  Save,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  FileDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Loader2,
  ArrowRight,
  Info,
  LayoutGrid,
  KeyRound
} from 'lucide-react';
import { SidebarCustomizationPanel } from './settings/SidebarCustomizationPanel';
import { LoginSecuritySection } from './settings/LoginSecuritySection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Company, SystemSettings } from '@/lib/types';
import {
  RECORD_CATEGORIES,
  DERIVED_EXPORT_CATEGORIES,
  getFullSnapshot,
  downloadJSON,
  downloadXLSX,
  validateImportFile,
  computeImportPreview,
  CategoryPreview
} from '@/lib/data-management';

const WARRANTY_OPTIONS = ['No Warranty', 'Customer Warranty', '30 Days', '90 Days', '180 Days', '1 Year', 'Custom Warranty'];

const SECTIONS = [
  { key: 'business', label: 'Business Profile', icon: Building2 },
  { key: 'loginSecurity', label: 'Login & Security', icon: KeyRound },
  { key: 'contact', label: 'Contact & Address', icon: MapPin },
  { key: 'invoiceBilling', label: 'Invoice & Billing', icon: Receipt },
  { key: 'taxGst', label: 'Tax / GST', icon: Percent },
  { key: 'productInventory', label: 'Product & Inventory', icon: Package },
  { key: 'deliverySettings', label: 'Delivery Settings', icon: Truck },
  { key: 'warrantySettings', label: 'Warranty Settings', icon: ShieldCheck },
  { key: 'attendanceSettings', label: 'Attendance Settings', icon: CalendarCheck },
  { key: 'numberingPrefixes', label: 'Numbering & ID Prefixes', icon: Hash },
  { key: 'notificationSettings', label: 'Notification Settings', icon: Bell },
  { key: 'messaging', label: 'Messaging (WhatsApp / SMS)', icon: MessageSquare },
  { key: 'emailSettings', label: 'Email Settings', icon: Mail },
  { key: 'systemPreferences', label: 'System Preferences', icon: SlidersHorizontal },
  { key: 'dataManagement', label: 'Data Management', icon: DatabaseBackup },
  { key: 'employeePermissions', label: 'Employee & Permissions', icon: Users },
  { key: 'sidebarCustomization', label: 'Sidebar Customization', icon: LayoutGrid },
] as const;

type SectionKey = typeof SECTIONS[number]['key'];

const EXPORT_BUTTONS: { key: string; label: string }[] = [
  { key: 'invoices', label: 'Sales' },
  { key: 'calls', label: 'Repair' },
  { key: 'customers', label: 'Customers' },
  { key: 'employees', label: 'Employees' },
  { key: 'stock', label: 'Products / Stock' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'transactions', label: 'Payments' },
  { key: 'transportationLogs', label: 'Logistics' },
  { key: 'warranty', label: 'Warranty' },
  { key: 'expenses', label: 'Expenses' },
];

export function SettingsModule({ store, onNavigate }: { store: any; onNavigate?: (tab: string) => void }) {
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState<SectionKey>('business');

  const profile: Partial<Company> = store.companyProfile || {};
  const [companyForm, setCompanyForm] = useState<Partial<Company>>(profile);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pendingImport, setPendingImport] = useState<{ data: Record<string, any>; preview: CategoryPreview[]; mode: 'import' | 'restore' } | null>(null);

  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState<{ at: string; total: number } | null>(null);

  const settings: SystemSettings = store.settings;

  const handleToggle = (key: keyof SystemSettings, label: string, value: boolean) => {
    store.updateSettings({ [key]: value });
    toast({ title: `${label} ${value ? 'Enabled' : 'Disabled'}`, description: 'Setting saved.' });
  };

  const confirmSection = (label: string) => {
    toast({ title: 'Settings Saved', description: `${label} settings are saved.` });
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCompanyForm(prev => ({ ...prev, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => setCompanyForm(prev => ({ ...prev, logoUrl: '' }));

  const handleSaveProfile = async () => {
    if (!companyForm.companyName) {
      toast({ variant: 'destructive', title: 'Business Name Required', description: 'Please enter a business name before saving.' });
      return;
    }
    setSavingProfile(true);
    try {
      await store.updateCompanyProfile(companyForm);
      toast({ title: 'Settings Saved', description: 'Company details updated successfully.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const companyField = (key: keyof Company, label: string, placeholder = '') => (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase font-bold text-slate-500">{label}</Label>
      <Input
        value={(companyForm[key] as string) || ''}
        onChange={e => setCompanyForm(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder}
        className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]"
      />
    </div>
  );

  const settingText = (key: keyof SystemSettings, label: string, type: 'text' | 'number' | 'password' = 'text') => (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase font-bold text-slate-500">{label}</Label>
      <Input
        type={type}
        value={settings[key] as any}
        onChange={e => store.updateSettings({ [key]: type === 'number' ? (Number(e.target.value) || 0) : e.target.value })}
        className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]"
      />
    </div>
  );

  const toggleRow = (key: keyof SystemSettings, label: string, description: string, extra?: React.ReactNode) => (
    <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
      <div className="min-w-0 pr-3">
        <Label className="text-xs font-bold text-slate-100">{label}</Label>
        <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        {extra}
      </div>
      <Switch checked={!!settings[key]} onCheckedChange={(v) => handleToggle(key, label, v)} className="shrink-0" />
    </div>
  );

  const SaveBar = ({ label, onClickOverride }: { label: string; onClickOverride?: () => void | Promise<void> }) => (
    <div className="flex justify-end pt-2">
      <Button onClick={() => (onClickOverride ? onClickOverride() : confirmSection(label))} disabled={savingProfile} className="bg-[#0066FF] hover:bg-blue-600 h-11 px-8 font-bold uppercase text-xs">
        {savingProfile && onClickOverride ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save Changes
      </Button>
    </div>
  );

  const SectionHeader = ({ title, description }: { title: string; description: string }) => (
    <div className="mb-6">
      <h3 className="text-lg font-headline font-bold text-white">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );

  const Disclosure = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl mb-4">
      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
      <p className="text-[10px] text-amber-200/80 leading-relaxed">{children}</p>
    </div>
  );

  // ---- Data Management ----

  const handleExportCategory = (key: string, label: string) => {
    const snapshot: any = getFullSnapshot(store);
    const rows = snapshot[key] ?? [];
    downloadJSON({ meta: snapshot.meta, [key]: rows }, `GJ5_${label.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
    toast({ title: 'Export Complete', description: `${rows.length} record(s) exported.` });
  };

  const handleExportAll = () => {
    const snapshot = getFullSnapshot(store);
    downloadJSON(snapshot, `GJ5_Full_Export_${new Date().toISOString().split('T')[0]}.json`);
    toast({ title: 'Export Complete', description: 'All ERP data exported as JSON.' });
  };

  const handleExportExcel = () => {
    const snapshot = getFullSnapshot(store);
    downloadXLSX(snapshot, `GJ5_Full_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Export Complete', description: 'Multi-sheet Excel file downloaded.' });
  };

  const handleCreateBackup = () => {
    const snapshot = getFullSnapshot(store);
    downloadJSON(snapshot, `GJ5_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    const counts: Record<string, number> = {};
    RECORD_CATEGORIES.forEach(({ key }) => { counts[key] = Array.isArray((snapshot as any)[key]) ? (snapshot as any)[key].length : 0; });
    store.recordBackup('success', counts);
    toast({ title: 'Backup Created', description: 'A full backup has been downloaded and logged.' });
  };

  // One-time migration of this browser's pre-existing localStorage data into
  // the Hostinger MySQL database. Reads the raw gj5_user_<email>_* keys
  // directly (the exact keys the app used before this device's data moved to
  // the cloud) rather than `store`, since `store` now reflects MySQL. Safe to
  // click more than once — the server upserts by each record's own id — and
  // never deletes anything from localStorage, which stays as a local backup.
  const handleMigrateToCloud = async () => {
    const activeUser = typeof window !== 'undefined' ? localStorage.getItem('gj5_active_user') : null;
    if (!activeUser) return;
    setMigrating(true);
    try {
      const prefix = `gj5_user_${activeUser}_`;
      const read = (key: string) => {
        const raw = localStorage.getItem(prefix + key);
        if (!raw) return undefined;
        try { return JSON.parse(raw); } catch { return undefined; }
      };
      const snapshot: Record<string, any> = {
        calls: read('calls') || [],
        inquiries: read('inquiries') || [],
        expenses: read('expenses') || [],
        transactions: read('transactions') || [],
        transportationLogs: read('transport_logs') || [],
        invoices: read('invoices') || [],
        stock: read('stock') || [],
        employees: read('employees') || [],
        attendance: read('attendance') || [],
        salaries: read('salaries') || [],
        leaves: read('leaves') || [],
        attendanceLinks: read('attendance_links') || [],
        walletBalance: read('wallet_balance'),
        settings: read('settings'),
        backupMeta: read('backup_meta'),
        salesOrders: read('sales_orders') || [],
        salesInvoices: read('sales_invoices') || [],
        salesDeliveries: read('sales_deliveries') || [],
        salesCustomers: read('sales_customers') || [],
        repairJobs: read('repair_jobs') || [],
      };
      const counts = await store.importAllData(snapshot);
      const total = Object.values(counts || {}).reduce((sum: number, n: any) => sum + (Number(n) || 0), 0);
      setMigrated({ at: new Date().toISOString(), total });
      toast({ title: 'Migration Complete', description: `${total} record(s) synced to the cloud database. Your original local data was not deleted.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Migration Failed', description: err?.message || 'Could not sync to the cloud database. Nothing was lost — your local data is untouched.' });
    } finally {
      setMigrating(false);
    }
  };

  const readAndPreview = (file: File, mode: 'import' | 'restore') => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target?.result as string;
      const result = validateImportFile(raw);
      if (!result.valid || !result.data) {
        toast({ variant: 'destructive', title: 'Import Failed', description: result.error || 'Invalid file.' });
        return;
      }
      const preview = computeImportPreview(store, result.data);
      setPendingImport({ data: result.data, preview, mode });
    };
    reader.readAsText(file);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) readAndPreview(file, 'import');
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) readAndPreview(file, 'restore');
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    if (pendingImport.mode === 'restore') {
      const activeUser = typeof window !== 'undefined' ? localStorage.getItem('gj5_active_user') : null;
      if (activeUser && typeof window !== 'undefined') {
        localStorage.setItem(`gj5_prerestore_backup_${activeUser}`, JSON.stringify(getFullSnapshot(store)));
      }
    }
    try {
      const counts = await store.importAllData(pendingImport.data);
      const total = Object.values(counts || {}).reduce((sum: number, n: any) => sum + (Number(n) || 0), 0);
      toast({ title: pendingImport.mode === 'restore' ? 'Restore Complete' : 'Import Complete', description: `${total} record(s) synced to the cloud database. No existing records were deleted.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: err?.message || 'Could not sync to the cloud database.' });
    }
    setPendingImport(null);
  };

  const totalValid = pendingImport?.preview.reduce((a, p) => a + p.valid, 0) || 0;
  const totalDuplicate = pendingImport?.preview.reduce((a, p) => a + p.duplicate, 0) || 0;
  const totalInvalid = pendingImport?.preview.reduce((a, p) => a + p.invalid, 0) || 0;

  const renderSection = () => {
    switch (activeSection) {
      case 'business':
        return (
          <div>
            <SectionHeader title="Business Profile" description="Your business identity — used across invoices, PDFs, prints and labels." />
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-800 bg-white flex items-center justify-center shrink-0">
                {companyForm.logoUrl ? <img src={companyForm.logoUrl} className="w-full h-full object-contain" alt="Company Logo" /> : <Camera className="w-6 h-6 text-slate-300" />}
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Company Logo</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="border-slate-800 h-9 text-xs" onClick={() => logoInputRef.current?.click()}>
                    {companyForm.logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                  {companyForm.logoUrl && (
                    <Button type="button" size="sm" variant="ghost" className="text-rose-400 hover:text-rose-300 h-9 text-xs" onClick={handleRemoveLogo}>Remove Logo</Button>
                  )}
                </div>
                <input type="file" ref={logoInputRef} accept="image/*" className="hidden" onChange={handleLogoFile} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {companyField('companyName', 'Business Name')}
              {companyField('tagline', 'Business Tagline')}
              {companyField('gstNumber', 'GSTIN Number')}
              {companyField('panNumber', 'PAN Number')}
            </div>
            <div className="pt-6"><SaveBar label="Business Profile" onClickOverride={handleSaveProfile} /></div>
          </div>
        );
      case 'loginSecurity':
        return <LoginSecuritySection store={store} />;
      case 'contact':
        return (
          <div>
            <SectionHeader title="Contact & Address" description="Reachability details used on invoices and customer-facing documents." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {companyField('ownerMobile', 'Mobile Number')}
              {companyField('alternateMobile', 'Alternate Mobile Number')}
              {companyField('ownerEmail', 'Gmail / Email')}
              {companyField('website', 'Website')}
              {companyField('address', 'Full Address')}
              {companyField('pincode', 'Pincode')}
              {companyField('city', 'City')}
              {companyField('state', 'State')}
              {companyField('country', 'Country')}
            </div>
            <div className="pt-6"><SaveBar label="Contact & Address" onClickOverride={handleSaveProfile} /></div>
          </div>
        );
      case 'invoiceBilling':
        return (
          <div>
            <SectionHeader title="Invoice & Billing" description="Defaults applied when opening a new invoice in Billing." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Default Payment Mode</Label>
                <Select value={settings.defaultPaymentMode} onValueChange={v => store.updateSettings({ defaultPaymentMode: v })}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="UPI">Digital UPI</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {settingText('defaultDueDays', 'Default Due Date (days from invoice date)', 'number')}
            </div>
            <p className="text-[10px] text-slate-600 mt-4">Invoice number prefix is configured under Numbering &amp; ID Prefixes.</p>
            <div className="pt-6"><SaveBar label="Invoice & Billing" /></div>
          </div>
        );
      case 'taxGst':
        return (
          <div>
            <SectionHeader title="Tax / GST" description="Controls GST availability and rate across Billing and Repair invoices." />
            {toggleRow('gstEnabled', 'GST', 'When off, the GST checkbox is hidden from Billing entirely. When on, GST stays optional per invoice.',
              settings.gstEnabled ? (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Rate %</span>
                  <Input type="number" value={settings.gstRate} onChange={e => store.updateSettings({ gstRate: Number(e.target.value) || 0 })} className="h-7 w-20 text-xs bg-slate-900 border-slate-800 text-[#F8FAFC]" />
                </div>
              ) : undefined
            )}
            <div className="pt-6"><SaveBar label="Tax / GST" /></div>
          </div>
        );
      case 'productInventory':
        return (
          <div>
            <SectionHeader title="Product & Inventory" description="Defaults applied when adding a new Stock item." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {settingText('defaultMinStockLevel', 'Default Minimum Stock Level', 'number')}
            </div>
            <div className="pt-6"><SaveBar label="Product & Inventory" /></div>
          </div>
        );
      case 'deliverySettings':
        return (
          <div>
            <SectionHeader title="Delivery Settings" description="Default intake mode for new repair jobs." />
            {toggleRow('defaultPickupRequired', 'Default Pickup Required', 'New repair jobs default to Pickup Required intake instead of Customer Visit.')}
            <div className="pt-6"><SaveBar label="Delivery Settings" /></div>
          </div>
        );
      case 'warrantySettings':
        return (
          <div>
            <SectionHeader title="Warranty Settings" description="Default warranty duration for new repair jobs, and when a warranty counts as Expiring Soon." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Default Warranty Duration</Label>
                <Select value={settings.defaultWarrantyDuration} onValueChange={v => store.updateSettings({ defaultWarrantyDuration: v })}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {WARRANTY_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {settingText('warrantyExpiringSoonDays', 'Expiring Soon Threshold (days)', 'number')}
            </div>
            <div className="pt-6"><SaveBar label="Warranty Settings" /></div>
          </div>
        );
      case 'attendanceSettings':
        return (
          <div>
            <SectionHeader title="Attendance Settings" description="Reference values for staff shift timing." />
            <Disclosure>These are saved as reference values. The Attendance module's own check-in/out and late-marking logic does not read them yet.</Disclosure>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {settingText('standardCheckInTime', 'Standard Check-In Time')}
              {settingText('lateThresholdMinutes', 'Late Threshold (minutes)', 'number')}
            </div>
            <div className="pt-6"><SaveBar label="Attendance Settings" /></div>
          </div>
        );
      case 'numberingPrefixes':
        return (
          <div>
            <SectionHeader title="Numbering & ID Prefixes" description="Prefixes used when new records are created." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {settingText('invoicePrefix', 'Invoice Number Prefix')}
              {settingText('customerIdPrefix', 'Customer ID Prefix')}
            </div>
            <p className="text-[10px] text-slate-600 mt-4">Repair Job IDs use category-specific prefixes (e.g. TV, PC, CCTV) assigned automatically by service category and are not affected by this setting. Existing IDs already issued never change.</p>
            <div className="pt-6"><SaveBar label="Numbering & ID Prefixes" /></div>
          </div>
        );
      case 'notificationSettings':
        return (
          <div>
            <SectionHeader title="Notification Settings" description="Preference flags for in-app alert categories." />
            <Disclosure>These save and persist correctly, but this app doesn't yet have a notification-dispatch system — toggling them changes the saved preference, not live alerts.</Disclosure>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toggleRow('customerNotifications', 'Customer Notifications', 'Preference flag for customer-facing alerts.')}
              {toggleRow('repairNotifications', 'Repair Notifications', 'Preference flag for repair status alerts.')}
              {toggleRow('salesNotifications', 'Sales Notifications', 'Preference flag for sales alerts.')}
              {toggleRow('invoiceNotifications', 'Invoice Notifications', 'Preference flag for invoice alerts.')}
              {toggleRow('deliveryNotifications', 'Delivery Notifications', 'Preference flag for delivery/logistics alerts.')}
              {toggleRow('warrantyNotifications', 'Warranty Notifications', 'Preference flag for warranty expiry alerts.')}
              {toggleRow('autoNotifications', 'Auto Notifications', 'Preference flag for automatic system alerts.')}
              {toggleRow('soundNotifications', 'Sound Notifications', 'Preference flag for in-app sound alerts.')}
            </div>
            <div className="pt-6"><SaveBar label="Notification Settings" /></div>
          </div>
        );
      case 'messaging':
        return (
          <div>
            <SectionHeader title="Messaging (WhatsApp / SMS)" description="Controls outgoing message channels." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toggleRow('whatsappNotifications', 'WhatsApp Notifications', 'When off, the WhatsApp send option is disabled in the Repair Registry.')}
              {toggleRow('smsNotifications', 'SMS Notifications', 'Preference flag — no SMS gateway is connected in this app yet.')}
            </div>
            <div className="pt-6"><SaveBar label="Messaging" /></div>
          </div>
        );
      case 'emailSettings':
        return (
          <div>
            <SectionHeader title="Email Settings" description="Controls outgoing email alerts." />
            <Disclosure>No email service (SMTP/API) is connected in this app yet — this saves your preference for when one is.</Disclosure>
            {toggleRow('emailNotifications', 'Email Notifications', 'Preference flag for email alerts.')}
            <div className="pt-6"><SaveBar label="Email Settings" /></div>
          </div>
        );
      case 'systemPreferences':
        return (
          <div>
            <SectionHeader title="System Preferences" description="Backup automation and the admin action password." />
            {toggleRow('autoBackup', 'Auto Backup', 'Automatically downloads and logs one backup per day while the app is open.')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {settingText('deletePassword', 'Admin Action Password', 'password')}
            </div>
            <p className="text-[10px] text-slate-600 mt-2">Required to confirm deleting a repair job, invoice, or stock item.</p>
            <div className="pt-6"><SaveBar label="System Preferences" /></div>
          </div>
        );
      case 'employeePermissions':
        return (
          <div>
            <SectionHeader title="Employee & Permissions" description="Staff records and access." />
            <Disclosure>This app currently has a single Owner login — there is no separate employee sign-in yet, so per-employee permission enforcement isn't meaningfully applicable. Employee records themselves are managed in the Employees module.</Disclosure>
            <Button variant="outline" className="border-slate-800 h-11" onClick={() => onNavigate?.('Employees')}>
              Open Employees Module <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );
      case 'sidebarCustomization':
        return <SidebarCustomizationPanel store={store} />;
      case 'dataManagement':
        return (
          <div>
            <SectionHeader title="Data Management" description="Export your ERP data, import a previous backup, or create/restore a full backup." />

            <div className="space-y-3 mb-8">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data Export</h4>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleExportAll} className="bg-[#0066FF] hover:bg-blue-600 h-10 text-xs font-bold">
                  <FileJson className="w-4 h-4 mr-2" /> Export All Data
                </Button>
                <Button onClick={handleExportExcel} variant="outline" className="border-slate-800 h-10 text-xs font-bold hover:bg-emerald-500/10 hover:text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {EXPORT_BUTTONS.map(({ key, label }, i) => (
                  <button key={`${key}-${label}-${i}`} onClick={() => handleExportCategory(key, label)}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold rounded-full transition-colors flex items-center gap-1.5">
                    <FileDown className="w-3 h-3" /> {label}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-600">Customers and Warranty are derived from Repairs &amp; Invoices — exported for reference, not a separate database collection.</p>
            </div>

            <div className="space-y-3 mb-8">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data Import</h4>
              <Button onClick={() => importInputRef.current?.click()} variant="outline" className="border-slate-800 h-10 text-xs font-bold hover:bg-blue-500/10 hover:text-blue-400">
                <Upload className="w-4 h-4 mr-2" /> Import Data
              </Button>
              <input type="file" ref={importInputRef} accept=".json" className="hidden" onChange={handleImportFile} />
              <p className="text-[9px] text-slate-600">Existing records are never deleted. Matching permanent IDs are updated in place; new IDs are added.</p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Data Backup</h4>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCreateBackup} className="bg-emerald-600 hover:bg-emerald-700 h-10 text-xs font-bold">
                  <DatabaseBackup className="w-4 h-4 mr-2" /> Create Backup
                </Button>
                <Button onClick={() => restoreInputRef.current?.click()} variant="outline" className="border-rose-500/30 text-rose-400 h-10 text-xs font-bold hover:bg-rose-500/10">
                  <Upload className="w-4 h-4 mr-2" /> Restore Backup
                </Button>
                <input type="file" ref={restoreInputRef} accept=".json" className="hidden" onChange={handleRestoreFile} />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                {store.backupMeta ? (
                  <span>
                    Last Backup: <span className="text-slate-300 font-bold">{new Date(store.backupMeta.lastBackupAt).toLocaleString()}</span>
                    {' · '}
                    <span className={store.backupMeta.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>{store.backupMeta.status === 'success' ? 'Success' : 'Failed'}</span>
                  </span>
                ) : <span>No backup has been created yet.</span>}
              </div>
            </div>

            <div className="space-y-3 pt-4 mt-4 border-t border-slate-800">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cloud Database</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                One-time sync of this device's locally-stored data into the Hostinger MySQL database, so every device signed in to this account sees the same records. Safe to run more than once — nothing on this device is deleted.
              </p>
              <Button onClick={handleMigrateToCloud} disabled={migrating} className="bg-[#0066FF] hover:bg-blue-600 h-10 text-xs font-bold">
                {migrating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
                {migrating ? 'Migrating...' : 'Migrate to Cloud Database'}
              </Button>
              {migrated && (
                <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{migrated.total} record(s) synced at {new Date(migrated.at).toLocaleString()}.</span>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Settings</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">System &amp; Company Configuration</p>
        </div>
        <Badge className="bg-blue-600/10 text-blue-400 border-blue-600/20 text-[9px] uppercase">Owner Access</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-3 space-y-1 lg:sticky lg:top-4">
            {SECTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
                  activeSection === key ? "bg-[#123C8C] text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold tracking-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-9">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8">
            {renderSection()}
          </div>
        </div>
      </div>

      {pendingImport && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-headline font-bold text-white">{pendingImport.mode === 'restore' ? 'Restore Preview' : 'Import Preview'}</h3>
              <button onClick={() => setPendingImport(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {pendingImport.mode === 'restore' && (
                <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-300 leading-relaxed">This can modify existing data. Please make sure you have a current backup. A safety snapshot of your current data will be saved automatically before restoring.</p>
                </div>
              )}
              <div className="space-y-2">
                {pendingImport.preview.length === 0 && <p className="text-xs text-slate-500 italic">No recognizable record collections found in this file.</p>}
                {pendingImport.preview.map(p => (
                  <div key={p.key} className="flex justify-between items-center text-xs p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                    <span className="font-bold text-slate-300">{p.label}</span>
                    <span className="text-slate-500 font-code">{p.total} record(s)</span>
                  </div>
                ))}
                {DERIVED_EXPORT_CATEGORIES.map(d => (pendingImport.data as any)[d.key] ? (
                  <div key={d.key} className="flex justify-between items-center text-xs p-3 bg-slate-900/30 rounded-xl border border-slate-800/60">
                    <span className="font-bold text-slate-500">{d.label}</span>
                    <span className="text-slate-600 italic">not imported (derived from Repairs/Invoices)</span>
                  </div>
                ) : null)}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-lg font-black text-emerald-400">{totalValid}</p>
                  <p className="text-[9px] uppercase font-bold text-emerald-500/80">New</p>
                </div>
                <div className="text-center p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-lg font-black text-amber-400">{totalDuplicate}</p>
                  <p className="text-[9px] uppercase font-bold text-amber-500/80">Existing (Updated)</p>
                </div>
                <div className="text-center p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <p className="text-lg font-black text-rose-400">{totalInvalid}</p>
                  <p className="text-[9px] uppercase font-bold text-rose-500/80">Invalid</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setPendingImport(null)}>Cancel</Button>
              <Button onClick={handleConfirmImport} className="bg-[#0066FF] hover:bg-blue-600 px-8 font-bold">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm {pendingImport.mode === 'restore' ? 'Restore' : 'Import'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
