import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganiserProfile } from '@/lib/get-organiser'

async function getOwnedList(organiserId: string, listId: string) {
    const adminClient = createAdminClient()
    const { data } = await adminClient
        .from('organiser_email_lists')
        .select('id, name, created_at')
        .eq('id', listId)
        .eq('organiser_id', organiserId)
        .single()
    return data
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const list = await getOwnedList(organiser.id, params.id)
    if (!list) return NextResponse.json({ error: 'List not found.' }, { status: 404 })

    const adminClient = createAdminClient()
    const { data: entries, error } = await adminClient
        .from('organiser_email_list_entries')
        .select('id, email, source, unsubscribed_at, added_at')
        .eq('list_id', list.id)
        .order('added_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to load entries.' }, { status: 500 })

    return NextResponse.json({ list, entries: entries || [] })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const list = await getOwnedList(organiser.id, params.id)
    if (!list) return NextResponse.json({ error: 'List not found.' }, { status: 404 })

    const adminClient = createAdminClient()
    const { error } = await adminClient
        .from('organiser_email_lists')
        .delete()
        .eq('id', list.id)
        .eq('organiser_id', organiser.id)

    if (error) return NextResponse.json({ error: 'Failed to delete list.' }, { status: 500 })

    return NextResponse.json({ success: true })
}
