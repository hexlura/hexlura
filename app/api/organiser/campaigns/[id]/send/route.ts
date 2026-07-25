import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganiserProfile } from '@/lib/get-organiser'
import { signUnsubscribeToken } from '@/lib/email-unsubscribe'
import { sendEventPromoCampaignEmails } from '@/lib/email'
import { logAuditAction } from '@/lib/audit'
import { MAX_CAMPAIGN_RECIPIENTS, MAX_SENDS_PER_EVENT_PER_WEEK } from '@/lib/campaign-limits'

export const maxDuration = 60

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => null)
    if (body?.consentConfirmed !== true) {
        return NextResponse.json({ error: 'You must confirm you have permission to email these contacts.' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: campaign } = await adminClient
        .from('organiser_email_campaigns')
        .select('id, subject, body, status, event_id, list_id, event:events(title, slug)')
        .eq('id', params.id)
        .eq('organiser_id', organiser.id)
        .single()

    if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 })
    if (campaign.status !== 'draft') {
        return NextResponse.json({ error: 'This campaign has already been sent.' }, { status: 409 })
    }

    const event = campaign.event as unknown as { title: string; slug: string } | null
    if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })

    // Rolling 7-day cap on sends to the same event, to block repeat-spamming one list
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: recentSends } = await adminClient
        .from('organiser_email_campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', campaign.event_id)
        .eq('status', 'sent')
        .gte('sent_at', sevenDaysAgo)

    if ((recentSends ?? 0) >= MAX_SENDS_PER_EVENT_PER_WEEK) {
        return NextResponse.json({ error: `You've already sent ${MAX_SENDS_PER_EVENT_PER_WEEK} campaigns for this event in the last 7 days.` }, { status: 429 })
    }

    const { data: entries } = await adminClient
        .from('organiser_email_list_entries')
        .select('id, email')
        .eq('list_id', campaign.list_id)
        .is('unsubscribed_at', null)

    const recipients = entries || []
    if (recipients.length === 0) {
        return NextResponse.json({ error: 'This list has no active contacts to send to.' }, { status: 400 })
    }
    if (recipients.length > MAX_CAMPAIGN_RECIPIENTS) {
        return NextResponse.json({ error: `List has grown beyond ${MAX_CAMPAIGN_RECIPIENTS} contacts — split it before sending.` }, { status: 400 })
    }

    // Atomically claim the draft — the .eq('status', 'draft') filter means only one
    // concurrent request can flip it to 'sending' and get a row back, closing the
    // race where two rapid "Confirm & Send" clicks both pass the earlier status check.
    const { data: claimed } = await adminClient
        .from('organiser_email_campaigns')
        .update({ status: 'sending', consent_confirmed_at: new Date().toISOString(), recipient_count: recipients.length })
        .eq('id', campaign.id)
        .eq('status', 'draft')
        .select('id')
        .single()

    if (!claimed) {
        return NextResponse.json({ error: 'This campaign has already been sent.' }, { status: 409 })
    }

    const sendResults = await sendEventPromoCampaignEmails({
        orgName: organiser.org_name,
        eventTitle: event.title,
        eventSlug: event.slug,
        subject: campaign.subject,
        message: campaign.body,
        replyTo: user.email || 'support@hexlura.com',
        recipients: recipients.map(e => ({ email: e.email, unsubscribeToken: signUnsubscribeToken(e.id) })),
    })

    const sentCount = sendResults.filter(r => r.success).length
    const failedCount = sendResults.length - sentCount

    await adminClient
        .from('organiser_email_campaign_sends')
        .insert(sendResults.map(r => ({
            campaign_id: campaign.id,
            email: r.email,
            status: r.success ? 'sent' as const : 'failed' as const,
            resend_message_id: r.messageId ?? null,
        })))

    await adminClient
        .from('organiser_email_campaigns')
        .update({
            status: sentCount > 0 ? 'sent' : 'failed',
            sent_count: sentCount,
            sent_at: new Date().toISOString(),
        })
        .eq('id', campaign.id)

    await logAuditAction({
        actorId: user.id,
        action: 'organiser_campaign_sent',
        entityType: 'organiser_email_campaign',
        entityId: campaign.id,
        metadata: {
            eventId: campaign.event_id,
            listId: campaign.list_id,
            recipientCount: recipients.length,
            sentCount,
            failedCount,
        },
    })

    return NextResponse.json({ success: true, sent_count: sentCount, failed_count: failedCount })
}
