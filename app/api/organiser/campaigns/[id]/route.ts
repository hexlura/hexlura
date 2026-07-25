import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganiserProfile } from '@/lib/get-organiser'

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { data: campaign, error } = await adminClient
        .from('organiser_email_campaigns')
        .select('id, subject, body, status, recipient_count, sent_count, created_at, sent_at, event:events(title, slug), list:organiser_email_lists(name)')
        .eq('id', params.id)
        .eq('organiser_id', organiser.id)
        .single()

    if (error || !campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 })

    return NextResponse.json({ campaign })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { error } = await adminClient
        .from('organiser_email_campaigns')
        .delete()
        .eq('id', params.id)
        .eq('organiser_id', organiser.id)
        .eq('status', 'draft')

    if (error) return NextResponse.json({ error: 'Failed to discard draft.' }, { status: 500 })

    return NextResponse.json({ success: true })
}
