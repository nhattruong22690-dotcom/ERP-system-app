import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/supabase'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const resolvedParams = await params;
        let customerId: string | undefined = resolvedParams?.id;

        // Fallback for ID extraction if params is empty
        if (!customerId || customerId === 'undefined' || customerId === 'null') {
            const url = new URL(request.url);
            const pathParts = url.pathname.split('/');
            const lastPart = pathParts.pop();
            const secondLastPart = pathParts.pop();
            customerId = lastPart || secondLastPart;
        }

        if (!customerId || customerId === 'undefined' || customerId === 'null') {
            return NextResponse.json({ error: 'Thiếu ID khách hàng' }, { status: 400 })
        }

        const id: string = customerId;

        // 1. Tìm khách hàng - Lấy đầy đủ các trường như trong CRM Modal
        const { data: customer, error: customerError } = await supabase
            .from('crm_customers')
            .select('*')
            .eq('id', id)
            .single()

        if (customerError || !customer) {
            console.error('Customer not found:', id, customerError);
            return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 })
        }

        // 2. Lấy danh sách thẻ liệu trình
        const { data: treatmentCards, error: cardsError } = await supabase
            .from('crm_treatment_cards')
            .select('*')
            .eq('customer_id', id)
            .order('created_at', { ascending: false })

        // 3. Lấy danh sách lịch hẹn
        const { data: appointments, error: appointmentsError } = await supabase
            .from('crm_appointments')
            .select('*')
            .eq('customer_id', id)
            .order('appointment_date', { ascending: false })

        // 4. Lấy membership tiers để tính toán rank progress (giống modal)
        const { data: tiers } = await supabase
            .from('crm_membership_tiers')
            .select('*')
            .order('min_spend', { ascending: true })

        return NextResponse.json({
            status: 'success',
            data: {
                customer: {
                    fullName: customer.full_name,
                    phone: customer.phone,
                    birthday: customer.birthday,
                    gender: customer.gender,
                    rank: customer.rank,
                    points: customer.points,
                    totalSpent: customer.total_spent,
                    lastVisit: customer.last_visit,
                    professionalNotes: customer.professional_notes,
                    avatar: customer.avatar,
                    isVip: customer.is_vip
                },
                treatmentCards: (treatmentCards || []).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    total: c.total,
                    used: c.used,
                    remaining: c.remaining,
                    status: c.status,
                    expiryDate: c.expiry_date,
                    purchase_date: c.purchase_date,
                })),
                appointments: (appointments || []).map((a: any) => ({
                    id: a.id,
                    appointment_date: a.appointment_date,
                    appointment_time: a.appointment_time,
                    status: a.status,
                    notes: a.notes
                })),
                membershipTiers: tiers || []
            }
        })
    } catch (error: any) {
        console.error('Tracking API Error:', error)
        return NextResponse.json({ error: 'Lỗi hệ thống', detail: error.message }, { status: 500 })
    }
}
