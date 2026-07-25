import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganiserProfile } from '@/lib/get-organiser'

async function getOwnedListId(organiserId: string, listId: string): Promise<string | null> {
    const adminClient = createAdminClient()
    const { data } = await adminClient
        .from('organiser_email_lists')
        .select('id')
        .eq('id', listId)
        .eq('organiser_id', organiserId)
        .single()
    return data?.id ?? null
}

export async function DELETE(req: Request, { params }: { params: { id: string; entryId: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const listId = await getOwnedListId(organiser.id, params.id)
    if (!listId) return NextResponse.json({ error: 'List not found.' }, { status: 404 })

    const adminClient = createAdminClient()
    const { error } = await adminClient
        .from('organiser_email_list_entries')
        .delete()
        .eq('id', params.entryId)
        .eq('list_id', listId)

    if (error) return NextResponse.json({ error: 'Failed to remove entry.' }, { status: 500 })

    return NextResponse.json({ success: true })
}
