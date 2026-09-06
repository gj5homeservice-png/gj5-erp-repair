
export type RepairStatus = 'Pending' | 'Completed' | 'Rejected' | 'Exchange' | 'Purchase';

export interface VisitHistoryEntry {
  id: string;
  date: string;
  time: string;
  complaintDescription: string;
  technicianNotes: string;
  status: RepairStatus;
}

export interface RepairCall {
  id: string;
  customerId: string;
  customerName: string;
  mobile: string;
  address: string;
  pincode: string;
  category: string;
  brand: string;
  model: string;
  screenSize: string;
  techTags: string[];
  intakeMode: 'Customer Visit' | 'Pickup Required';
  createdAt: string;
  updatedAt: string;
  status: RepairStatus;
  warrantyDuration?: string;
  warrantyExpiry?: string;
  storeLocation?: string;
  problemDescription: string;
  visitHistory: VisitHistoryEntry[];
  repeatCount: number;
  isOldEntry?: boolean;
  entryDate?: string;
  receivedDate?: string;
  photos?: string[];
}

export interface Company {
  id: string;
  companyName: string;
  ownerName: string;
  ownerEmail: string;
  ownerMobile: string;
  logoUrl?: string;
  planName: string;
  planStartDate: string;
  planExpiryDate: string;
  subscriptionStatus: 'active' | 'expired' | 'trial' | 'pending';
  companyStatus: 'active' | 'suspended' | 'blocked';
  createdAt: string;
  updatedAt: string;
  userId: string;
  workspaceId: string;
  paymentStatus: string;
  couponCode?: string;
  isBlocked: boolean;
  lastLoginAt: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  category?: string;
  services?: string;
  gstNumber?: string;
  alternateMobile?: string;
  website?: string;
  country?: string;
  tagline?: string;
  panNumber?: string;
}

export interface TVProduct {
  id: string;
  name: string;
  brand: string;
  size: string;
  os: string;
  resolution: string;
  features: string[];
  mrp: number;
  offerPrice: number;
  warranty: string;
  stock: number;
  imageUrl: string;
  isOffer: boolean;
  lastUpdated: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  pincode: string;
  email?: string;
  createdAt: string;
}

export interface SalesOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  items: any[];
  totalAmount: number;
  status: 'Pending' | 'Processed' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentMode: string;
  createdAt: string;
}

export interface ProductInquiry {
  id: string;
  customerName: string;
  mobile: string;
  address: string;
  pincode: string;
  productId: string;
  productName: string;
  message: string;
  status: 'New' | 'Pending' | 'Confirmed' | 'Delivered' | 'Cancelled';
  createdAt: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount: string;
  expiryDate: string;
  active: boolean;
}

export interface InvoiceItem {
  id: string;
  name: string;
  brand: string;
  size: string;
  quantity: number;
  rate: number;
  gstPercent: number;
  discount: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  mobile: string;
  address: string;
  customerGSTIN?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Credit' | 'Razorpay' | 'Coupon';
  timestamp: string;
  jobId?: string;
  model?: string;
  brand?: string;
  labourCharges?: number;
  total?: number;
  taxEnabled?: boolean;
  gst?: number;
}

export interface StockItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  minStockLevel: number;
  barcode: string;
  images: string[];
  lastUpdated: string;
  history: any[];
  supplierName?: string;
  supplierMobile?: string;
  purchaseDate?: string;
  warrantyPeriod?: string;
  description?: string;
  addedBy?: string;
  editedBy?: string;
  model?: string;
  screenSize?: string;
  serialNumber?: string;
  storeLocation?: string;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  date: string;
  time: string;
  type: string;
  description: string;
  metadata?: any;
}

export interface VisibilitySettings {
  tabs: Record<string, boolean>;
  kpis: Record<string, boolean>;
}

export interface Inquiry {
  id: string;
  customerName: string;
  mobile: string;
  alternateMobile?: string;
  address?: string;
  city?: string;
  pincode?: string;
  productType: string;
  brand: string;
  modelNumber?: string;
  problemDescription?: string;
  source: 'Walk-In' | 'Call' | 'WhatsApp' | 'Facebook' | 'Instagram' | 'Referral';
  priority: 'Low' | 'Medium' | 'High';
  expectedBudget?: number;
  assignedTechnician?: string;
  followUpDate: string;
  status: 'New' | 'Pending' | 'Follow-up' | 'Converted' | 'Rejected';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  convertedJobId?: string;
  conversionDate?: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  vendorName: string;
  date: string;
  paymentMode: string;
  timestamp: string;
}

export interface TransportationLog {
  id: string;
  runnerName: string;
  runnerMobile: string;
  jobId: string;
  customerName: string;
  customerMobile: string;
  address: string;
  status: LogisticsStatus;
  dispatchTime: string;
}

export type LogisticsStatus = 'Pending Pickup' | 'OK Pickup' | 'Pending Delivery' | 'OK Delivery';

export type StockMovementType = 'PURCHASE' | 'SALE' | 'RETURN' | 'DAMAGE' | 'SCRAP' | 'INWARD' | 'OUTWARD';

export interface StockMovement {
  id: string;
  date: string;
  type: StockMovementType;
  quantity: number;
  notes: string;
  performedBy: string;
  referenceId?: string;
  customerName?: string;
}

// HRMS TYPES
// Loosened to a plain string (rather than a strict union) so an Admin can
// assign a "Custom Role" free-text value that isn't one of the presets in
// src/lib/permissions.ts's PRESET_ROLES — permission defaults simply fall
// back to a conservative baseline for any role name outside that list.
export type UserRole = string;

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave' | 'Checked In' | 'Checked Out';
export type EmploymentType = 'Full Time' | 'Part Time' | 'Contract' | 'Temporary';
export type EmployeeStatus = 'Active' | 'Inactive' | 'Suspended' | 'Resigned' | 'Terminated';

// Per-module, per-action ERP access grid — see src/lib/permissions.ts for the
// module list, role defaults, and helpers. Kept here (not there) since
// Employee-adjacent types reference it and permissions.ts imports from here.
// Six generic actions cover every module uniformly; module-specific
// sub-actions (e.g. "Assign Technician", "Apply GST") are a documented,
// deliberately-deferred extension — see the migration notes.
export interface ModuleActionPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
  export: boolean;
}
export type ModulePermissions = Record<string, ModuleActionPermissions>;

// Permissions, login credentials, and documents are NOT embedded in the
// Employee object at rest (they live in their own tables — see
// sql/schema.sql's employee_permissions/employee_credentials/
// employee_documents) so that a hashed password or a KYC file can never leak
// through the general employee list/bootstrap response. The client still
// carries them as optional fields on this type when explicitly fetched via
// their own dedicated endpoints (GET .../permissions, .../login-access,
// .../documents) for editing in the Associate modal.
export interface EmployeeLoginAccess {
  username?: string;
  loginEmail?: string;
  loginEnabled: boolean;
  forcePasswordChange: boolean;
  lastLoginAt?: string | null;
  lastLoginDevice?: string | null;
  lastLoginIp?: string | null;
  createdAt?: string;
}

export type KycVerificationStatus = 'Pending' | 'Verified' | 'Rejected';
export type KycDocumentType = 'Aadhaar Card' | 'PAN Card' | 'Address Proof' | 'Bank Proof' | 'Photo' | 'Other ID' | 'Other Document';

export interface EmployeeDocument {
  id: string;
  documentType: KycDocumentType;
  fileData: string; // base64 data URL — same storage pattern as existing KYC images
  uploadedAt: string;
  uploadedBy: string;
  verificationStatus: KycVerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  notes?: string;
  // Populated only when verificationStatus is 'Rejected' — shown to whoever
  // manages this associate's KYC so they know what to fix and re-upload.
  rejectionReason?: string | null;
}

export type AuditEventType =
  | 'employee_created' | 'employee_edited' | 'password_reset' | 'login' | 'logout'
  | 'account_blocked' | 'account_unblocked' | 'permission_changed'
  | 'kyc_uploaded' | 'kyc_verified' | 'kyc_rejected' | 'kyc_deleted'
  | 'employee_suspended' | 'employee_activated' | 'employee_terminated' | 'employee_disabled';

export interface EmployeeAuditLogEntry {
  id: string;
  eventType: AuditEventType;
  employeeId: string;
  performedBy: string;
  timestamp: string;
  recordId?: string | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  details?: string | null; // short, non-sensitive summary only — never passwords/KYC values
}

export interface Employee {
  id: string;
  employeeId: string;
  photo?: string;
  qrCode?: string;
  name: string;
  mobile: string;
  email: string;
  designation: string;
  department: string;
  salary: number;
  salaryType?: string;
  employmentType?: EmploymentType;
  joiningDate: string;
  status: EmployeeStatus;
  role: UserRole;
  createdAt: string;
  emergencyContactName?: string;
  emergencyContactMobile?: string;
  dateOfBirth?: string;
  gender?: string;
  // Fetched/saved via GET|PUT /api/erp/employees/:id/permissions — never part
  // of the generic employee list payload.
  modulePermissions?: ModulePermissions;
  // Fetched/saved via GET .../login-access and POST .../reset-password — the
  // password itself never appears anywhere in this object or any response.
  loginAccess?: EmployeeLoginAccess;
  // KYC Fields (existing — unchanged, still a single slot per type)
  aadharNumber?: string;
  panNumber?: string;
  otherIdType?: string;
  otherIdNumber?: string;
  addressProofType?: string;
  addressProofNumber?: string;
  currentAddress?: string;
  permanentAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadharFront?: string;
  aadharBack?: string;
  panCard?: string;
  addressProof?: string;
  // Bank details (new)
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
  // Fetched via GET .../documents — the new, richer document vault alongside
  // the existing single-slot KYC image fields above (which stay untouched).
  documents?: EmployeeDocument[];
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  mobile: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workHours: string;
  overtime: string;
  latitude?: string;
  longitude?: string;
  address?: string;
  selfieCheckIn?: string;
  selfieCheckOut?: string;
  status: AttendanceStatus;
  createdAt: string;
  deviceInfo?: string;
  browserInfo?: string;
  ipAddress?: string;
  attendanceType?: 'Manual' | 'QR' | 'WhatsAppLink';
}

export interface AttendanceLink {
  id: string;
  token: string;
  employeeId: string;
  employeeName: string;
  mobile: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  year: string;
  baseSalary: number;
  attendanceDays: number;
  overtimeHours: number;
  bonus: number;
  deductions: number;
  netPayable: number;
  paymentStatus: 'Pending' | 'Paid';
  processedDate: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  type: 'Sick' | 'Casual' | 'Emergency' | 'Paid';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

// SAAS & COUPON TYPES
export type CouponDiscountType = 'Percentage' | 'Fixed Amount';

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  applicablePlans: string[]; // ["3 Months", "6 Months", "12 Months", "All Plans"]
  startAt: string;
  expiresAt: string;
  maxUses: number;
  perCustomerLimit: number;
  usedCount: number;
  active: boolean;
  allowedEmail?: string;
  allowedMobile?: string;
  allowedCompanyId?: string;
  minimumOrderAmount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CouponRedemption {
  id: string;
  couponCode: string;
  userId: string;
  companyId: string;
  email: string;
  mobile: string;
  planName: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  redeemedAt: string;
  status: string;
}

export interface Subscription {
  id: string;
  userId: string;
  companyId: string;
  planName: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  couponCode?: string;
  paymentMethod: string; // "Razorpay" | "Coupon" | "Free Trial"
  paymentStatus: string; // "Paid" | "Fully Discounted"
  startDate: string;
  expiryDate: string;
  active: boolean;
  createdAt: string;
}

export interface RazorpayPayment {
  id: string;
  orderId: string;
  paymentId?: string;
  signature?: string;
  amount: number;
  currency: string;
  status: 'Pending' | 'Captured' | 'Failed' | 'Refunded';
  userId: string;
  companyId: string;
  planId: string;
  createdAt: string;
}

export interface EmployeeTask {
  id: string;
  title: string;
  description: string;
  customerName: string;
  customerMobile: string;
  address: string;
  category: string;
  assignedToId: string;
  assignedToName: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  dueDate: string;
  createdAt: string;
  completedAt?: string;
}

export type TaskStatus = EmployeeTask['status'];
export type TaskPriority = EmployeeTask['priority'];

// SYSTEM SETTINGS
export interface SystemSettings {
  gstEnabled: boolean;
  gstRate: number;
  whatsappNotifications: boolean;
  emailNotifications: boolean;
  customerNotifications: boolean;
  repairNotifications: boolean;
  salesNotifications: boolean;
  invoiceNotifications: boolean;
  deliveryNotifications: boolean;
  warrantyNotifications: boolean;
  soundNotifications: boolean;
  autoNotifications: boolean;
  autoBackup: boolean;
  smsNotifications: boolean;
  deletePassword: string;
  invoicePrefix: string;
  customerIdPrefix: string;
  defaultWarrantyDuration: string;
  defaultPickupRequired: boolean;
  defaultMinStockLevel: number;
  defaultPaymentMode: string;
  defaultDueDays: number;
  warrantyExpiringSoonDays: number;
  standardCheckInTime: string;
  lateThresholdMinutes: number;
}

export interface BackupMeta {
  lastBackupAt: string;
  status: 'success' | 'failed';
  recordCounts: Record<string, number>;
}

// SALES MODULE — a separate module from Repairing/Billing. Sales orders,
// invoices, and deliveries live in their own collections so nothing here
// can ever touch Repairing data or the existing Billing/Invoice History flow.
export type SalesPaymentStatus = 'Paid' | 'Unpaid' | 'Partial';
export type SalesOrderStatus = 'New' | 'Processing' | 'Completed' | 'Cancelled';
export type SalesDeliveryStatus = 'Not Required' | 'Pending Pickup' | 'Picked Up' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Failed Delivery';

export interface SalesOrder {
  id: string;
  customerId: string;
  customerName: string;
  mobile: string;
  email?: string;
  address?: string;
  pincode?: string;
  productId?: string;
  brand: string;
  model: string;
  screenSize?: string;
  serialNumber?: string;
  quantity: number;
  unitPrice: number;
  saleDate: string;
  salesperson?: string;
  storeLocation?: string;
  paymentMethod: string;
  paymentStatus: SalesPaymentStatus;
  deliveryRequired: boolean;
  deliveryStatus: SalesDeliveryStatus;
  subtotal: number;
  discount: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmount: number;
  deliveryCharge: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  orderStatus: SalesOrderStatus;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  invoiceDate: string;
  customerName: string;
  mobile: string;
  amount: number;
  gstAmount: number;
  paymentStatus: SalesPaymentStatus;
  createdAt: string;
}

export interface SalesDelivery {
  id: string;
  orderId: string;
  runnerName?: string;
  customerName: string;
  mobile: string;
  address?: string;
  product: string;
  deliveryDate?: string;
  deliveryStatus: SalesDeliveryStatus;
  paymentStatus: SalesPaymentStatus;
  createdAt: string;
  updatedAt: string;
}

// REPAIR MODULE — new module, fully separate from Repairing (RepairCall/RepairStatus above).
export type RepairJobStatus =
  | 'Received' | 'Inspection' | 'Estimate Sent' | 'Approved' | 'In Progress'
  | 'Waiting for Parts' | 'Ready' | 'Delivered' | 'Cancelled';

export interface RepairJobPart {
  id: string;
  partName: string;
  partId: string;
  qty: number;
  purchaseCost: number;
  sellingPrice: number;
  total: number;
  notes?: string;
}

export type RepairJobPaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';

export interface RepairJobPayment {
  id: string;
  date: string;
  amount: number;
  method: RepairJobPaymentMethod;
  notes?: string;
}

export interface RepairJobNote {
  id: string;
  date: string;
  text: string;
}

export interface RepairStatusHistoryEntry {
  id: string;
  status: RepairJobStatus;
  changedAt: string;
  note?: string;
}

export type RepairNotificationTrigger =
  | 'Repair Received' | 'Estimate Approved' | 'In Progress' | 'Ready for Delivery'
  | 'Completed' | 'Payment Pending';

export interface RepairJobNotification {
  id: string;
  trigger: RepairNotificationTrigger;
  message: string;
  sentAt: string | null;
}

export interface RepairJob {
  id: string; // 'RJ' prefix, e.g. RJ1001
  customerName: string;
  mobile: string;
  email?: string;
  address?: string;
  customerId?: string;
  pincode?: string;
  techTags?: string[];
  photos?: string[];
  storeLocation?: string;
  warrantyDuration?: string;
  warrantyExpiry?: string;
  productType: string;
  brand: string;
  model: string;
  serialNumber?: string;
  productSize?: string;
  problemDescription: string;
  customerNotes?: string;
  technicianId?: string;
  technicianName?: string;
  receivedDate: string;
  expectedDeliveryDate?: string;
  estimatedCost: number;
  advancePayment: number;
  status: RepairJobStatus;
  parts: RepairJobPart[];
  labourCharges: number;
  otherCharges: number;
  discount: number;
  payments: RepairJobPayment[];
  notesLog: RepairJobNote[];
  statusHistory: RepairStatusHistoryEntry[];
  notifications: RepairJobNotification[];
  createdAt: string;
  updatedAt: string;
}
