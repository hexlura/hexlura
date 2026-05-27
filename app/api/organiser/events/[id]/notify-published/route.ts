import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { sendEventPublishedEmail } from '@/lib/email'

// Fires the one-time "your event is live" email + in-app notification to the
// organiser. Idempotent: uses events.published_email_sent_at as a marker so
// re-publishes / retries never double-send.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()

    const { data: event } = await adminClient
        .from('events')
        .select('id, title, slug, start_at, venue_name, status, organiser_id, published_email_sent_at')
        .eq('id', params.id)
        .single()

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (event.organiser_id !== organiserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only fire when the event is actually published, and only once ever.
    if (event.status !== 'published') {
        return NextResponse.json({ skipped: 'not_published' })
    }
    if (event.published_email_sent_at) {
        return NextResponse.json({ skipped: 'already_sent' })
    }

    // Claim the send slot first to prevent a concurrent retry from double-sending.
    const now = new Date().toISOString()
    const { data: claimed, error: claimErr } = await adminClient
        .from('events')
        .update({ published_email_sent_at: now })
        .eq('id', event.id)
        .is('published_email_sent_at', null)
        .select('id')
        .single()

    if (claimErr || !claimed) {
        // Another request beat us to it.
        return NextResponse.json({ skipped: 'race' })
    }

    // Read organiser contact info via the user-id linked to organiser_profiles.
    const { data: organiserProfile } = await adminClient
        .from('organiser_profiles')
        .select('user_id, org_name')
        .eq('id', event.organiser_id)
        .single()

    let toEmail: string | null = null
    let fullName: string | null = null
    if (organiserProfile?.user_id) {
        const { data: { user: orgUser } } = await adminClient.auth.admin.getUserById(organiserProfile.user_id)
        toEmail = orgUser?.email ?? null

        const { data: profile } = await adminClient
            .from('profiles')
            .select('full_name')
            .eq('id', organiserProfile.user_id)
            .single()
        fullName = profile?.full_name ?? null
    }

    // In-app notification on the organiser's account.
    if (organiserProfile?.user_id) {
        await adminClient.from('notifications').insert({
            user_id: organiserProfile.user_id,
            type: 'event_published',
            title: 'Your event is live',
            body: `${event.title} is now visible to buyers.`,
            link: `/organiser/events/${event.id}`,
        })
    }

    if (toEmail) {
        await sendEventPublishedEmail({
            to: toEmail,
            fullName: fullName || organiserProfile?.org_name || 'there',
            eventTitle: event.title,
            eventStart: new Date(event.start_at),
            venueName: event.venue_name,
            eventSlug: event.slug,
            eventId: event.id,
        })
    }

    return NextResponse.json({ sent: true })
}
