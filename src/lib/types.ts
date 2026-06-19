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
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Credit';
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
  history: any[];
  supplierName?: string;
  supplierMobile?: string;
  purchaseDate?: string;
  warrantyPeriod?: string;
  description?: string;
  addedBy?: string;
  editedBy?: string;
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