import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
    _request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    // Verify organiser ownership
    const { data: organiser } = await adminClient
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) return NextResponse.json({ error: 'Not an organiser' }, { status: 403 })

    // Fetch the comp code to verify it exists and is complimentary
    const { data: compCode } = await adminClient
        .from('promo_codes')
        .select('id, event_id, is_complimentary')
        .eq('id', params.id)
        .eq('is_complimentary', true)
        .single()

    if (!compCode) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Verify the event belongs to this organiser
    const { data: event } = await adminClient
        .from('events').select('id').eq('id', compCode.event_id).eq('organiser_id', organiser.id).single()
    if (!event) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await adminClient.from('promo_codes').delete().eq('id', params.id)

    return NextResponse.json({ success: true })
}
