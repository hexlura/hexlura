import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendStripeConnectedEmail } from '@/lib/email'
import Stripe from 'stripe'

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const code = searchParams.get('code')
    const state = searchParams.get('state') // user_id
    const error = searchParams.get('error')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const adminClient = createAdminClient()

    // Gate behind the platform feature flag
    const { data: setting } = await adminClient
        .from('platform_settings')
        .select('value')
        .eq('key', 'stripe_connect_enabled')
        .maybeSingle()

    if (!setting || setting.value !== 'true') {
        return NextResponse.redirect(`${appUrl}/organiser/settings?error=stripe_connect_disabled`)
    }

    if (state) {
        const { data: orgProfile } = await adminClient
            .from('organiser_profiles')
            .select('stripe_connect_allowed')
            .eq('user_id', state)
            .maybeSingle()

        if (!orgProfile?.stripe_connect_allowed) {
            return NextResponse.redirect(`${appUrl}/organiser/settings?error=stripe_connect_not_allowed`)
        }
    }

    if (error) {
        return NextResponse.redirect(`${appUrl}/organiser/settings?error=stripe_connect_cancelled`)
    }

    if (!code || !state) {
        return NextResponse.redirect(`${appUrl}/organiser/settings?error=invalid_callback`)
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
        const response = await stripe.oauth.token({ grant_type: 'authorization_code', code })
        const stripeAccountId = response.stripe_user_id

        await adminClient
            .from('organiser_profiles')
            .update({ stripe_account_id: stripeAccountId, payout_method: 'stripe_connect' })
            .eq('user_id', state)

        // Send confirmation email — best-effort
        void (async () => {
            try {
                const { data: profile } = await adminClient
                    .from('profiles')
                    .select('email, full_name')
                    .eq('id', state)
                    .single()

                const { data: orgProfile } = await adminClient
                    .from('organiser_profiles')
                    .select('org_name')
                    .eq('user_id', state)
                    .single()

                if (profile?.email && orgProfile?.org_name) {
                    await sendStripeConnectedEmail({
                        to: profile.email,
                        fullName: profile.full_name || orgProfile.org_name,
                        orgName: orgProfile.org_name,
                    })
                }
            } catch (emailErr) {
                console.error('Failed to send stripe connected email:', emailErr)
            }
        })()

        return NextResponse.redirect(`${appUrl}/organiser/settings?success=stripe_connected`)
    } catch (err) {
        console.error('Stripe connect callback error:', err)
        return NextResponse.redirect(`${appUrl}/organiser/settings?error=stripe_connect_failed`)
    }
}
