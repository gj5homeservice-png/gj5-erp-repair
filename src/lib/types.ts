
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
export type UserRole = 'Admin' | 'Manager' | 'Employee';
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave' | 'Checked In' | 'Checked Out';

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
  joiningDate: string;
  status: 'Active' | 'Inactive';
  role: UserRole;
  createdAt: string;
  // KYC Fields
  aadharNumber?: string;
  panNumber?: string;
  addressProofType?: string;
  currentAddress?: string;
  permanentAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadharFront?: string;
  aadharBack?: string;
  panCard?: string;
  addressProof?: string;
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
