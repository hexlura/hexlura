import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganiserProfile } from '@/lib/get-organiser'

// Minimal event picker data for organiser-facing forms (e.g. campaign composer)
// that just need id/title/slug, not the full event record.
export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organiser = await getOrganiserProfile(user.id)
    if (!organiser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { data: events, error } = await adminClient
        .from('events')
        .select('id, title, slug')
        .eq('organiser_id', organiser.id)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to load events.' }, { status: 500 })

    return NextResponse.json({ events: events || [] })
}
