import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/supabase'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')

    // Thiết lập CORS headers
    const headers = {
        'Access-Control-Allow-Origin': 'https://chat.zalo.me',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    if (!phone) {
        return NextResponse.json({ error: 'Thiếu số điện thoại' }, { status: 400, headers })
    }

    // Làm sạch số điện thoại (chỉ lấy số)
    const cleanPhone = phone.replace(/\D/g, '')

    try {
        // Tìm kiếm tất cả khách hàng khớp (ilike để tìm chuỗi con, đề phòng mất số 0 ở đầu)
        const { data: customers, error: customerError } = await supabase
            .from('crm_customers')
            .select('*')
            .or(`phone.ilike.%${cleanPhone}%,phone2.ilike.%${cleanPhone}%`)

        if (customerError || !customers || customers.length === 0) {
            return NextResponse.json({ message: 'Không tìm thấy khách hàng' }, { status: 404, headers })
        }

        // Lấy danh sách ID khách hàng
        const customerIds = customers.map(c => c.id)

        // Lấy tất cả lịch hẹn của các khách hàng này từ mới nhất đến cũ nhất
        const { data: appointments } = await supabase
            .from('crm_appointments')
            .select('*')
            .in('customer_id', customerIds)
            .order('appointment_date', { ascending: false })

        // Trả về dữ liệu dạng mảng cho Zalo Bridge
        const results = customers.map(customer => {
            // Tìm lịch hẹn đầu tiên (gần nhất) của khách hàng này
            const latestAppointment = appointments?.find(a => a.customer_id === customer.id)
            return {
                id: customer.id,
                fullName: customer.full_name,
                phone: customer.phone,
                rank: customer.rank || 'Bronze',
                totalSpent: customer.total_spent || 0,
                lastVisit: latestAppointment ? `${latestAppointment.appointment_date} ${latestAppointment.appointment_time || ''}` : 'Chưa có',
                points: customer.points || 0,
                isVip: customer.is_vip
            }
        });

        return NextResponse.json(results, { headers })
    } catch (error) {
        console.error('Zalo Tracking API Error:', error)
        return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500, headers })
    }
}

// Xử lý preflight request cho CORS
export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': 'https://chat.zalo.me',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    })
}
