import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get organiser profile
    const serviceClient = createServiceClient()
    const { data: organiser } = await serviceClient
        .from('organiser_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!organiser) return NextResponse.json({ error: 'Not an organiser' }, { status: 403 })

    const body = await request.json() as {
        refund_request_id: string
        action: 'approve' | 'reject'
        organiser_note?: string
    }
    const { refund_request_id, action, organiser_note } = body

    if (!refund_request_id || !action) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (action !== 'approve' && action !== 'reject') {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Fetch refund request with booking → event to verify organiser ownership
    const { data: refundReq } = await adminClient
        .from('refund_requests')
        .select('id, status, booking:bookings ( event:events ( organiser_id ) )')
        .eq('id', refund_request_id)
        .single()

    if (!refundReq) return NextResponse.json({ error: 'Refund request not found' }, { status: 404 })

    // Verify ownership
    const bookingData = refundReq.booking as unknown as { event: { organiser_id: string } | null } | null
    const eventOrganiserId = bookingData?.event?.organiser_id
    if (eventOrganiserId !== organiser.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check current status is pending
    if (refundReq.status !== 'pending') {
        return NextResponse.json({ error: 'Refund request is not in pending status' }, { status: 400 })
    }

    if (action === 'approve') {
        await adminClient
            .from('refund_requests')
            .update({ status: 'organiser_approved' })
            .eq('id', refund_request_id)
    } else {
        await adminClient
            .from('refund_requests')
            .update({
                status: 'organiser_rejected',
                organiser_note: organiser_note || null,
            })
            .eq('id', refund_request_id)
    }

    return NextResponse.json({ success: true })
}
