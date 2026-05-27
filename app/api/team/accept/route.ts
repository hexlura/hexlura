import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { member_id } = await req.json()
    if (!member_id) return NextResponse.json({ error: 'Missing member_id' }, { status: 400 })

    const adminClient = createAdminClient()

    // Verify invite exists and is still pending
    const { data: invite } = await adminClient
        .from('organiser_team')
        .select('id, status, invited_email')
        .eq('id', member_id)
        .maybeSingle()

    if (!invite) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    if (invite.status === 'active') return NextResponse.json({ error: 'Already accepted' }, { status: 409 })
    if (invite.status === 'removed') return NextResponse.json({ error: 'Invitation no longer valid' }, { status: 410 })

    // Ensure the logged-in user is the person who was invited
    if (user.email?.toLowerCase() !== invite.invited_email?.toLowerCase()) {
        return NextResponse.json({ error: 'wrong_account', invited_email: invite.invited_email }, { status: 403 })
    }

    const { error } = await adminClient
        .from('organiser_team')
        .update({ status: 'active', user_id: user.id, accepted_at: new Date().toISOString() })
        .eq('id', member_id)

    if (error) return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
    return NextResponse.json({ success: true })
}
