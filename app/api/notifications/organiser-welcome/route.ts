import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendOrganiserWelcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !user.email) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const orgName = (body?.orgName as string | undefined)?.trim()
        if (!orgName) {
            return NextResponse.json({ ok: false, error: 'orgName required' }, { status: 400 })
        }

        const serviceClient = createServiceClient()
        const { data: profile } = await serviceClient
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

        const fullName = (profile?.full_name as string | null) || user.email.split('@')[0]

        await sendOrganiserWelcomeEmail({
            to: user.email,
            fullName,
            orgName,
        })

        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ ok: false })
    }
}
