import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUniqueReferralCode } from '@/lib/promoter-access'
import { promoLimiter, getIP } from '@/lib/rate-limit'

// "Promote this event" — a user asks the organiser for permission to promote.
// Creates (or reuses) the caller's promoter profile and inserts a
// promoter_event_assignments row with status 'requested'. Approval flips it to
// 'active' (see /api/organiser/promoters/[id]), after which the existing
// referral/commission machinery applies unchanged.
export async function POST(request: NextRequest) {
    const ip = getIP(request)
    const { success } = promoLimiter(ip)
    if (!success) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({})) as { event_id?: string }
    const eventId = body.event_id?.trim()
    if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

    const adminClient = createAdminClient()

    const { data: eventRaw } = await adminClient
        .from('events')
        .select('id, title, status, end_at, organiser_id, organiser:organiser_profiles(user_id, org_name)')
        .eq('id', eventId)
        .single()

    type EventRow = {
        id: string; title: string; status: string; end_at: string | null; organiser_id: string
        organiser: { user_id: string; org_name: string } | null
    }
    const event = eventRaw as unknown as EventRow | null
    if (!event || event.status !== 'published') {
        return NextResponse.json({ error: 'Event not found or not open for promotion' }, { status: 404 })
    }
    if (event.end_at && new Date() > new Date(event.end_at)) {
        return NextResponse.json({ error: 'This event has ended' }, { status: 400 })
    }
    if (event.organiser?.user_id === user.id) {
        return NextResponse.json({ error: 'You cannot promote your own event' }, { status: 400 })
    }

    // Get or silently create the caller's promoter profile
    const { data: existingPromoter } = await adminClient
        .from('promoter_profiles')
        .select('id, display_name, status')
        .eq('user_id', user.id)
        .maybeSingle()

    if (existingPromoter?.status === 'suspended') {
        return NextResponse.json({ error: 'Your promoter account is suspended' }, { status: 403 })
    }

    let promoterId = existingPromoter?.id ?? null
    let displayName = existingPromoter?.display_name ?? ''

    if (!promoterId) {
        const { data: profile } = await adminClient
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single()
        displayName = profile?.full_name?.trim()
            || profile?.email?.split('@')[0]
            || 'Promoter'

        const referralCode = await generateUniqueReferralCode(displayName)
        const { data: created, error: createError } = await adminClient
            .from('promoter_profiles')
            .insert({ user_id: user.id, display_name: displayName, referral_code: referralCode })
            .select('id')
            .single()
        if (createError || !created) {
            return NextResponse.json({ error: 'Could not set up your promoter profile' }, { status: 500 })
        }
        promoterId = created.id
    }

    // Existing relationship with this event?
    const { data: existing } = await adminClient
        .from('promoter_event_assignments')
        .select('id, status')
        .eq('promoter_id', promoterId)
        .eq('event_id', eventId)
        .maybeSingle()

    if (existing) {
        switch (existing.status) {
            case 'requested':
                return NextResponse.json({ status: 'requested' }) // idempotent
            case 'active':
                return NextResponse.json({ status: 'active' })
            case 'invited':
                return NextResponse.json({ status: 'invited' })
            case 'declined':
                return NextResponse.json({ error: 'Your request for this event was declined' }, { status: 403 })
            case 'removed': {
                // Previously removed — allow asking again
                const { error } = await adminClient
                    .from('promoter_event_assignments')
                    .update({ status: 'requested', commission_percent: 0, accepted_at: null })
                    .eq('id', existing.id)
                if (error) return NextResponse.json({ error: 'Could not submit request' }, { status: 500 })
                break
            }
        }
    } else {
        const { error: insertError } = await adminClient
            .from('promoter_event_assignments')
            .insert({
                promoter_id: promoterId,
                event_id: eventId,
                organiser_id: event.organiser_id,
                commission_percent: 0, // organiser sets the real value at approval
                status: 'requested',
            })
        if (insertError) {
            // Unique (promoter_id, event_id) race — another request just landed
            if (insertError.code === '23505') return NextResponse.json({ status: 'requested' })
            return NextResponse.json({ error: 'Could not submit request' }, { status: 500 })
        }
    }

    // Notify the organiser (best-effort)
    if (event.organiser?.user_id) {
        void adminClient.from('notifications').insert({
            user_id: event.organiser.user_id,
            type: 'promoter_request',
            title: 'New promoter request',
            body: `${displayName} wants to promote ${event.title}`,
            link: '/organiser/promoters',
        })
    }

    return NextResponse.json({ status: 'requested' })
}
