import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePromoterId } from '@/lib/promoter-access'

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const promoterId = await resolvePromoterId(user.id)
    if (!promoterId) {
        return NextResponse.json({ error: 'You must become a promoter first', needsSignup: true }, { status: 400 })
    }

    const body = await request.json().catch(() => ({})) as { token?: string }
    const token = body.token?.trim()
    if (!token) return NextResponse.json({ error: 'Missing invite token' }, { status: 400 })

    const adminClient = createAdminClient()

    const { data: promoterProfile } = await adminClient
        .from('promoter_profiles')
        .select('status')
        .eq('id', promoterId)
        .single()
    if (promoterProfile?.status === 'suspended') {
        return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 })
    }

    const { data: assignment } = await adminClient
        .from('promoter_event_assignments')
        .select('id, status, event_id')
        .eq('invite_token', token)
        .maybeSingle()

    if (!assignment) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

    if (assignment.status === 'active') {
        return NextResponse.json({ success: true, alreadyAccepted: true, eventId: assignment.event_id })
    }
    if (assignment.status === 'removed') {
        return NextResponse.json({ error: 'This invitation has been withdrawn' }, { status: 400 })
    }

    // Make sure this promoter isn't already linked to the event via a different row
    const { data: existing } = await adminClient
        .from('promoter_event_assignments')
        .select('id')
        .eq('promoter_id', promoterId)
        .eq('event_id', assignment.event_id)
        .maybeSingle()

    if (existing && existing.id !== assignment.id) {
        // Already had an assignment — drop this duplicate invite
        await adminClient.from('promoter_event_assignments').update({ status: 'removed' }).eq('id', assignment.id)
        return NextResponse.json({ success: true, alreadyAccepted: true, eventId: assignment.event_id })
    }

    const { error } = await adminClient
        .from('promoter_event_assignments')
        .update({
            promoter_id: promoterId,
            status: 'active',
            accepted_at: new Date().toISOString(),
        })
        .eq('id', assignment.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, eventId: assignment.event_id })
}
