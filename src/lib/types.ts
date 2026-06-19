
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
}

export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Partial';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Credit';

export interface InvoiceItem {
  id: string;
  name: string;
  brand?: string;
  size?: string;
  hsnCode?: string;
  quantity: number;
  rate: number;
  gstPercent: number;
  discount: number;
  amount: number;
  purchasePrice: number; // For Profit calc
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  jobId?: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  customerGSTIN?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  paymentStatus: InvoiceStatus;
  paymentMode: PaymentMode;
  terms: string;
  warranty: string;
  timestamp: string;
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
  gstPercent?: number;
  hsnCode?: string;
  size?: string;
  history: any[];
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
}

export interface VisibilitySettings {
  tabs: Record<string, boolean>;
  kpis: Record<string, boolean>;
}

export interface Employee {
  id: string;
  name: string;
  mobile: string;
  pin: string;
  salary: number;
  status: string;
  designation: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockInTime: string;
  clockOutTime: string | null;
  status: string;
}

export interface TransportationLog {
  id: string;
  runnerName: string;
  jobId: string;
  customerName: string;
  status: string;
  dispatchTime: string;
}
