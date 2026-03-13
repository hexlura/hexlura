import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL!))

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID || ''

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: 'read_write',
        redirect_uri: `${appUrl}/api/stripe/connect/callback`,
        state: user.id,
        'stripe_user[business_type]': 'individual',
        'stripe_user[country]': 'GB',
    })

    return NextResponse.redirect(`https://connect.stripe.com/oauth/authorize?${params.toString()}`)
}
