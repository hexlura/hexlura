import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { sendNewEventFollowersEmails } from '@/lib/email'
import { logAuditAction } from '@/lib/audit'

// Notifies every follower of this organiser about one of their events —
// in-app notification always, email only for followers who haven't opted
// out of marketing email (profiles.email_marketing_opt_out). Idempotent:
// events.followers_notified_at is a one-time marker, so this can only ever
// fire once per event, and a concurrent double-click can't double-send.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()

    const { data: event } = await adminClient
        .from('events')
        .select('id, title, slug, start_at, venue_name, status, organiser_id, followers_notified_at')
        .eq('id', params.id)
        .single()

    if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    if (event.organiser_id !== organiserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (event.status !== 'published') {
        return NextResponse.json({ error: 'Publish this event before notifying followers.' }, { status: 400 })
    }
    if (event.followers_notified_at) {
        return NextResponse.json({ error: 'Followers have already been notified about this event.' }, { status: 409 })
    }

    // Atomically claim the one-time send slot to close the double-click race.
    const { data: claimed } = await adminClient
        .from('events')
        .update({ followers_notified_at: new Date().toISOString() })
        .eq('id', event.id)
        .is('followers_notified_at', null)
        .select('id')
        .single()

    if (!claimed) {
        return NextResponse.json({ error: 'Followers have already been notified about this event.' }, { status: 409 })
    }

    const { data: organiserProfile } = await adminClient
        .from('organiser_profiles')
        .select('org_name')
        .eq('id', organiserId)
        .single()
    const orgName = organiserProfile?.org_name || 'An organiser you follow'

    const { data: followRows } = await adminClient
        .from('follows')
        .select('user_id')
        .eq('organiser_id', organiserId)

    const followerIds = (followRows || []).map(f => f.user_id).filter(Boolean) as string[]

    if (followerIds.length === 0) {
        return NextResponse.json({ notified: 0, emailed: 0 })
    }

    const { data: followerProfiles } = await adminClient
        .from('profiles')
        .select('id, email, email_marketing_opt_out')
        .in('id', followerIds)

    const profiles = followerProfiles || []

    // In-app notification: every follower, regardless of email preference.
    await adminClient.from('notifications').insert(
        profiles.map(p => ({
            user_id: p.id,
            type: 'new_event_from_followed',
            title: `${orgName} has a new event`,
            body: event.title,
            link: `/events/${event.slug}`,
        }))
    )

    const emailRecipients = profiles
        .filter(p => !p.email_marketing_opt_out && p.email)
        .map(p => p.email as string)

    let emailed = 0
    if (emailRecipients.length > 0) {
        emailed = await sendNewEventFollowersEmails({
            emails: emailRecipients,
            orgName,
            eventTitle: event.title,
            eventDate: new Date(event.start_at).toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            }),
            venueName: event.venue_name,
            eventSlug: event.slug,
        })
    }

    await logAuditAction({
        actorId: user.id,
        action: 'organiser_notified_followers',
        entityType: 'event',
        entityId: event.id,
        metadata: {
            organiserId,
            followerCount: profiles.length,
            emailed,
        },
    })

    return NextResponse.json({ notified: profiles.length, emailed })
}
