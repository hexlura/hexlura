import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganiserProfile } from '@/lib/get-organiser'

const MAX_NAME_LENGTH = 100

export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { data: lists, error } = await adminClient
        .from('organiser_email_lists')
        .select('id, name, created_at, entries:organiser_email_list_entries(count)')
        .eq('organiser_id', organiser.id)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to load lists.' }, { status: 500 })

    const formatted = (lists || []).map(l => ({
        id: l.id,
        name: l.name,
        created_at: l.created_at,
        entry_count: (l.entries as unknown as { count: number }[])?.[0]?.count ?? 0,
    }))

    return NextResponse.json({ lists: formatted })
}

export async function POST(req: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''

    if (!name) return NextResponse.json({ error: 'List name is required.' }, { status: 400 })
    if (name.length > MAX_NAME_LENGTH) return NextResponse.json({ error: 'List name is too long.' }, { status: 400 })

    const adminClient = createAdminClient()
    const { data: inserted, error } = await adminClient
        .from('organiser_email_lists')
        .insert({ organiser_id: organiser.id, name })
        .select('id, name, created_at')
        .single()

    if (error || !inserted) return NextResponse.json({ error: 'Failed to create list.' }, { status: 500 })

    return NextResponse.json({ list: { ...inserted, entry_count: 0 } })
}
