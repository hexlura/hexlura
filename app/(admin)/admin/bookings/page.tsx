import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminBookingsClient } from './bookings-client'

export default async function AdminBookingsPage({
    searchParams,
}: {
    searchParams: { q?: string; tab?: string; status?: string; page?: string }
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const tab = searchParams.tab ?? 'all'
    const page = Math.max(1, parseInt(searchParams.page ?? '1'))
    const pageSize = 25
    const offset = (page - 1) * pageSize

    if (tab === 'refunds') {
        const { data: refunds, count } = await supabase
            .from('refund_requests')
            .select('id, status, reason, message, created_at, booking:bookings(id, booking_ref, total_pence, user_id, profiles(full_name, email), event:events(title))', { count: 'exact' })
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        return (
            <AdminBookingsClient
                bookings={[]}
                refunds={(refunds || []) as unknown as RefundRow[]}
                totalRows={count ?? 0}
                page={page}
                pageSize={pageSize}
                tab="refunds"
            />
        )
    }

    let query = supabase
        .from('bookings')
        .select('id, booking_ref, status, total_pence, ticket_subtotal_pence, booking_fee_pence, payment_method, created_at, confirmed_at, user_id, profiles(full_name, email), event:events(title)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

    if (searchParams.q) {
        query = query.or(`booking_ref.ilike.%${searchParams.q}%`)
    }
    if (searchParams.status && searchParams.status !== 'all') {
        query = query.eq('status', searchParams.status)
    }

    const { data: bookings, count } = await query

    type BookingRow = {
        id: string; booking_ref: string; status: string; total_pence: number | null
        ticket_subtotal_pence: number | null; booking_fee_pence: number | null
        payment_method: string | null; created_at: string; confirmed_at: string | null
        user_id: string | null
        profiles: { full_name: string | null; email: string | null } | null
        event: { title: string } | null
    }

    return (
        <AdminBookingsClient
            bookings={(bookings || []) as unknown as BookingRow[]}
            refunds={[]}
            totalRows={count ?? 0}
            page={page}
            pageSize={pageSize}
            tab="all"
        />
    )
}

type RefundRow = {
    id: string; status: string; reason: string; message: string | null; created_at: string
    booking: {
        id: string; booking_ref: string; total_pence: number | null; user_id: string | null
        profiles: { full_name: string | null; email: string | null } | null
        event: { title: string } | null
    } | null
}
