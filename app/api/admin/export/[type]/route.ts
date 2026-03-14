import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function toCSV(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return ''
    const headers = Object.keys(rows[0])
    const lines = [
        headers.join(','),
        ...rows.map(row =>
            headers.map(h => {
                const val = row[h]
                const str = val == null ? '' : String(val)
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"`
                    : str
            }).join(',')
        )
    ]
    return lines.join('\n')
}

export async function GET(
    _request: NextRequest,
    { params }: { params: { type: string } }
) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let csv = ''
    const { type } = params

    if (type === 'revenue') {
        const { data } = await supabase
            .from('bookings')
            .select('booking_ref, ticket_subtotal_pence, booking_fee_pence, total_pence, status, confirmed_at')
            .eq('status', 'confirmed')
            .order('confirmed_at', { ascending: false })
        csv = toCSV((data || []) as Record<string, unknown>[])
    } else if (type === 'bookings') {
        const { data } = await supabase
            .from('bookings')
            .select('booking_ref, status, ticket_subtotal_pence, booking_fee_pence, total_pence, payment_method, created_at, confirmed_at')
            .order('created_at', { ascending: false })
        csv = toCSV((data || []) as Record<string, unknown>[])
    } else if (type === 'payouts') {
        const { data } = await supabase
            .from('payouts')
            .select('id, gross_pence, fee_pence, net_pence, status, scheduled_at, paid_at, stripe_transfer_id, created_at')
            .order('created_at', { ascending: false })
        csv = toCSV((data || []) as Record<string, unknown>[])
    } else if (type === 'audit-log') {
        const { data } = await supabase
            .from('audit_logs')
            .select('id, action, entity_type, entity_id, actor_id, created_at')
            .order('created_at', { ascending: false })
        csv = toCSV((data || []) as Record<string, unknown>[])
    } else {
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${type}-export.csv"`,
        },
    })
}
