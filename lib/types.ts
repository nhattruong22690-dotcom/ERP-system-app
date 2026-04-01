// ============================================================
// USERS & AUTH
// ============================================================
export type UserRole = 'admin' | 'director' | 'manager' | 'accountant' | 'staff'

export interface RoleDefinition {
  name: string
  rank: number
  description?: string
}

export interface User {
  id: string
  username: string
  displayName: string
  password: string
  email?: string
  avatarUrl?: string
  role: UserRole
  allowedPages?: string[]
  permissions?: string[]
  branchId?: string   // null/undefined = toàn chuỗi
  viewAllBranches?: boolean // true = xem toàn bộ chi nhánh
  title?: string      // Text tự do (Sắp bỏ dần)
  jobTitleId?: string // Link đến Bảng Chức vụ Động
  departmentType?: DepartmentType
  workStatus?: 'working' | 'on_leave' | 'resigned'
  hasAttendance?: boolean
  isActive?: boolean
  lastSeenAt?: string
  isOnline?: boolean
  salaryConfig?: SalaryConfig
  createdAt: string
}

export interface Allowance {
  name: string
  amount: number
}

export interface SalaryConfig {
  type: 'working_days' | 'fixed'
  standardDays: number
  baseSalary: number
  allowances: Allowance[]
  revenueRate?: number // % doanh số thưởng cho Quản lý (vd: 0.02 = 2%)
}

export interface SalaryHistory {
  id: string
  userId: string
  changedBy?: string
  oldConfig?: SalaryConfig
  newConfig?: SalaryConfig
  changeReason?: string
  createdAt: string
}

export interface Bonus {
  id: string
  userId: string
  branchId?: string
  type: 'kpi' | 'revenue_share'
  amount: number
  date?: string   // YYYY-MM-DD
  period: string  // 'YYYY-MM'
  note?: string
  createdBy?: string
  createdAt: string
}

export interface Deduction {
  id: string
  userId: string
  type: 'violation' | 'other'
  amount: number
  date?: string
  period: string
  note?: string
  createdBy?: string
  createdAt: string
}

export interface SalaryAdvance {
  id: string
  userId: string
  amount: number
  date?: string
  period: string
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  note?: string
  approvedBy?: string
  approvedAt?: string // NEW: auditing
  paidBy?: string     // NEW: auditing
  paidAt?: string     // NEW: auditing
  paidNote?: string   // NEW: auditing
  createdBy?: string  // nếu null = do nhân viên tự gửi
  createdAt: string
}

export interface PayrollRoster {
  id: string
  period: string  // 'YYYY-MM'
  userId: string
  createdBy?: string
  createdAt: string
}

// ============================================================
// MESSAGING & PRESENCE
// ============================================================
export interface Message {
  id: string
  senderId: string
  receiverId: string
  message: string
  isRead: boolean
  readAt?: string
  createdAt: string
}

export interface PresenceState {
  userId: string
  onlineAt: string
}

// ============================================================
// JOB TITLES (Chức vụ Động)
// ============================================================
export type DepartmentType = 'admin' | 'hq' | 'spa' | 'sale' | 'mkt'

export interface JobTitle {
  id: string
  name: string
  departmentType: DepartmentType
  defaultRole: UserRole
  icon?: string       // Lucide icon name
  color?: string      // Tailwind color class or Hex
  hasAttendance?: boolean // Yêu cầu chấm công
  allowedPages?: string[]
  permissions?: string[]
  createdAt: string
}

// ============================================================
// BRANCHES
// ============================================================
export type BranchType = 'hq' | 'spa' | 'sale' | 'mkt'

export interface Branch {
  id: string
  name: string
  code: string
  type?: BranchType
  isHeadquarter?: boolean // Deprecated
  icon?: string           // Lucide icon name
  color?: string          // Tailwind color class or Hex
  createdAt: string
}

// ============================================================
// PAYMENT ACCOUNTS
// ============================================================
export type AccountType = 'bank' | 'cash' | 'pos'

export interface PaymentAccount {
  id: string
  name: string
  type: AccountType
  bankName?: string
  accountNumber?: string
  accountHolder?: string
  branchId?: string   // undefined = dùng chung
  initialBalance?: number // Số dư ban đầu
  createdAt: string
}

// ============================================================
// CATEGORIES
// ============================================================
export type CategorySection = 'revenue' | 'fixed_cost' | 'variable_cost' | 'fund'

export interface Category {
  id: string
  name: string
  section: CategorySection
  defaultRate?: number    // % DT mặc định (vd: 0.24 = 24%)
  isRateBased: boolean    // true = tính theo % DT
  sortOrder: number
  isHidden?: boolean      // true = ẩn khỏi UI nhưng giữ nguyên lịch sử giao dịch
  createdAt: string
}

// ============================================================
// MONTHLY PLAN
// ============================================================
export interface CategoryPlan {
  categoryId: string
  rate?: number           // % DT (editable, ghi đè defaultRate)
  fixedAmount?: number    // hoặc nhập tay
  plannedAmount: number   // auto-calculated
  alertThreshold: number  // % để cảnh báo (mặc định 0.8 = 80%)
  disabled: boolean       // bỏ qua danh mục này
}

export interface MonthlyPlan {
  id: string
  branchId: string
  year: number
  month: number           // 1-12
  kpiRevenue: number
  taxRate: number         // % thuế (vd: 0.2 hoặc 0.07)
  categoryPlans: CategoryPlan[]
  createdAt: string
  updatedAt: string
}

// ============================================================
// TRANSACTIONS
// ============================================================
export type TransactionType = 'income' | 'expense' | 'transfer'


export interface Transaction {
  id: string
  branchId: string          // Chi nhánh thụ hưởng (chịu chi phí hoặc nhận doanh thu)
  date: string              // ISO date string
  type: TransactionType
  categoryId?: string
  amount: number
  paymentAccountId: string
  toPaymentAccountId?: string // Tài khoản thụ hưởng (chỉ dùng cho loại 'transfer')
  paidByBranchId?: string   // Nếu VP chi hộ → paidBy=HQ branchId, branchId=chi nhánh thụ hưởng
  note?: string
  createdBy: string         // userId
  createdAt: string
  updatedBy?: string        // userId người sửa cuối
  updatedAt: string
  status?: 'locked' | 'open' // trạng thái khóa
  isDebt?: boolean          // Ghi nợ / Trả nợ (từ cá nhân vào cty)
  serviceOrderId?: string   // NEW: Liên kết với phiếu dịch vụ (nếu có)
}

// ============================================================
// CRM: CUSTOMERS & APPOINTMENTS (LUXURY SPA STANDARD)
// ============================================================
export enum CustomerRank {
  DIAMOND = 'Kim Cương',
  PLATINUM = 'Bạch Kim',
  GOLD = 'Vàng',
  SILVER = 'Bạc',
  BRONZE = 'Đồng',
  MEMBER = 'Thành viên'
}

export interface TreatmentCard {
  id: string
  name: string
  type: 'retail' | 'package' | 'warranty'
  total: number
  used: number
  remaining: number
  expiryDate?: string
  warrantyExpiryDate?: string
  status: 'active' | 'expired' | 'completed'
  purchaseDate: string
  createdAt: string
}

export interface Customer {
  id: string
  fullName: string
  avatar?: string
  phone: string
  phone2?: string
  email?: string
  gender?: 'nam' | 'nu' | 'khac'
  facebook?: string
  zalo?: string
  address?: string
  birthday?: string
  rank: CustomerRank
  points: number
  totalSpent: number
  lastVisit: string
  branchId?: string
  medicalNotes?: string
  professionalNotes?: string;
  isVip?: boolean;
  walletBalance?: number; // Số dư thẻ tiền nạp
  treatmentCards?: TreatmentCard[]
  createdAt: string
  updatedAt: string
}

export type AppointmentStatus = 'pending' | 'arrived' | 'cancelled' | 'no_show' | 'completed' | 'confirmed'

export interface AppointmentLog {
  id: string
  userId: string
  userDisplayName: string
  action: string // 'created' | 'status_changed' | 'note_added' | 'professional_note_added' | 'assigned_staff'
  details: string
  oldStatus?: AppointmentStatus
  newStatus?: AppointmentStatus
  createdAt: string
}

export interface Appointment {
  id: string
  customerId: string
  branchId?: string
  staffId?: string
  appointmentDate: string // ISO Date
  appointmentTime?: string // HH:mm (Start)
  endTime?: string // HH:mm
  status: AppointmentStatus
  type?: 'new' | 'revisit' | 'warranty' | 'walk-in' | 'returning'
  price?: number
  notes?: string
  logs?: AppointmentLog[]
  redFlags?: RedFlag[]
  serviceEntries?: ServiceEntry[]
  customerName?: string // Joined from crm_customers
  customerPhone?: string // Joined from crm_customers
  customerAvatar?: string // Joined
  customerRank?: CustomerRank // Joined
  customerRedFlags?: RedFlag[] // Joined
  saleTeleId?: string // Sale chốt lịch
  saleTeleName?: string // NEW: record string name
  salePageId?: string  // NEW: record Sale Page source
  salePageName?: string // NEW: record string name
  leadId?: string     // Nguồn từ Lead
  bookingSource?: 'lead' | 'tele' | 'branch' // NEW: Phân loại nguồn lịch
  createdAt: string
  updatedAt: string
  saleTeleBonus?: number    // NEW: Tiền thưởng tạm tính cho Tele
  salePageBonus?: number    // NEW: Tiền thưởng tạm tính cho Page
  kpiConfig?: {             // NEW: Lưu vết cấu hình KPI lúc đặt lịch
    bookingBonus: number
    checkinNoServiceBonus: number
    checkinServiceBonus: number
    serviceCommissionRate: number
  }
  kpiConfirmed?: boolean
  kpiExclusionNote?: string
  kpiExcludedBy?: string
  kpiExcludedAt?: string
}

export interface RedFlag {
  id: string
  type: 'medical' | 'complaint' | 'vip' | 'other'
  content: string
  createdBy?: string
  createdAt: string
}

export interface ServiceEntry {
  id: string
  serviceId: string
  serviceName: string
  price: number
  quantity: number
  staffId?: string
  staffName?: string
  createdAt: string
}

export interface GlobalNotification {
  id: string
  content: string
  type: 'info' | 'warning' | 'event'
  priority: number
  isActive: boolean
  showOnLogin: boolean
  showOnDay: boolean
  showInterval: boolean
  lastTriggeredAt?: string
  expiresAt?: string
  createdAt: string
  // New fields for transaction alerts and styling
  isTransactionAlert?: boolean
  minAmount?: number
  bgColor?: string
  textColor?: string
  highlightColor?: string
  metadata?: any // For storing dynamic data like {amount}, {branch}
  triggerAt?: string // For scheduled countdowns
}

export interface UserNotificationStatus {
  userId: string
  notificationId: string
  isSeen: boolean
  lastShownAt: string
  showCount: number
}

export interface CrmService {
  id: string
  name: string
  category: string
  categoryId?: string
  price: number
  duration: number
  type: 'single' | 'package' | 'card' // NEW: Loại dịch vụ
  isActive: boolean
  image?: string
  createdAt: string
}

export interface ServiceCategory {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
}


export interface LoyaltySettings {
  id: string
  pointsPerVnd: number // e.g. 0.00001 (1 point for every 100,000 VND)
  vndPerPoint: number  // e.g. 1000 (1 point = 1,000 VND for redemption)
  isActive: boolean
  updatedAt: string
}

export interface MembershipTier {
  id: string
  name: string
  subtext?: string
  minSpend: number
  maxSpend: number
  discount: number
  icon?: string
  theme?: string
  createdAt: string
}

// ============================================================
// COMMISSIONS & MISSIONS
// ============================================================

export interface KpiTier {
  minKpi: number
  maxKpi: number | null
  bonusNoPayment: number  // Thường là dành cho Check-in không PS
  bonusWithPayment: number // Dành cho Sale Page (SĐT) hoặc Sale Tele (Check-in có PS)
  bonusBooking: number     // NEW: Thưởng đặt lịch (Sale Tele)
  bonusService: number     // NEW: Thưởng khách đến phát sinh (Sale Tele)
  bonusAmount: number      // NEW: Thưởng cứng cả mốc
  commissionRate: number   // percent, e.g. 1 for 1%
}

export interface CommissionSetting {
  id: string
  name: string
  ruleCode: string      // Slug for Dev/Internal
  action: string        // Trigger: e.g., 'lead_phone', 'appointment_arrived', 'appointment_completed'
  type: 'fixed' | 'tiered' | 'kpi' | 'percentage' | 'kpi_tiered'
  amount: number        // For fixed/kpi/percentage
  tiers?: Tier[]        // For tiered
  kpiTiers?: KpiTier[]  // For kpi_tiered
  condition?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}


export interface Tier {
  min: number
  max: number | null
  amount: number
}

export interface LeadCareLog {
  id: string
  userId: string
  userName: string
  type: 'call' | 'message' | 'meeting' | 'other'
  result: string // Chuyển sang string để hỗ trợ danh sách động
  content?: string
  createdAt: string
}

export interface Lead {
  id: string
  salePageId?: string
  salePageStaffId?: string // New: Align with DB
  saleTeleStaffId?: string // New: Align with DB
  name: string
  phone?: string // Giờ đã là optional
  phoneObtainedAt?: string // Thời điểm lấy được SĐT (để tính nóng/lạnh)
  source: string
  socialLink?: string // New
  status: 'new' | 'new_created' | 'contacted' | 'booked' | 'failed' | 'spam_data' | 'low_quality_mess' | 'no_reach_mess' | 'in_care' | 'recare' | 'pending' | 'confirmed' | 'arrived' | 'completed' | 'cancelled' | 'no_show'
  lifecycleStatus?: string // New
  pageEvaluation?: string // New
  isAppointmentSet?: boolean // New
  isCheckedIn?: boolean // New
  totalServiceValue?: number // New
  notes?: string
  careLogs?: LeadCareLog[]
  customerId?: string
  branchId?: string // Gán chi nhánh cho Lead
  createdAt: string
  updatedAt?: string
  isLocked?: boolean      // NEW: Khóa Lead khi đã bàn giao chi nhánh
  phoneConfirmed?: boolean // NEW: Đã xác thực SĐT gọi được
  confirmedBy?: string     // NEW: StaffId người xác thực số
  confirmedAt?: string     // NEW: Thời điểm xác thực số
  actualServiceValue?: number // NEW: Giá trị thực tế phát sinh tại CN
  serviceNote?: string     // NEW: Ghi chú các dịch vụ đã làm
  kpiConfirmed?: boolean
  kpiExclusionNote?: string
  kpiExcludedBy?: string
  kpiExcludedAt?: string
}

export interface CommissionLog {
  id: string
  userId: string
  amount: number
  type: string
  status: 'pending' | 'approved' | 'cancelled' | 'paid'
  appointmentId?: string
  leadId?: string
  invoiceId?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface UserMission {
  id: string
  userId: string
  cycle: 'daily' | 'weekly' | 'monthly'
  metricType: 'booking_count' | 'revenue_total' | 'lead_count'
  targetValue: number
  currentValue: number // Add this
  rewardAmount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// ATTENDANCE (Chấm công)
// ============================================================
export interface Attendance {
  id: string
  userId: string
  branchId: string
  date: string        // YYYY-MM-DD
  status: 'present' | 'on_leave' | 'absent' | 'half_leave'
  checkIn?: string    // HH:mm
  checkOut?: string   // HH:mm
  note?: string
  createdAt: string
  updatedAt: string
}

// ============================================================
// SERVICE ORDERS (Phiếu Dịch Vụ)
// ============================================================
export interface ServicePayment {
  id: string
  method: 'cash' | 'bank' | 'pos' | 'wallet'
  amount: number
  date: string
  note?: string
  transactionId?: string
  lineItemId?: string               // NEW: Link to specific service line item
}

export interface ServiceOrder {
  id: string
  code: string                    // Mã phiếu: SO-YYMMDD-XXX
  customerId: string
  branchId: string
  appointmentId?: string          // Liên kết lịch hẹn → lấy leadId, salePageId, saleTeleId
  lineItems: ServiceLineItem[]
  totalAmount: number
  actualAmount?: number
  debtAmount?: number
  payments?: ServicePayment[]     // NEW: Danh sách lịch sử thanh toán
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled'
  customerName?: string           // Joined from crm_customers
  customerPhone?: string          // Joined from crm_customers
  customerAvatar?: string         // Joined
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ServiceLineItem {
  id: string
  customerType: 'new' | 'old' | 'tvt' // Mới (chưa từng làm DV tại CN) | Cũ | TVT (dòng tiếp theo)
  serviceId?: string
  categoryId?: string            // NEW: ID danh mục
  categoryName?: string          // NEW: Tên danh mục (de-normalized)
  serviceName: string
  serviceType: 'single' | 'package' | 'card'
  description?: string
  price: number
  cardWalletValue?: number        // Giá trị ví (khi type = 'card')
  packageType?: 'sessions' | 'duration' | 'warranty'
  totalSessions?: number
  expiryDate?: string
  warrantyExpiryDate?: string
  note?: string
  payments?: ServicePayment[]      // NEW: Payments for this specific line item
  staffSplits: StaffSplit[]
}

export interface StaffSplit {
  staffId: string
  staffName: string
  amount: number
  role?: string                 // Vai trò (Tư vấn, Kỹ thuật, Bác sĩ...)
  type?: 'fixed' | 'percentage' // Hỗ trợ tính theo số tiền hoặc %
  rate?: number                 // % hoa hồng (nếu type = 'percentage')
}

// ============================================================
// SYSTEM CONFIGURATION
// ============================================================
export interface SystemConfig {
  id: string
  fontFamily: string
  fontSizeScale: number // Percentage, e.g. 100
  theme: 'light' | 'dark' | 'luxury-gold'
  updatedAt: string
}

// ============================================================
// CASHFLOW SNAPSHOTS
// ============================================================
export interface CashflowSnapshot {
  id: string
  year: number
  month: number
  branchId: string // "ALL" hoặc một branch_id
  data: any // JSON Data { rows: CashFlowRow[] }
  createdAt: string
  updatedAt: string
}

// ============================================================
// APP STATE
// ============================================================
export interface AppState {
  users: User[]
  branches: Branch[]
  accounts: PaymentAccount[]
  categories: Category[]
  plans: MonthlyPlan[]
  transactions: Transaction[]
  customers: Customer[]
  appointments: Appointment[]
  services: CrmService[] // Kept CrmService as ServiceItem was not defined
  serviceCategories: ServiceCategory[]
  membershipTiers: MembershipTier[]
  treatmentCards: TreatmentCard[]
  commissionSettings: CommissionSetting[]
  leads: Lead[]
  commissionLogs: CommissionLog[]
  userMissions: UserMission[]
  jobTitles: JobTitle[]
  attendance: Attendance[]
  salaryHistory: SalaryHistory[]
  bonuses: Bonus[]
  deductions: Deduction[]
  salaryAdvances: SalaryAdvance[]
  payrollRosters: PayrollRoster[]
  serviceOrders: ServiceOrder[]
  systemConfig?: SystemConfig
  loyaltySettings?: LoyaltySettings
  cashflowSnapshots?: CashflowSnapshot[]
  currentUserId?: string
  dismissedAlerts: string[]
  starredAlerts: string[]
  activityLogs: ActivityLog[]
  customerStats?: {
    total: number
    vip: number
    birthdays: number
  }
}

// ============================================================
// ACTIVITY LOGS
// ============================================================
export interface ActivityLog {
  id: string
  userId?: string
  type: string      // Flexible for now
  entityType?: string
  entityId?: string
  user?: string      // Display name
  details: string
  createdAt: string
}

// ============================================================
// COMPUTED / DISPLAY TYPES
// ============================================================
export interface CashFlowRow {
  categoryId: string
  categoryName: string
  section: CategorySection
  planned: number
  actual: number
  delta: number
  remaining: number
  isNegativeStatus: boolean
  pct: number               // actual / planned * 100
  alertThreshold: number
  status: 'ok' | 'warning' | 'exceeded'
  disabled: boolean
}

export interface AlertItem {
  categoryId: string
  categoryName: string
  branchName: string
  branchId: string
  month: number
  year: number
  planned: number
  actual: number
  pct: number
  status: 'ok' | 'warning' | 'exceeded'
}
// ============================================================
// SHARED UI CONSTANTS
// ============================================================
export const COLOR_MAP: Record<string, { hex: string, classes: string }> = {
  indigo: { hex: '#4f46e5', classes: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  rose: { hex: '#e11d48', classes: 'text-rose-600 bg-rose-50 border-rose-200' },
  amber: { hex: '#d97706', classes: 'text-amber-600 bg-amber-50 border-amber-200' },
  emerald: { hex: '#059669', classes: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  cyan: { hex: '#0891b2', classes: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  fuchsia: { hex: '#c026d3', classes: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200' },
  violet: { hex: '#7c3aed', classes: 'text-violet-600 bg-violet-50 border-violet-200' },
  sky: { hex: '#0284c7', classes: 'text-sky-600 bg-sky-50 border-sky-200' },
  orange: { hex: '#ea580c', classes: 'text-orange-600 bg-orange-50 border-orange-200' },
  pink: { hex: '#db2777', classes: 'text-pink-600 bg-pink-50 border-pink-200' },
  slate: { hex: '#475569', classes: 'text-slate-600 bg-slate-50 border-slate-200' },
}

export const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Admin', color: '#7c3aed' },
  { value: 'director', label: 'Giám đốc', color: '#0891b2' },
  { value: 'manager', label: 'Quản lý', color: '#0284c7' },
  { value: 'accountant', label: 'Kế toán', color: '#059669' },
  { value: 'staff', label: 'Nhân viên', color: '#d97706' },
]
