import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    // Verify they are actually an organiser
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'organiser') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Downgrade role back to user
    await adminClient
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', user.id)

    // Mark organiser profile as not approved so they can reapply
    await adminClient
        .from('organiser_profiles')
        .update({ is_approved: false })
        .eq('user_id', user.id)

    return NextResponse.json({ success: true })
}
