import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { render } from '@react-email/components'
import RefundAdminReview from '@/emails/refund-admin-review'
import { Resend } from 'resend'

function getResend() {
    return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

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
        .select('id, status, reason, refund_amount_pence, user_id, booking:bookings ( id, booking_ref, booking_fee_pence, event:events ( title, organiser_id ) )')
        .eq('id', refund_request_id)
        .single()

    if (!refundReq) return NextResponse.json({ error: 'Refund request not found' }, { status: 404 })

    // Verify ownership
    const bookingData = refundReq.booking as unknown as { id: string; booking_ref: string; booking_fee_pence: number; event: { title: string; organiser_id: string } | null } | null
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

        // Notify admin of refund awaiting review
        void (async () => {
            try {
                // Get organiser name
                const { data: orgProfile } = await adminClient
                    .from('organiser_profiles')
                    .select('org_name')
                    .eq('id', organiser.id)
                    .single()

                // Get buyer name and email
                const buyerUserId = refundReq.user_id as string | null
                let buyerName = 'Customer'
                let buyerEmail = ''

                if (buyerUserId) {
                    const { data: buyerProfile } = await adminClient
                        .from('profiles')
                        .select('full_name')
                        .eq('id', buyerUserId)
                        .single()
                    if (buyerProfile?.full_name) buyerName = buyerProfile.full_name

                    const { data: { user: buyerUser } } = await adminClient.auth.admin.getUserById(buyerUserId)
                    if (buyerUser?.email) buyerEmail = buyerUser.email
                }

                const refundAmountPence = (refundReq.refund_amount_pence as number | null) ?? 0
                const feeKeptPence = (bookingData?.booking_fee_pence as number | null) ?? 0

                const html = await render(RefundAdminReview({
                    eventName: bookingData?.event?.title || 'Unknown Event',
                    organiserName: orgProfile?.org_name || 'Organiser',
                    buyerName,
                    buyerEmail,
                    bookingRef: bookingData?.booking_ref || refund_request_id,
                    refundAmount: `£${(refundAmountPence / 100).toFixed(2)}`,
                    feeKept: `£${(feeKeptPence / 100).toFixed(2)}`,
                    reviewUrl: 'https://www.hexlura.com/admin/refunds',
                }))

                await getResend().emails.send({
                    from: 'Hexlura <noreply@hexlura.com>',
                    to: 'support@hexlura.com',
                    subject: `Refund awaiting review — ${bookingData?.booking_ref || refund_request_id}`,
                    html,
                })
            } catch (err) {
                console.error('Failed to send refund admin review email:', err)
            }
        })()
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
