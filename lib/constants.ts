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
            { value: 'plan_update', label: 'Sửa Kế hoạch' },
            { value: 'plan_delete', label: 'Xóa Kế hoạch' }
        ],
        crud: { create: 'plan_create', update: 'plan_update', delete: 'plan_delete' }
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
        actions: [
            { value: 'account_create', label: 'Thêm Tài khoản Ví' },
            { value: 'account_update', label: 'Sửa Tài khoản Ví' },
            { value: 'account_delete', label: 'Xóa Tài khoản Ví' }
        ],
        crud: { create: 'account_create', update: 'account_update', delete: 'account_delete' }
    },
    {
        page: { value: '/cashflow', label: 'Dòng tiền' },
        actions: [
            { value: 'cashflow_view', label: 'Xem dòng tiền' },
            { value: 'cashflow_export', label: 'Xuất báo cáo dòng tiền' }
        ],
        crud: { update: 'cashflow_export' }
    },
    {
        page: { value: '/crm/leads', label: 'Data Lead' },
        actions: [
            { value: 'crm_lead_create', label: 'Thêm Data Lead' },
            { value: 'crm_lead_update', label: 'Sửa Data Lead' },
            { value: 'crm_lead_delete', label: 'Xóa Data Lead' },
            { value: 'crm_lead_lock', label: 'Khóa Data Lead' },
            { value: 'crm_lead_view_team', label: 'Xem Lead của cả Team' }
        ],
        crud: { create: 'crm_lead_create', update: 'crm_lead_update', delete: 'crm_lead_delete', lock: 'crm_lead_lock', extra: [{ value: 'crm_lead_view_team', label: 'Xem cả team' }] }
    },
    {
        page: { value: '/crm/customers', label: 'Khách hàng' },
        actions: [
            { value: 'crm_customer_create', label: 'Thêm Khách hàng mới' },
            { value: 'crm_customer_update', label: 'Sửa Khách hàng' },
            { value: 'crm_customer_delete', label: 'Xóa Khách hàng' },
            { value: 'crm_customer_lock', label: 'Khóa Khách hàng' }
        ],
        crud: { create: 'crm_customer_create', update: 'crm_customer_update', delete: 'crm_customer_delete', lock: 'crm_customer_lock' }
    },
    {
        page: { value: '/crm/appointments', label: 'Lịch hẹn & CSKH' },
        actions: [
            { value: 'crm_appointment_create', label: 'Thêm Lịch hẹn' },
            { value: 'crm_appointment_update', label: 'Sửa Lịch hẹn' },
            { value: 'crm_appointment_delete', label: 'Xóa Lịch hẹn' },
            { value: 'crm_appointment_lock', label: 'Khóa Lịch hẹn' }
        ],
        crud: { create: 'crm_appointment_create', update: 'crm_appointment_update', delete: 'crm_appointment_delete', lock: 'crm_appointment_lock' }
    },
    {
        page: { value: '/crm/service-orders', label: 'Phiếu dịch vụ' },
        actions: [
            { value: 'crm_order_create', label: 'Tạo Phiếu dịch vụ' },
            { value: 'crm_order_update', label: 'Sửa Phiếu dịch vụ' },
            { value: 'crm_order_delete', label: 'Xóa Phiếu dịch vụ' },
            { value: 'crm_order_lock', label: 'Chốt/Khóa Phiếu dịch vụ' }
        ],
        crud: { create: 'crm_order_create', update: 'crm_order_update', delete: 'crm_order_delete', lock: 'crm_order_lock' }
    },
    {
        page: { value: '/crm/services', label: 'Danh mục dịch vụ' },
        actions: [
            { value: 'crm_service_create', label: 'Thêm Dịch vụ mới' },
            { value: 'crm_service_update', label: 'Sửa Dịch vụ' },
            { value: 'crm_service_delete', label: 'Xóa Dịch vụ' }
        ],
        crud: { create: 'crm_service_create', update: 'crm_service_update', delete: 'crm_service_delete' }
    },
    {
        page: { value: '/crm/sale-settings', label: 'Cấu hình Sale' },
        actions: [
            { value: 'crm_config_update', label: 'Cập nhật cấu hình Sale' }
        ],
        crud: { update: 'crm_config_update' }
    },
    {
        page: { value: '/crm/attendance', label: 'Chấm công' },
        actions: [
            { value: 'crm_attendance_view_all', label: 'Xem chấm công toàn chi nhánh' },
            { value: 'crm_attendance_update', label: 'Sửa dữ liệu chấm công' }
        ],
        crud: { update: 'crm_attendance_update', extra: [{ value: 'crm_attendance_view_all', label: 'Xem toàn CN' }] }
    },
    {
        page: { value: '/crm/payroll', label: 'Bảng lương' },
        actions: [
            { value: 'crm_payroll_create', label: 'Tạo Bảng lương' },
            { value: 'crm_payroll_update', label: 'Sửa Bảng lương' },
            { value: 'crm_payroll_delete', label: 'Xóa Bảng lương' },
            { value: 'crm_payroll_lock', label: 'Chốt/Khóa Bảng lương' }
        ],
        crud: { create: 'crm_payroll_create', update: 'crm_payroll_update', delete: 'crm_payroll_delete', lock: 'crm_payroll_lock' }
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
            { value: 'branch_lock', label: 'Khóa Chi nhánh' },
            { value: 'branch_view_all', label: 'Xem tất cả chi nhánh' }
        ],
        crud: { create: 'branch_create', update: 'branch_update', delete: 'branch_delete', lock: 'branch_lock', extra: [{ value: 'branch_view_all', label: 'Xem tất cả' }] }
    },
    {
        page: { value: '/settings/accounts', label: 'QL Tài khoản' },
        actions: [
            { value: 'account_settings_update', label: 'Cập nhật QL Tài khoản' }
        ],
        crud: { update: 'account_settings_update' }
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
            { value: 'user_delete', label: 'Xóa Hồ sơ nhân sự' },
            { value: 'user_lock', label: 'Khóa tài khoản nhân sự' }
        ],
        crud: { create: 'user_create', update: 'user_update', delete: 'user_delete', lock: 'user_lock' }
    },
    {
        page: { value: '/settings/notifications', label: 'Cấu hình thông báo' },
        actions: [
            { value: 'notification_update', label: 'Cập nhật cấu hình thông báo' }
        ],
        crud: { update: 'notification_update' }
    },
    {
        page: { value: '/activity', label: 'Bản tin hệ thống' },
        actions: [
            { value: 'activity_view', label: 'Xem bản tin hệ thống' }
        ],
        crud: { create: 'activity_view' }
    },
]

export const PAGE_OPTIONS = PERMISSION_GROUPS.map(g => g.page)

export const PERM_OPTIONS = [
    { value: 'plan_create', label: 'Lập Kế hoạch mới' },
    { value: 'plan_update', label: 'Sửa Kế hoạch' },
    { value: 'plan_delete', label: 'Xóa Kế hoạch' },
    { value: 'transaction_create', label: 'Thêm giao dịch' },
    { value: 'transaction_update', label: 'Sửa giao dịch' },
    { value: 'transaction_delete', label: 'Xóa giao dịch' },
    { value: 'transaction_lock', label: 'Khóa/Mở khóa giao dịch' },
    { value: 'account_create', label: 'Thêm Tài khoản Ví' },
    { value: 'account_update', label: 'Sửa Tài khoản Ví' },
    { value: 'account_delete', label: 'Xóa Tài khoản Ví' },
    { value: 'account_settings_update', label: 'Cập nhật QL Tài khoản' },
    { value: 'cashflow_view', label: 'Xem dòng tiền' },
    { value: 'cashflow_export', label: 'Xuất báo cáo dòng tiền' },
    { value: 'crm_lead_create', label: 'Thêm Data Lead' },
    { value: 'crm_lead_update', label: 'Sửa Data Lead' },
    { value: 'crm_lead_delete', label: 'Xóa Data Lead' },
    { value: 'crm_lead_lock', label: 'Khóa Data Lead' },
    { value: 'crm_lead_view_team', label: 'Xem Lead của cả Team' },
    { value: 'crm_customer_create', label: 'Thêm Khách hàng mới' },
    { value: 'crm_customer_update', label: 'Sửa Khách hàng' },
    { value: 'crm_customer_delete', label: 'Xóa Khách hàng' },
    { value: 'crm_customer_lock', label: 'Khóa Khách hàng' },
    { value: 'crm_appointment_create', label: 'Thêm Lịch hẹn' },
    { value: 'crm_appointment_update', label: 'Sửa Lịch hẹn' },
    { value: 'crm_appointment_delete', label: 'Xóa Lịch hẹn' },
    { value: 'crm_appointment_lock', label: 'Khóa Lịch hẹn' },
    { value: 'crm_order_create', label: 'Tạo Phiếu dịch vụ' },
    { value: 'crm_order_update', label: 'Sửa Phiếu dịch vụ' },
    { value: 'crm_order_delete', label: 'Xóa Phiếu dịch vụ' },
    { value: 'crm_order_lock', label: 'Chốt/Khóa Phiếu dịch vụ' },
    { value: 'crm_service_create', label: 'Thêm Dịch vụ mới' },
    { value: 'crm_service_update', label: 'Sửa Dịch vụ' },
    { value: 'crm_service_delete', label: 'Xóa Dịch vụ' },
    { value: 'crm_config_update', label: 'Cập nhật cấu hình Sale' },
    { value: 'crm_attendance_view_all', label: 'Xem chấm công toàn chi nhánh' },
    { value: 'crm_attendance_update', label: 'Sửa dữ liệu chấm công' },
    { value: 'crm_payroll_create', label: 'Tạo Bảng lương' },
    { value: 'crm_payroll_update', label: 'Sửa Bảng lương' },
    { value: 'crm_payroll_delete', label: 'Xóa Bảng lương' },
    { value: 'crm_payroll_lock', label: 'Chốt/Khóa Bảng lương' },
    { value: 'branch_create', label: 'Thêm Chi nhánh mới' },
    { value: 'branch_update', label: 'Sửa Chi nhánh' },
    { value: 'branch_delete', label: 'Xóa Chi nhánh' },
    { value: 'branch_lock', label: 'Khóa Chi nhánh' },
    { value: 'branch_view_all', label: 'Xem tất cả chi nhánh' },
    { value: 'category_create', label: 'Thêm Danh mục mới' },
    { value: 'category_update', label: 'Sửa Danh mục' },
    { value: 'category_delete', label: 'Xóa Danh mục' },
    { value: 'user_create', label: 'Thêm Nhân sự mới' },
    { value: 'user_update', label: 'Sửa Hồ sơ nhân sự' },
    { value: 'user_delete', label: 'Xóa Hồ sơ nhân sự' },
    { value: 'user_lock', label: 'Khóa tài khoản nhân sự' },
    { value: 'notification_update', label: 'Cập nhật cấu hình thông báo' },
    { value: 'activity_view', label: 'Xem bản tin hệ thống' },
]
