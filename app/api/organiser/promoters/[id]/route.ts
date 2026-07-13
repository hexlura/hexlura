import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { sendPromoterInviteEmail } from '@/lib/email'

async function loadAssignment(adminClient: ReturnType<typeof createAdminClient>, id: string) {
    const { data } = await adminClient
        .from('promoter_event_assignments')
        .select(`
            id, organiser_id, event_id, status, commission_percent, invited_email, invite_token, promoter_id,
            event:events(title, slug, start_at, organiser:organiser_profiles(org_name)),
            promoter:promoter_profiles(user_id, display_name)
        `)
        .eq('id', id)
        .maybeSingle()
    return data as unknown as {
        id: string
        organiser_id: string
        event_id: string
        status: string
        commission_percent: number
        invited_email: string | null
        invite_token: string | null
        promoter_id: string | null
        event: { title: string; slug: string; start_at: string; organiser: { org_name: string } | null } | null
        promoter: { user_id: string; display_name: string } | null
    } | null
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const assignment = await loadAssignment(adminClient, params.id)
    if (!assignment || assignment.organiser_id !== organiserId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({})) as {
        commission_percent?: number
        resend?: boolean
        action?: 'approve' | 'decline'
    }

    // Approve / decline a self-service "Promote this event" request
    if (body.action === 'approve' || body.action === 'decline') {
        if (assignment.status !== 'requested') {
            return NextResponse.json({ error: 'Only pending requests can be approved or declined' }, { status: 400 })
        }

        if (body.action === 'approve') {
            if (typeof body.commission_percent !== 'number' || body.commission_percent < 0 || body.commission_percent > 100) {
                return NextResponse.json({ error: 'Commission must be 0–100' }, { status: 400 })
            }
            const { error } = await adminClient
                .from('promoter_event_assignments')
                .update({
                    status: 'active',
                    commission_percent: body.commission_percent,
                    accepted_at: new Date().toISOString(),
                })
                .eq('id', params.id)
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })

            if (assignment.promoter?.user_id) {
                void adminClient.from('notifications').insert({
                    user_id: assignment.promoter.user_id,
                    type: 'promoter_request_approved',
                    title: 'Promotion request approved',
                    body: `You can now promote ${assignment.event?.title || 'the event'} at ${body.commission_percent}% commission. Grab your link!`,
                    link: '/promoter/links',
                })
            }
            return NextResponse.json({ success: true })
        }

        // decline
        const { error } = await adminClient
            .from('promoter_event_assignments')
            .update({ status: 'declined' })
            .eq('id', params.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        if (assignment.promoter?.user_id) {
            void adminClient.from('notifications').insert({
                user_id: assignment.promoter.user_id,
                type: 'promoter_request_declined',
                title: 'Promotion request declined',
                body: `The organiser declined your request to promote ${assignment.event?.title || 'the event'}.`,
                link: assignment.event?.slug ? `/events/${assignment.event.slug}` : '/events',
            })
        }
        return NextResponse.json({ success: true })
    }

    if (body.resend) {
        if (assignment.status !== 'invited' || !assignment.invited_email || !assignment.invite_token) {
            return NextResponse.json({ error: 'Only pending invitations can be resent' }, { status: 400 })
        }
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hexlura.com'
        const acceptUrl = `${appUrl}/promoter/invite/accept?token=${assignment.invite_token}`
        const eventDate = assignment.event ? new Date(assignment.event.start_at).toLocaleDateString('en-GB', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        }) : ''
        void sendPromoterInviteEmail({
            to: assignment.invited_email,
            orgName: assignment.event?.organiser?.org_name || 'A Hexlura organiser',
            eventName: assignment.event?.title || 'this event',
            eventDate,
            commissionPercent: assignment.commission_percent,
            acceptUrl,
            isPromoter: !!assignment.promoter_id,
        })
        return NextResponse.json({ success: true })
    }

    if (typeof body.commission_percent === 'number') {
        if (body.commission_percent < 0 || body.commission_percent > 100) {
            return NextResponse.json({ error: 'Commission must be 0–100' }, { status: 400 })
        }
        const { error } = await adminClient
            .from('promoter_event_assignments')
            .update({ commission_percent: body.commission_percent })
            .eq('id', params.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const assignment = await loadAssignment(adminClient, params.id)
    if (!assignment || assignment.organiser_id !== organiserId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error } = await adminClient
        .from('promoter_event_assignments')
        .update({ status: 'removed' })
        .eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
}
