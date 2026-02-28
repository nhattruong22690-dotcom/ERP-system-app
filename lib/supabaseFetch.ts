import { supabase } from './supabase'
import { AppState, User, Branch, PaymentAccount, Category, MonthlyPlan, Transaction, ActivityLog } from './types'

async function fetchAllRows(table: string, columns: string = '*') {
    let allData: any[] = []
    let from = 0
    const step = 1000
    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select(columns)
            .range(from, from + step - 1)

        if (error) {
            console.error(`Error fetching all rows from ${table}:`, error)
            return allData
        }
        if (!data || data.length === 0) break
        allData.push(...data)
        if (data.length < step) break
        from += step
    }
    return allData
}

export async function fetchAllData(): Promise<AppState | null> {
    try {
        // Tránh over-fetching (Failed to fetch) do trình duyệt giới hạn concurrent requests
        // Chia làm 2 đợt
        const currentMonthStr = (new Date().getMonth() + 1).toString().padStart(2, '0')

        const batch1 = await Promise.all([
            supabase.from('branches').select('*'),
            supabase.from('users').select('*'),
            supabase.from('categories').select('*'),
            supabase.from('payment_accounts').select('*'),
            supabase.from('monthly_plans').select('*'),
            supabase.from('category_plans').select('*'),
            fetchAllRows('transactions'),
            fetchAllRows('activity_logs'),
            // Only fetching counts and minimal birthday bits for cached stats, NOT all 31k+ records
            supabase.from('crm_customers').select('id, birthday', { count: 'exact' }),
            supabase.from('crm_customers').select('*', { count: 'exact', head: true }).eq('is_vip', true),
            supabase.from('crm_appointments').select('*, crm_customers(full_name, phone, avatar, rank, professional_notes, medical_notes)'),
            supabase.from('crm_services').select('*'),
        ])

        const batch2 = await Promise.all([
            supabase.from('crm_membership_tiers').select('*'),
            supabase.from('crm_commission_settings').select('*'),
            supabase.from('crm_leads').select('*'),
            supabase.from('crm_commission_logs').select('*'),
            supabase.from('crm_user_missions').select('*'),
            supabase.from('crm_job_titles').select('*'),
            supabase.from('crm_attendance').select('*'),
            supabase.from('crm_salary_history').select('*'),
            supabase.from('crm_bonuses').select('*'),
            supabase.from('crm_deductions').select('*'),
            supabase.from('crm_salary_advances').select('*'),
            supabase.from('crm_payroll_rosters').select('*'),
            supabase.from('crm_service_orders').select('*')
        ])

        const [
            resBranchesRaw,
            resUsersRaw,
            resCategoriesRaw,
            resAccountsRaw,
            resPlansRaw,
            resCategoryPlansRaw,
            resTransactions,
            resActivityLogs,
            resCustomersAllCount, // This now contains ID/Birthday for stats calculation
            resTotalVips,
            resAppointmentsRaw,
            resServicesRaw,
        ] = batch1 as any;

        const [
            resTiersRaw,
            resCommissionSettingsRaw,
            resLeadsRaw,
            resCommissionLogsRaw,
            resUserMissionsRaw,
            resJobTitlesRaw,
            resAttendanceRaw,
            resSalaryHistoryRaw,
            resBonusesRaw,
            resDeductionsRaw,
            resSalaryAdvancesRaw,
            resPayrollRostersRaw,
            resServiceOrdersRaw
        ] = batch2 as any;

        const rawQueries = [
            { id: 'branches', res: resBranchesRaw },
            { id: 'users', res: resUsersRaw },
            { id: 'categories', res: resCategoriesRaw },
            { id: 'accounts', res: resAccountsRaw },
            { id: 'plans', res: resPlansRaw },
            { id: 'category_plans', res: resCategoryPlansRaw },
            { id: 'services', res: resServicesRaw },
            { id: 'tiers', res: resTiersRaw },
            { id: 'commission_settings', res: resCommissionSettingsRaw },
            { id: 'leads', res: resLeadsRaw },
            { id: 'commission_logs', res: resCommissionLogsRaw },
            { id: 'user_missions', res: resUserMissionsRaw },
            { id: 'job_titles', res: resJobTitlesRaw },
            { id: 'attendance', res: resAttendanceRaw },
            { id: 'salary_history', res: resSalaryHistoryRaw },
            { id: 'bonuses', res: resBonusesRaw },
            { id: 'deductions', res: resDeductionsRaw },
            { id: 'salary_advances', res: resSalaryAdvancesRaw },
            { id: 'payroll_rosters', res: resPayrollRostersRaw },
            { id: 'service_orders', res: resServiceOrdersRaw },
            { id: 'appointments', res: resAppointmentsRaw },
            { id: 'customer_counts', res: resCustomersAllCount },
            { id: 'vip_counts', res: resTotalVips }
        ];

        rawQueries.forEach(q => {
            if (q.res?.error) {
                console.error(`Supabase Query failed for [${q.id}]:`, JSON.stringify(q.res.error, null, 2));
            }
        });

        const resBranches = resBranchesRaw.data || [];
        const resUsers = resUsersRaw.data || [];
        const resCategories = resCategoriesRaw.data || [];
        const resAccounts = resAccountsRaw.data || [];
        const resPlans = resPlansRaw.data || [];
        const resCategoryPlans = resCategoryPlansRaw.data || [];
        const resServices = resServicesRaw.data || [];
        const resAppointments = resAppointmentsRaw.data || [];
        const resTiers = resTiersRaw.data || [];
        const resCommissionSettings = resCommissionSettingsRaw.data || [];
        const resLeads = resLeadsRaw.data || [];
        const resCommissionLogs = resCommissionLogsRaw.data || [];
        const resUserMissions = resUserMissionsRaw.data || [];
        const resJobTitles = resJobTitlesRaw.data || [];
        const resAttendance = resAttendanceRaw.data || [];
        const resSalaryHistory = resSalaryHistoryRaw.data || [];
        const resBonuses = resBonusesRaw.data || [];
        const resDeductions = resDeductionsRaw.data || [];
        const resSalaryAdvances = resSalaryAdvancesRaw.data || [];
        const resPayrollRosters = resPayrollRostersRaw.data || [];
        const resServiceOrders = resServiceOrdersRaw.data || [];

        if (resUsers.length === 0) {
            console.warn('fetchAllData: Critical - No users found on server or RLS blocked. Sync aborted.')
            return null
        }

        const mappedPlans: MonthlyPlan[] = resPlans.map((p: any) => ({
            id: p.id,
            branchId: p.branch_id,
            year: p.year,
            month: p.month,
            kpiRevenue: p.kpi_revenue || 0,
            taxRate: p.tax_rate || 0,
            createdAt: p.created_at || new Date().toISOString(),
            updatedAt: p.updated_at || new Date().toISOString(),
            categoryPlans: resCategoryPlans.filter((cp: any) => cp.plan_id === p.id).map((cp: any) => ({
                id: cp.id,
                categoryId: cp.category_id,
                rate: cp.rate,
                fixedAmount: cp.fixed_amount,
                plannedAmount: cp.planned_amount || 0,
                alertThreshold: cp.alert_threshold || 0.8,
                disabled: cp.disabled || false
            }))
        }))

        return {
            branches: resBranches.map((b: any) => ({
                id: b.id, name: b.name, code: b.code, type: b.type || (b.is_headquarter ? 'hq' : 'spa'),
                isHeadquarter: b.is_headquarter,
                icon: b.icon, color: b.color,
                createdAt: b.created_at
            })),
            users: resUsers.map((u: any) => {
                const jt = resJobTitles.find((j: any) => j.id === u.job_title_id)
                return {
                    id: u.id, username: u.username, displayName: u.display_name, password: u.password,
                    email: u.email, avatarUrl: u.avatar_url,
                    role: u.role as any, allowedPages: u.allowed_pages || [], permissions: u.permissions || [],
                    branchId: u.branch_id, title: u.title, jobTitleId: u.job_title_id,
                    departmentType: jt?.department_type as any,
                    workStatus: u.work_status,
                    hasAttendance: u.has_attendance,
                    salaryConfig: u.salary_config,
                    viewAllBranches: u.view_all_branches || false,
                    isActive: u.is_active !== false,
                    createdAt: u.created_at
                }
            }),
            categories: resCategories.map((c: any) => ({
                id: c.id, name: c.name, section: c.section as any, sortOrder: c.sort_order,
                isRateBased: c.is_rate_based || false,
                defaultRate: c.default_rate,
                isHidden: c.is_hidden || false,
                createdAt: c.created_at
            })),
            accounts: resAccounts.map((a: any) => ({
                id: a.id, name: a.name, type: a.type as any, initialBalance: a.initial_balance,
                branchId: a.branch_id, bankName: a.bank_name, accountNumber: a.account_number,
                accountHolder: a.account_holder, createdAt: a.created_at
            })),
            plans: mappedPlans,
            transactions: resTransactions.map((t: any) => ({
                id: t.id, branchId: t.branch_id, date: t.date, type: t.type as any, categoryId: t.category_id,
                amount: t.amount, paymentAccountId: t.payment_account_id, toPaymentAccountId: t.to_payment_account_id,
                paidByBranchId: t.paid_by_branch_id, note: t.note, isDebt: t.is_debt, status: t.status as any,
                createdBy: t.created_by, createdAt: t.created_at, updatedBy: t.updated_at, updatedAt: t.updated_at
            })),
            activityLogs: resActivityLogs.map((l: any) => ({
                id: l.id, userId: l.user_id, type: l.type as any,
                entityType: l.entity_type as any, entityId: l.entity_id,
                details: l.details, createdAt: l.created_at
            })),
            customers: [], // Do NOT load all customers here anymore
            appointments: resAppointments.map((a: any) => ({
                id: a.id, customerId: a.customer_id, branchId: a.branch_id, staffId: a.staff_id,
                appointmentDate: a.appointment_date, appointmentTime: a.appointment_time,
                endTime: a.end_time, status: a.status as any, type: a.type as any,
                price: Number(a.price || 0), notes: a.notes,
                logs: a.logs || [], redFlags: a.red_flags || [],
                serviceEntries: a.service_entries || [],
                customerName: a.crm_customers?.full_name || 'Khách vãng lai',
                customerPhone: a.crm_customers?.phone || 'N/A',
                customerAvatar: a.crm_customers?.avatar,
                customerRank: a.crm_customers?.rank,
                customerRedFlags: (a.crm_customers?.medical_notes || a.crm_customers?.professional_notes) ? [{ details: 'Lưu ý y tế' }] : [],
                saleTeleId: a.sale_tele_id,
                saleTeleName: a.sale_tele_name,
                salePageId: a.sale_page_id,
                salePageName: a.sale_page_name,
                leadId: a.lead_id,
                bookingSource: a.booking_source as any,
                kpiConfirmed: a.kpi_confirmed,
                kpiExclusionNote: a.kpi_exclusion_note,
                kpiExcludedBy: a.kpi_excluded_by,
                kpiExcludedAt: a.kpi_excluded_at,
                createdAt: a.created_at, updatedAt: a.updated_at
            })),
            services: resServices.map((s: any) => ({
                id: s.id, name: s.name, category: s.category, price: Number(s.price || 0),
                duration: s.duration || 0, isActive: s.is_active !== false,
                image: s.image, createdAt: s.created_at
            })),
            membershipTiers: resTiers.map((t: any) => ({
                id: t.id, name: t.name, subtext: t.subtext,
                minSpend: Number(t.min_spend || 0), maxSpend: Number(t.max_spend || 0),
                discount: t.discount || 0, icon: t.icon, theme: t.theme, createdAt: t.created_at
            })),
            treatmentCards: [],
            commissionSettings: resCommissionSettings.map((s: any) => ({
                id: s.id,
                name: s.name,
                ruleCode: s.rule_code,
                action: s.action,
                type: s.type,
                amount: s.amount,
                tiers: s.type === 'tiered' ? s.tiers : [],
                kpiTiers: s.type === 'kpi_tiered' ? s.tiers : [],
                condition: s.condition,
                isActive: s.is_active,
                createdAt: s.created_at,
                updatedAt: s.updated_at
            })),
            leads: resLeads.map((l: any) => ({
                id: l.id,
                customerId: l.customer_id,
                source: l.source,
                salePageStaffId: l.sale_page_staff_id,
                salePageId: l.sale_page_staff_id, // Keep for backward compatibility
                saleTeleStaffId: l.sale_tele_staff_id,
                status: l.lifecycle_status, // Map lifecycle_status to status
                lifecycleStatus: l.lifecycle_status,
                name: l.customer_name || '',
                phone: l.phone || '',
                socialLink: l.social_link,
                pageEvaluation: l.page_evaluation,
                isAppointmentSet: l.is_appointment_set,
                isCheckedIn: l.is_checked_in,
                totalServiceValue: l.total_service_value,
                phoneObtainedAt: l.phone_obtained_at,
                branchId: l.branch_id,
                notes: l.notes,
                careLogs: l.care_logs || [],
                kpiConfirmed: l.kpi_confirmed,
                kpiExclusionNote: l.kpi_exclusion_note,
                kpiExcludedBy: l.kpi_excluded_by,
                kpiExcludedAt: l.kpi_excluded_at,
                createdAt: l.created_at,
                updatedAt: l.updated_at
            })),
            commissionLogs: resCommissionLogs.map((l: any) => ({
                id: l.id, userId: l.user_id, amount: l.amount, type: l.type as any,
                status: l.status as any, appointmentId: l.appointment_id,
                leadId: l.lead_id, description: l.description, evidenceUrl: l.evidence_url,
                approvedBy: l.approved_by, createdAt: l.created_at, updatedAt: l.updated_at
            })),
            userMissions: resUserMissions.map((m: any) => ({
                id: m.id, userId: m.user_id, kpiType: m.kpi_type, targetValue: m.target_value,
                currentValue: m.current_value || 0, periodType: m.period_type,
                cycle: m.cycle || 'daily', metricType: m.metric_type || 'count', isActive: m.is_active !== false,
                startDate: m.start_date, endDate: m.end_date, rewardAmount: m.reward_amount,
                status: m.status as any, createdAt: m.created_at, updatedAt: m.updated_at
            })),
            jobTitles: resJobTitles.map((jt: any) => ({
                id: jt.id, name: jt.name, departmentType: jt.department_type as any,
                defaultRole: jt.default_role as any,
                icon: jt.icon, color: jt.color,
                hasAttendance: jt.has_attendance,
                allowedPages: jt.allowed_pages || [],
                permissions: jt.permissions || [],
                createdAt: jt.created_at
            })),
            attendance: resAttendance.map((a: any) => ({
                id: a.id, userId: a.user_id, branchId: a.branch_id, date: a.date,
                status: a.status as any, checkIn: a.check_in, checkOut: a.check_out,
                note: a.note, createdAt: a.created_at, updatedAt: a.updated_at
            })),
            salaryHistory: resSalaryHistory.map((s: any) => ({
                id: s.id, userId: s.user_id, changedBy: s.changed_by,
                oldConfig: s.old_config, newConfig: s.new_config,
                changeReason: s.change_reason, createdAt: s.created_at
            })),
            bonuses: resBonuses.map((b: any) => ({
                id: b.id, userId: b.user_id, branchId: b.branch_id,
                type: b.type, amount: Number(b.amount || 0), date: b.date, period: b.period,
                note: b.note, createdBy: b.created_by, createdAt: b.created_at
            })),
            deductions: resDeductions.map((d: any) => ({
                id: d.id, userId: d.user_id, type: d.type,
                amount: Number(d.amount || 0), date: d.date, period: d.period,
                note: d.note, createdBy: d.created_by, createdAt: d.created_at
            })),
            salaryAdvances: resSalaryAdvances.map((a: any) => ({
                id: a.id, userId: a.user_id, amount: Number(a.amount || 0),
                date: a.date, period: a.period, status: a.status, note: a.note,
                createdBy: a.created_by, approvedBy: a.approved_by, createdAt: a.created_at,
                approvedAt: a.approved_at,
                paidBy: a.paid_by,
                paidAt: a.paid_at,
                paidNote: a.paid_note
            })),
            payrollRosters: resPayrollRosters.map((r: any) => ({
                id: r.id, period: r.period, userId: r.user_id,
                createdBy: r.created_by, createdAt: r.created_at
            })),
            serviceOrders: resServiceOrders.map((o: any) => ({
                id: o.id,
                code: o.code,
                customerId: o.customer_id,
                branchId: o.branch_id,
                appointmentId: o.appointment_id,
                lineItems: o.line_items || [],
                totalAmount: Number(o.total_amount || 0),
                status: o.status,
                createdBy: o.created_by,
                createdAt: o.created_at,
                updatedAt: o.updated_at
            })),
            customerStats: {
                total: resCustomersAllCount.count || 0,
                vip: resTotalVips.count || 0,
                birthdays: (resCustomersAllCount.data || []).filter((c: any) => {
                    if (!c.birthday) return false;
                    const m = new Date().getMonth();
                    let bMonth = -1;
                    if (c.birthday.includes('-')) bMonth = parseInt(c.birthday.split('-')[1]) - 1;
                    else if (c.birthday.includes('/')) bMonth = parseInt(c.birthday.split('/')[1]) - 1;
                    else bMonth = new Date(c.birthday).getMonth();
                    return bMonth === m;
                }).length
            },
            dismissedAlerts: [],
            starredAlerts: [],
        }
    } catch (e) {
        console.error('Failed to fetch from supabase', e)
        return null
    }
}

export async function searchCustomers(query: string) {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase().trim();
    const { data, error } = await supabase
        .from('crm_customers')
        .select('*')
        .or(`full_name.ilike.%${lowerQuery}%,phone.ilike.%${lowerQuery}%,email.ilike.%${lowerQuery}%`)
        .limit(20);

    if (error) {
        console.error('searchCustomers Error:', error);
        return [];
    }

    return (data || []).map((c: any) => ({
        id: c.id, fullName: c.full_name, avatar: c.avatar, phone: c.phone, phone2: c.phone2,
        email: c.email, gender: c.gender, facebook: c.facebook, zalo: c.zalo,
        address: c.address, birthday: c.birthday, rank: c.rank as any,
        points: c.points || 0, totalSpent: c.total_spent || 0,
        lastVisit: c.last_visit || 'Chưa có', branchId: c.branch_id,
        isVip: c.is_vip, professionalNotes: c.professional_notes,
        createdAt: c.created_at, updatedAt: c.updated_at
    }));
}
