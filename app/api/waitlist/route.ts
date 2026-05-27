import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const event_id = searchParams.get('event_id')

    if (!event_id) {
        return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ onWaitlist: false })
    }

    const adminClient = createAdminClient()
    const { data } = await adminClient
        .from('waitlist')
        .select('id')
        .eq('event_id', event_id)
        .eq('user_id', user.id)
        .maybeSingle()

    return NextResponse.json({ onWaitlist: !!data })
}

export async function POST(request: Request) {
    const body = await request.json()
    const { event_id } = body as { event_id: string }

    if (!event_id) {
        return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Duplicate check
    const { data: existing } = await adminClient
        .from('waitlist')
        .select('id')
        .eq('event_id', event_id)
        .eq('user_id', user.id)
        .maybeSingle()

    if (existing) {
        return NextResponse.json({ success: true, alreadyJoined: true })
    }

    const { error } = await adminClient
        .from('waitlist')
        .insert({
            event_id,
            user_id: user.id,
            email: user.email!,
        })

    if (error) {
        return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
    }

    return NextResponse.json({ success: true, alreadyJoined: false })
}
