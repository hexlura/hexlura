import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganiserProfile } from '@/lib/get-organiser'
import { MAX_CAMPAIGN_RECIPIENTS } from '@/lib/campaign-limits'

const MAX_SUBJECT_LENGTH = 200
const MAX_MESSAGE_LENGTH = 5000

export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { data: campaigns, error } = await adminClient
        .from('organiser_email_campaigns')
        .select('id, subject, status, recipient_count, sent_count, created_at, sent_at, event:events(title, slug), list:organiser_email_lists(name)')
        .eq('organiser_id', organiser.id)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to load campaigns.' }, { status: 500 })

    return NextResponse.json({ campaigns: campaigns || [] })
}

export async function POST(req: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const eventId = typeof body?.eventId === 'string' ? body.eventId : ''
    const listId = typeof body?.listId === 'string' ? body.listId : ''
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''

    if (!eventId || !listId) return NextResponse.json({ error: 'Missing event or list.' }, { status: 400 })
    if (!subject || subject.length > MAX_SUBJECT_LENGTH) {
        return NextResponse.json({ error: `Subject is required (max ${MAX_SUBJECT_LENGTH} characters).` }, { status: 400 })
    }
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json({ error: `Message is required (max ${MAX_MESSAGE_LENGTH} characters).` }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: event } = await adminClient
        .from('events')
        .select('id, title')
        .eq('id', eventId)
        .eq('organiser_id', organiser.id)
        .single()
    if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })

    const { data: list } = await adminClient
        .from('organiser_email_lists')
        .select('id')
        .eq('id', listId)
        .eq('organiser_id', organiser.id)
        .single()
    if (!list) return NextResponse.json({ error: 'List not found.' }, { status: 404 })

    const { count: recipientCount } = await adminClient
        .from('organiser_email_list_entries')
        .select('id', { count: 'exact', head: true })
        .eq('list_id', listId)
        .is('unsubscribed_at', null)

    if (!recipientCount) {
        return NextResponse.json({ error: 'This list has no active (non-unsubscribed) contacts.' }, { status: 400 })
    }
    if (recipientCount > MAX_CAMPAIGN_RECIPIENTS) {
        return NextResponse.json({ error: `This list has ${recipientCount} contacts — campaigns are capped at ${MAX_CAMPAIGN_RECIPIENTS}. Split the list to send.` }, { status: 400 })
    }

    const { data: inserted, error } = await adminClient
        .from('organiser_email_campaigns')
        .insert({
            organiser_id: organiser.id,
            event_id: eventId,
            list_id: listId,
            subject,
            body: message,
            recipient_count: recipientCount,
        })
        .select('id, subject, body, status, recipient_count, created_at')
        .single()

    if (error || !inserted) return NextResponse.json({ error: 'Failed to create campaign draft.' }, { status: 500 })

    return NextResponse.json({ campaign: inserted })
}
