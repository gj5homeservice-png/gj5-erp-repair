export type RepairStatus = 'Pending' | 'Completed' | 'Rejected' | 'Exchange' | 'Purchase';

export interface VisitHistoryEntry {
  id: string;
  date: string;
  time: string;
  complaintDescription: string;
  technicianNotes: string;
  status: RepairStatus;
  resolutionNotes?: string;
}

export interface RepairCall {
  id: string; // Job ID e.g. TV1001
  customerId: string; // GJ51001
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
  // Old Entry Mode Fields
  isOldEntry?: boolean;
  entryDate?: string;
  receivedDate?: string;
}

export type InquiryStatus = 'New' | 'Pending' | 'Follow-up' | 'Converted' | 'Rejected';
export type InquiryPriority = 'Low' | 'Medium' | 'High';
export type InquirySource = 'Walk-In' | 'Call' | 'WhatsApp' | 'Facebook' | 'Instagram' | 'Referral';

export interface Inquiry {
  id: string;
  customerName: string;
  mobile: string;
  alternateMobile?: string;
  address: string;
  city?: string;
  pincode?: string;
  productType: string;
  brand: string;
  modelNumber?: string;
  problemDescription: string;
  source: InquirySource;
  priority: InquiryPriority;
  expectedBudget?: number;
  assignedTechnician?: string;
  followUpDate: string;
  status: InquiryStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  conversionDate?: string;
  convertedJobId?: string;
}

export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  name: string;
  role: string;
  designation: string;
  mobile: string;
  address: string;
  salary: number;
  dailyWage: number;
  joiningDate: string;
  pin: string;
  photo?: string;
  status: EmployeeStatus;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Half Day' | 'Absent';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockInTime: string;
  clockInPhoto: string | null;
  clockOutTime: string | null;
  clockOutPhoto: string | null;
  totalHours: number;
  status: AttendanceStatus;
  location?: { lat: number; lng: number };
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  customCategory?: string;
  quantity?: string;
  vendorName?: string;
  billNumber?: string;
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  date: string;
  notes?: string;
  timestamp: string;
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'INWARD' | 'OUTWARD';
  quantity: number;
  referenceId?: string; // Job ID or Invoice ID
  customerName?: string;
  notes?: string;
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
  images: string[]; // base64 strings
  lastUpdated: string;
  history: StockMovement[];
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number; // For P&L calc
  total: number;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  date: string;
  time: string;
  type: 'TOPUP' | 'EXPENSE' | 'MANUAL_CREDIT' | 'MANUAL_DEBIT' | 'REVENUE';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  userId: string;
  description: string;
  metadata?: {
    expenseId?: string;
    invoiceId?: string;
    category?: string;
    vendorName?: string;
  };
}

export type LogisticsStatus = 'Pending Pickup' | 'OK Pickup' | 'Pending Delivery' | 'OK Delivery';

export interface TransportationLog {
  id: string;
  runnerName: string;
  runnerMobile: string;
  jobId: string;
  customerName: string;
  customerMobile: string;
  address: string;
  dispatchTime: string;
  status: LogisticsStatus;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  jobId: string;
  customerId: string;
  customerName: string;
  mobile: string;
  address: string;
  brand: string;
  model: string;
  items: InvoiceItem[];
  labourCharges: number;
  deliveryCharge: number;
  additionalCharges: number;
  discount: number;
  taxEnabled: boolean;
  subtotal: number;
  gst: number;
  total: number;
  profit: number; // Net profit on this invoice
  paymentStatus: 'Paid' | 'Pending' | 'Partially Paid';
  timestamp: string;
}

export interface AuditLog {
  id: string;
  jobId: string;
  deletedBy: string;
  dateTime: string;
  action: string;
}

export interface VisibilitySettings {
  tabs: {
    Repairing: boolean;
    'CRM Leads': boolean;
    Billing: boolean;
    'Invoice History': boolean;
    Stock: boolean;
    Analytics: boolean;
    Employees: boolean;
    'E-Wallet': boolean;
    Transportation: boolean;
  };
  kpis: {
    totalActive: boolean;
    pending: boolean;
    completed: boolean;
    repeat: boolean;
    rejected: boolean;
    exchange: boolean;
    warranty: boolean;
  };
}
