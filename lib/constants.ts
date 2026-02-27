export interface PermissionGroup {
    page: { value: string; label: string }
    actions: { value: string; label: string }[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
    {
        page: { value: '/dashboard', label: 'Dashboard' },
        actions: []
    },
    {
        page: { value: '/planning', label: 'Kế hoạch' },
        actions: [
            { value: 'plan_edit', label: 'Lập/Sửa Kế hoạch' }
        ]
    },
    {
        page: { value: '/transactions', label: 'Giao dịch' },
        actions: [
            { value: 'transaction_edit_all', label: 'Sửa/Xóa mọi giao dịch' },
            { value: 'transaction_lock', label: 'Khóa/Mở khóa giao dịch' }
        ]
    },
    {
        page: { value: '/accounts', label: 'Tài khoản & Ví' },
        actions: []
    },
    {
        page: { value: '/cashflow', label: 'Dòng tiền' },
        actions: []
    },
    {
        page: { value: '/crm/leads', label: 'CRM: Data Lead' },
        actions: [
            { value: 'crm_lead_manage', label: 'Quản lý Data Lead' },
            { value: 'crm_lead_view_team', label: 'Xem Lead của cả Team' }
        ]
    },
    {
        page: { value: '/crm/customers', label: 'CRM: Khách hàng' },
        actions: [
            { value: 'crm_customer_manage', label: 'Quản lý Khách hàng' }
        ]
    },
    {
        page: { value: '/crm/appointments', label: 'CRM: Lịch hẹn' },
        actions: [
            { value: 'crm_appointment_manage', label: 'Quản lý Lịch hẹn' }
        ]
    },
    {
        page: { value: '/crm/services', label: 'CRM: Dịch vụ' },
        actions: []
    },
    {
        page: { value: '/crm/attendance', label: 'HR: Chấm công' },
        actions: [
            { value: 'crm_attendance_view_all', label: 'Xem chấm công toàn chi nhánh' }
        ]
    },
    {
        page: { value: '/crm/payroll', label: 'HR: Bảng lương' },
        actions: [
            { value: 'crm_payroll_manage', label: 'Quản lý Bảng lương' }
        ]
    },
    {
        page: { value: '/crm/my-performance', label: 'HR: Hiệu suất tôi' },
        actions: []
    },
    {
        page: { value: '/settings/branches', label: 'C.Đạt: Chi nhánh' },
        actions: [
            { value: 'branch_manage', label: 'Quản lý Chi nhánh' },
            { value: 'branch_view_all', label: 'Xem tất cả chi nhánh' }
        ]
    },
    {
        page: { value: '/settings/accounts', label: 'C.Đạt: Tài khoản' },
        actions: [
            { value: 'account_manage', label: 'Quản lý Tài khoản' }
        ]
    },
    {
        page: { value: '/settings/categories', label: 'C.Đạt: Danh mục' },
        actions: [
            { value: 'category_manage', label: 'Quản lý Danh mục' }
        ]
    },
    {
        page: { value: '/settings/users', label: 'C.Đạt: QL USER' },
        actions: [
            { value: 'user_manage', label: 'Quản lý Người dùng' }
        ]
    },
    {
        page: { value: '/crm/commission-settings', label: 'C.Đạt: Hoa hồng' },
        actions: []
    },
]

export const PAGE_OPTIONS = [
    { value: '/dashboard', label: 'Dashboard' },
    { value: '/planning', label: 'Kế hoạch' },
    { value: '/transactions', label: 'Giao dịch' },
    { value: '/accounts', label: 'Tài khoản & Ví' },
    { value: '/cashflow', label: 'Dòng tiền' },
    { value: '/crm/leads', label: 'CRM: Data Lead' },
    { value: '/crm/customers', label: 'CRM: Khách hàng' },
    { value: '/crm/appointments', label: 'CRM: Lịch hẹn' },
    { value: '/crm/services', label: 'CRM: Dịch vụ' },
    { value: '/crm/attendance', label: 'HR: Chấm công' },
    { value: '/crm/payroll', label: 'HR: Bảng lương' },
    { value: '/crm/my-performance', label: 'HR: Hiệu suất tôi' },
    { value: '/settings/branches', label: 'C.Đạt: Chi nhánh' },
    { value: '/settings/accounts', label: 'C.Đạt: Tài khoản' },
    { value: '/settings/categories', label: 'C.Đạt: Danh mục' },
    { value: '/settings/users', label: 'C.Đạt: QL USER' },
    { value: '/crm/commission-settings', label: 'C.Đạt: Hoa hồng' },
]

export const PERM_OPTIONS = [
    { value: 'plan_edit', label: 'Lập/Sửa Kế hoạch' },
    { value: 'transaction_edit_all', label: 'Sửa/Xóa mọi giao dịch' },
    { value: 'transaction_lock', label: 'Khóa/Mở khóa giao dịch' },
    { value: 'branch_view_all', label: 'Xem tất cả chi nhánh' },
    { value: 'user_manage', label: 'Quản lý Người dùng' },
    { value: 'branch_manage', label: 'Quản lý Chi nhánh' },
    { value: 'category_manage', label: 'Quản lý Danh mục' },
    { value: 'account_manage', label: 'Quản lý Tài khoản' },
    { value: 'crm_lead_manage', label: 'Quản lý Data Lead' },
    { value: 'crm_lead_view_team', label: 'Xem Lead của cả Team' },
    { value: 'crm_customer_manage', label: 'Quản lý Khách hàng' },
    { value: 'crm_appointment_manage', label: 'Quản lý Lịch hẹn' },
    { value: 'crm_payroll_manage', label: 'Quản lý Bảng lương' },
    { value: 'crm_attendance_view_all', label: 'Xem chấm công toàn chi nhánh' },
]
