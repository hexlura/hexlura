import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'invalid' }, { status: 400 })

    const adminClient = createAdminClient()
    const { data: invite } = await adminClient
        .from('organiser_team')
        .select('id, privilege, status, organiser:organiser_profiles!organiser_id(org_name)')
        .eq('invite_token', token)
        .maybeSingle()

    if (!invite) return NextResponse.json({ error: 'invalid' }, { status: 404 })
    if (invite.status === 'removed') return NextResponse.json({ error: 'invalid' }, { status: 404 })
    if (invite.status === 'active') return NextResponse.json({ error: 'already_accepted' }, { status: 409 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = invite.organiser as any
    return NextResponse.json({
        id: invite.id,
        privilege: invite.privilege,
        org_name: org?.org_name || 'this organiser',
    })
}
