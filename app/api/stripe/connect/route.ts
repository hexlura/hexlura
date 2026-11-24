import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'
import { CONNECT_STATE_COOKIE } from '@/lib/stripe-connect-state'

export async function GET() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/auth/login', appUrl))

    const adminClient = createAdminClient()

    // Gate behind the platform-wide kill-switch
    const { data: setting } = await adminClient
        .from('platform_settings')
        .select('value')
        .eq('key', 'stripe_connect_enabled')
        .maybeSingle()

    if (!setting || setting.value !== 'true') {
        return NextResponse.redirect(`${appUrl}/organiser/settings?error=stripe_connect_disabled`)
    }

    // Gate behind the per-organiser allowlist — admin must explicitly grant access
    const { data: orgProfile } = await adminClient
        .from('organiser_profiles')
        .select('stripe_connect_allowed')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!orgProfile?.stripe_connect_allowed) {
        return NextResponse.redirect(`${appUrl}/organiser/settings?error=stripe_connect_not_allowed`)
    }

    // Validate required env var before redirecting to Stripe
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID
    if (!clientId) {
        console.error('STRIPE_CONNECT_CLIENT_ID is not configured')
        return NextResponse.redirect(`${appUrl}/organiser/settings?error=stripe_connect_misconfigured`)
    }

    // One-time random state, bound to this browser by an httpOnly cookie. The callback only accepts
    // a code whose state matches the cookie, so a link carrying someone else's OAuth code (which
    // would attach *their* Stripe account to this organiser) is rejected.
    const state = randomBytes(32).toString('hex')

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: 'read_write',
        redirect_uri: `${appUrl}/api/stripe/connect/callback`,
        state,
        'stripe_user[business_type]': 'individual',
        'stripe_user[country]': 'GB',
    })

    const res = NextResponse.redirect(`https://connect.stripe.com/oauth/authorize?${params.toString()}`)
    res.cookies.set(CONNECT_STATE_COOKIE, `${user.id}.${state}`, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax', // sent on Stripe's top-level redirect back to us
        path: '/api/stripe/connect',
        maxAge: 15 * 60,
    })
    return res
}
