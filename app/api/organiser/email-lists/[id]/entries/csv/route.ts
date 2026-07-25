import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganiserProfile } from '@/lib/get-organiser'
import { parseCsvEmails, MAX_ENTRIES_PER_UPLOAD } from '@/lib/email-list'

const MAX_FILE_BYTES = 2 * 1024 * 1024 // 2MB — well beyond MAX_ENTRIES_PER_UPLOAD rows of plain email text

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

    const formData = await req.formData().catch(() => null)
    const file = formData?.get('file')
    if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: 'No CSV file provided.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: 'File too large (max 2MB).' }, { status: 400 })
    }

    const text = await file.text()
    const { valid, invalidCount, truncated } = parseCsvEmails(text)

    if (valid.length === 0) {
        return NextResponse.json({ added: 0, skipped: invalidCount, truncated, message: 'No valid emails found in file.' })
    }

    const adminClient = createAdminClient()
    const { data: inserted, error } = await adminClient
        .from('organiser_email_list_entries')
        .upsert(
            valid.map(email => ({ list_id: listId, email, source: 'csv' as const })),
            { onConflict: 'list_id,email', ignoreDuplicates: true }
        )
        .select('id')

    if (error) return NextResponse.json({ error: 'Failed to import CSV.' }, { status: 500 })

    const added = inserted?.length ?? 0
    const duplicates = valid.length - added

    return NextResponse.json({ added, skipped: invalidCount, duplicates, truncated, capped: valid.length === MAX_ENTRIES_PER_UPLOAD })
}
