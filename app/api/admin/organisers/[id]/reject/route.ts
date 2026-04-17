import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditAction } from '@/lib/audit'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!adminProfile || adminProfile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { reason } = await request.json() as { reason: string }

    // Get the organiser to find user_id
    const { data: org } = await adminClient.from('organiser_profiles').select('user_id').eq('id', params.id).single()

    // Delete organiser profile
    await adminClient.from('organiser_profiles').delete().eq('id', params.id)

    // Set profile role back to user
    if (org?.user_id) {
        await adminClient.from('profiles').update({ role: 'user' }).eq('id', org.user_id)
    }

    await logAuditAction({
        actorId: user.id,
        action: 'reject_organiser',
        entityType: 'organiser',
        entityId: params.id,
        metadata: { reason },
    })

    // Notify the applicant
    if (org?.user_id) {
        void adminClient.from('notifications').insert({
            user_id: org.user_id,
            type: 'application_rejected',
            title: 'Your organiser application was not approved',
            body: reason || 'Unfortunately your application could not be approved at this time. Contact support for more information.',
            link: '/organiser/apply',
        })
    }

    return NextResponse.json({ success: true })
}
