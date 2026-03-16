import { supabase } from '@/lib/supabase/supabase';

export async function getCustomerDossier(customerId: string) {
    if (!customerId) return null;

    const [resCustomer, resOrders, resCards, resAppts] = await Promise.all([
        supabase.from('crm_customers').select('*').eq('id', customerId).single(),
        supabase.from('crm_service_orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('crm_treatment_cards').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('crm_appointments').select('*').eq('customer_id', customerId).order('appointment_date', { ascending: false })
    ]);

    const c = resCustomer.data;
    const mappedCustomer = c ? {
        id: c.id, fullName: c.full_name, avatar: c.avatar, phone: c.phone, phone2: c.phone2,
        email: c.email, gender: c.gender, facebook: c.facebook, zalo: c.zalo,
        address: c.address, birthday: c.birthday, rank: c.rank as any,
        points: c.points || 0, totalSpent: c.total_spent || 0,
        walletBalance: c.wallet_balance || 0,
        lastVisit: c.last_visit || 'Chưa có', branchId: c.branch_id,
        isVip: c.is_vip, professionalNotes: c.professional_notes,
        medicalNotes: c.medical_notes,
        createdAt: c.created_at, updatedAt: c.updated_at
    } : null;

    return {
        customer: mappedCustomer,
        serviceOrders: (resOrders.data || []).map((o: any) => ({
            id: o.id,
            code: o.code,
            customerId: o.customer_id,
            branchId: o.branch_id,
            appointmentId: o.appointment_id,
            lineItems: o.line_items || [],
            totalAmount: Number(o.total_amount || 0),
            actualAmount: Number(o.actual_amount || 0),
            debtAmount: Number(o.debt_amount || 0),
            payments: o.payments || [],
            status: o.status,
            createdBy: o.created_by,
            createdAt: o.created_at,
            updatedAt: o.updated_at
        })),
        treatmentCards: (resCards.data || []).map((c: any) => ({
            id: c.id,
            customerId: c.customer_id,
            name: c.name,
            type: c.type,
            total: c.total,
            used: c.used,
            remaining: c.remaining,
            status: c.status,
            expiryDate: c.expiry_date,
            warrantyExpiryDate: c.warranty_expiry_date,
            purchaseDate: c.purchase_date,
            createdAt: c.created_at,
            updatedAt: c.updated_at
        })),
        appointments: (resAppts.data || []).map((a: any) => ({
            id: a.id, customerId: a.customer_id, branchId: a.branch_id, staffId: a.staff_id,
            appointmentDate: a.appointment_date, appointmentTime: a.appointment_time,
            endTime: a.end_time, status: a.status, type: a.type,
            price: Number(a.price || 0), notes: a.notes,
            createdAt: a.created_at, updatedAt: a.updated_at
        }))
    };
}
