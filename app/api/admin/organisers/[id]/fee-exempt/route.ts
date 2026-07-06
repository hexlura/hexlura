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

    const { exempt } = await request.json() as { exempt: boolean }
    if (typeof exempt !== 'boolean') {
        return NextResponse.json({ error: 'exempt must be a boolean' }, { status: 400 })
    }

    if (exempt) {
        const { data: organiser } = await adminClient
            .from('organiser_profiles')
            .select('stripe_connect_allowed, stripe_charges_enabled')
            .eq('id', params.id)
            .single()

        if (!organiser?.stripe_connect_allowed || !organiser?.stripe_charges_enabled) {
            return NextResponse.json(
                { error: 'Organiser must have Stripe Connect fully enabled before granting a fee exemption' },
                { status: 400 }
            )
        }
    }

    await adminClient.from('organiser_profiles').update({ fee_exempt: exempt }).eq('id', params.id)

    await logAuditAction({
        actorId: user.id,
        action: exempt ? 'grant_fee_exemption' : 'revoke_fee_exemption',
        entityType: 'organiser',
        entityId: params.id,
    })

    return NextResponse.json({ success: true })
}
