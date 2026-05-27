import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { sendPromoterInviteEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({})) as {
        email?: string
        event_id?: string
        commission_percent?: number
    }

    const email = body.email?.trim().toLowerCase()
    const eventId = body.event_id?.trim()
    const commissionPercent = body.commission_percent

    if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (!eventId) {
        return NextResponse.json({ error: 'Event required' }, { status: 400 })
    }
    if (typeof commissionPercent !== 'number' || commissionPercent < 0 || commissionPercent > 100) {
        return NextResponse.json({ error: 'Commission must be 0–100' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Verify the event belongs to this organiser
    const { data: event } = await adminClient
        .from('events')
        .select('id, title, start_at, organiser_id, organiser:organiser_profiles(org_name)')
        .eq('id', eventId)
        .single()

    type EventRow = {
        id: string; title: string; start_at: string; organiser_id: string;
        organiser: { org_name: string } | null
    }
    const evt = event as unknown as EventRow | null
    if (!evt || evt.organiser_id !== organiserId) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if a promoter profile already exists for this email
    const { data: existingUser } = await adminClient
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle()

    let promoterId: string | null = null
    if (existingUser) {
        const { data: prom } = await adminClient
            .from('promoter_profiles')
            .select('id')
            .eq('user_id', existingUser.id)
            .maybeSingle()
        if (prom) promoterId = prom.id
    }

    // Was this promoter (or this email) already on this event?
    if (promoterId) {
        const { data: dup } = await adminClient
            .from('promoter_event_assignments')
            .select('id, status')
            .eq('promoter_id', promoterId)
            .eq('event_id', eventId)
            .maybeSingle()
        if (dup) {
            if (dup.status === 'removed') {
                // Re-activate
                await adminClient
                    .from('promoter_event_assignments')
                    .update({ status: 'active', commission_percent: commissionPercent, accepted_at: new Date().toISOString() })
                    .eq('id', dup.id)
                return NextResponse.json({ success: true, reactivated: true })
            }
            return NextResponse.json({ error: 'This promoter is already assigned to this event' }, { status: 409 })
        }
    } else {
        // No promoter yet — make sure there isn't a pending invite for this email/event combo
        const { data: dupInvite } = await adminClient
            .from('promoter_event_assignments')
            .select('id')
            .eq('event_id', eventId)
            .ilike('invited_email', email)
            .eq('status', 'invited')
            .maybeSingle()
        if (dupInvite) {
            return NextResponse.json({ error: 'An invite for this email + event is already pending' }, { status: 409 })
        }
    }

    // Insert the assignment
    const insertPayload = promoterId
        ? {
            promoter_id: promoterId,
            event_id: eventId,
            organiser_id: organiserId,
            commission_percent: commissionPercent,
            status: 'invited' as const,
            invited_email: email,
            invited_by: user.id,
        }
        : {
            event_id: eventId,
            organiser_id: organiserId,
            commission_percent: commissionPercent,
            status: 'invited' as const,
            invited_email: email,
            invited_by: user.id,
        }

    const { data: created, error } = await adminClient
        .from('promoter_event_assignments')
        .insert(insertPayload)
        .select('id, invite_token')
        .single()

    if (error || !created) {
        return NextResponse.json({ error: error?.message || 'Failed to create assignment' }, { status: 500 })
    }

    // Send invite email — best-effort
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hexlura.com'
    const acceptUrl = `${appUrl}/promoter/invite/accept?token=${created.invite_token}`
    const eventDate = new Date(evt.start_at).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
    void sendPromoterInviteEmail({
        to: email,
        orgName: evt.organiser?.org_name || 'A Hexlura organiser',
        eventName: evt.title,
        eventDate,
        commissionPercent,
        acceptUrl,
        isPromoter: !!promoterId,
    })

    return NextResponse.json({ success: true, id: created.id })
}
