export interface PermissionGroup {
    page: { value: string; label: string }
    actions: { value: string; label: string }[]
    // CRUD mapping for the permission matrix table
    crud?: {
        create?: string   // permission key for Create
        update?: string   // permission key for Update
        delete?: string   // permission key for Delete
        lock?: string     // permission key for Lock/Unlock
        extra?: { value: string; label: string }[] // additional toggles
    }
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
    {
        page: { value: '/dashboard', label: 'Tổng quan' },
        actions: [],
    },
    {
        page: { value: '/planning', label: 'Kế hoạch TC' },
        actions: [
            { value: 'plan_create', label: 'Lập Kế hoạch mới' },
            { value: 'plan_update', label: 'Sửa Kế hoạch' }
        ],
        crud: { create: 'plan_create', update: 'plan_update' }
    },
    {
        page: { value: '/transactions', label: 'Sổ cái giao dịch' },
        actions: [
            { value: 'transaction_create', label: 'Thêm giao dịch' },
            { value: 'transaction_update', label: 'Sửa giao dịch' },
            { value: 'transaction_delete', label: 'Xóa giao dịch' },
            { value: 'transaction_lock', label: 'Khóa/Mở khóa giao dịch' }
        ],
        crud: { create: 'transaction_create', update: 'transaction_update', delete: 'transaction_delete', lock: 'transaction_lock' }
    },
    {
        page: { value: '/accounts', label: 'Tài khoản & Ví' },
        actions: [],
    },
    {
        page: { value: '/cashflow', label: 'Dòng tiền' },
        actions: [],
    },
    {
        page: { value: '/crm/leads', label: 'Data Lead' },
        actions: [
            { value: 'crm_lead_create', label: 'Thêm Data Lead' },
            { value: 'crm_lead_update', label: 'Sửa Data Lead' },
            { value: 'crm_lead_delete', label: 'Xóa Data Lead' },
            { value: 'crm_lead_view_team', label: 'Xem Lead của cả Team' }
        ],
        crud: { create: 'crm_lead_create', update: 'crm_lead_update', delete: 'crm_lead_delete', extra: [{ value: 'crm_lead_view_team', label: 'Xem cả team' }] }
    },
    {
        page: { value: '/crm/customers', label: 'Khách hàng' },
        actions: [
            { value: 'crm_customer_create', label: 'Thêm Khách hàng mới' },
            { value: 'crm_customer_update', label: 'Sửa Khách hàng' },
            { value: 'crm_customer_delete', label: 'Xóa Khách hàng' }
        ],
        crud: { create: 'crm_customer_create', update: 'crm_customer_update', delete: 'crm_customer_delete' }
    },
    {
        page: { value: '/crm/appointments', label: 'Lịch hẹn & CSKH' },
        actions: [
            { value: 'crm_appointment_create', label: 'Thêm Lịch hẹn' },
            { value: 'crm_appointment_update', label: 'Sửa Lịch hẹn' },
            { value: 'crm_appointment_delete', label: 'Xóa Lịch hẹn' }
        ],
        crud: { create: 'crm_appointment_create', update: 'crm_appointment_update', delete: 'crm_appointment_delete' }
    },
    {
        page: { value: '/crm/services', label: 'Danh mục dịch vụ' },
        actions: [],
    },
    {
        page: { value: '/crm/sale-settings', label: 'Cấu hình Sale' },
        actions: [],
    },
    {
        page: { value: '/crm/attendance', label: 'Chấm công' },
        actions: [
            { value: 'crm_attendance_view_all', label: 'Xem chấm công toàn chi nhánh' }
        ],
        crud: { extra: [{ value: 'crm_attendance_view_all', label: 'Xem toàn CN' }] }
    },
    {
        page: { value: '/crm/payroll', label: 'Bảng lương' },
        actions: [
            { value: 'crm_payroll_create', label: 'Tạo Bảng lương' },
            { value: 'crm_payroll_update', label: 'Sửa Bảng lương' }
        ],
        crud: { create: 'crm_payroll_create', update: 'crm_payroll_update' }
    },
    {
        page: { value: '/crm/my-performance', label: 'Hiệu suất cá nhân' },
        actions: [],
    },
    {
        page: { value: '/settings/branches', label: 'QL Chi nhánh' },
        actions: [
            { value: 'branch_create', label: 'Thêm Chi nhánh mới' },
            { value: 'branch_update', label: 'Sửa Chi nhánh' },
            { value: 'branch_delete', label: 'Xóa Chi nhánh' },
            { value: 'branch_view_all', label: 'Xem tất cả chi nhánh' }
        ],
        crud: { create: 'branch_create', update: 'branch_update', delete: 'branch_delete', extra: [{ value: 'branch_view_all', label: 'Xem tất cả' }] }
    },
    {
        page: { value: '/settings/accounts', label: 'QL Tài khoản' },
        actions: [
            { value: 'account_create', label: 'Thêm Tài khoản Ví' },
            { value: 'account_update', label: 'Sửa Tài khoản Ví' },
            { value: 'account_delete', label: 'Xóa Tài khoản Ví' }
        ],
        crud: { create: 'account_create', update: 'account_update', delete: 'account_delete' }
    },
    {
        page: { value: '/settings/categories', label: 'Danh mục thu chi' },
        actions: [
            { value: 'category_create', label: 'Thêm Danh mục mới' },
            { value: 'category_update', label: 'Sửa Danh mục' },
            { value: 'category_delete', label: 'Xóa Danh mục' }
        ],
        crud: { create: 'category_create', update: 'category_update', delete: 'category_delete' }
    },
    {
        page: { value: '/settings/users', label: 'Quản trị nhân sự' },
        actions: [
            { value: 'user_create', label: 'Thêm Nhân sự mới' },
            { value: 'user_update', label: 'Sửa Hồ sơ nhân sự' },
            { value: 'user_delete', label: 'Xóa Hồ sơ nhân sự' }
        ],
        crud: { create: 'user_create', update: 'user_update', delete: 'user_delete' }
    },
    {
        page: { value: '/settings/notifications', label: 'Cấu hình thông báo' },
        actions: [],
    },
    {
        page: { value: '/activity', label: 'Bản tin hệ thống' },
        actions: [],
    },
]

export const PAGE_OPTIONS = PERMISSION_GROUPS.map(g => g.page)

export const PERM_OPTIONS = [
    { value: 'plan_create', label: 'Lập Kế hoạch mới' },
    { value: 'plan_update', label: 'Sửa Kế hoạch' },
    { value: 'transaction_create', label: 'Thêm giao dịch' },
    { value: 'transaction_update', label: 'Sửa giao dịch' },
    { value: 'transaction_delete', label: 'Xóa giao dịch' },
    { value: 'transaction_lock', label: 'Khóa/Mở khóa giao dịch' },
    { value: 'branch_view_all', label: 'Xem tất cả chi nhánh' },
    { value: 'user_create', label: 'Thêm Nhân sự mới' },
    { value: 'user_update', label: 'Sửa Hồ sơ nhân sự' },
    { value: 'user_delete', label: 'Xóa Hồ sơ nhân sự' },
    { value: 'branch_create', label: 'Thêm Chi nhánh mới' },
    { value: 'branch_update', label: 'Sửa Chi nhánh' },
    { value: 'branch_delete', label: 'Xóa Chi nhánh' },
    { value: 'category_create', label: 'Thêm Danh mục mới' },
    { value: 'category_update', label: 'Sửa Danh mục' },
    { value: 'category_delete', label: 'Xóa Danh mục' },
    { value: 'account_create', label: 'Thêm Tài khoản Ví' },
    { value: 'account_update', label: 'Sửa Tài khoản Ví' },
    { value: 'account_delete', label: 'Xóa Tài khoản Ví' },
    { value: 'crm_lead_create', label: 'Thêm Data Lead' },
    { value: 'crm_lead_update', label: 'Sửa Data Lead' },
    { value: 'crm_lead_delete', label: 'Xóa Data Lead' },
    { value: 'crm_lead_view_team', label: 'Xem Lead của cả Team' },
    { value: 'crm_customer_create', label: 'Thêm Khách hàng mới' },
    { value: 'crm_customer_update', label: 'Sửa Khách hàng' },
    { value: 'crm_customer_delete', label: 'Xóa Khách hàng' },
    { value: 'crm_appointment_create', label: 'Thêm Lịch hẹn' },
    { value: 'crm_appointment_update', label: 'Sửa Lịch hẹn' },
    { value: 'crm_appointment_delete', label: 'Xóa Lịch hẹn' },
    { value: 'crm_payroll_create', label: 'Tạo Bảng lương' },
    { value: 'crm_payroll_update', label: 'Sửa Bảng lương' },
    { value: 'crm_attendance_view_all', label: 'Xem chấm công toàn chi nhánh' },
]
