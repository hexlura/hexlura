import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganiserProfile } from '@/lib/get-organiser'
import { parseEmailBlob, MAX_ENTRIES_PER_UPLOAD } from '@/lib/email-list'

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

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const listId = await getOwnedListId(organiser.id, params.id)
    if (!listId) return NextResponse.json({ error: 'List not found.' }, { status: 404 })

    const body = await req.json().catch(() => null)
    const raw = typeof body?.emails === 'string' ? body.emails : ''
    if (!raw.trim()) return NextResponse.json({ error: 'No emails provided.' }, { status: 400 })

    const { valid, invalidCount } = parseEmailBlob(raw)
    if (valid.length > MAX_ENTRIES_PER_UPLOAD) {
        return NextResponse.json({ error: `Too many emails at once (max ${MAX_ENTRIES_PER_UPLOAD}).` }, { status: 400 })
    }
    if (valid.length === 0) {
        return NextResponse.json({ added: 0, skipped: invalidCount, message: 'No valid new emails found.' })
    }

    const adminClient = createAdminClient()
    const { data: inserted, error } = await adminClient
        .from('organiser_email_list_entries')
        .upsert(
            valid.map(email => ({ list_id: listId, email, source: 'manual' as const })),
            { onConflict: 'list_id,email', ignoreDuplicates: true }
        )
        .select('id')

    if (error) return NextResponse.json({ error: 'Failed to add emails.' }, { status: 500 })

    const added = inserted?.length ?? 0
    const duplicates = valid.length - added

    return NextResponse.json({ added, skipped: invalidCount, duplicates })
}
