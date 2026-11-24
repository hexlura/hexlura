import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendStripeConnectedEmail } from '@/lib/email'
import Stripe from 'stripe'
import { CONNECT_STATE_COOKIE, isValidConnectState, maskAccountId } from '@/lib/stripe-connect-state'
import { logAuditAction } from '@/lib/audit'
import { notifyAdmins } from '@/lib/notify-admins'

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const code = searchParams.get('code')
    const state = searchParams.get('state') // one-time value issued by /api/stripe/connect
    const error = searchParams.get('error')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Every exit clears the one-time state cookie so it can't be replayed.
    const redirect = (path: string) => {
        const res = NextResponse.redirect(`${appUrl}${path}`)
        res.cookies.set(CONNECT_STATE_COOKIE, '', { path: '/api/stripe/connect', maxAge: 0 })
        return res
    }

    // Verify the caller is authenticated, and that this browser started this exact flow, before any write
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return redirect('/auth/login')
    }
    if (!isValidConnectState(req.cookies.get(CONNECT_STATE_COOKIE)?.value, state, user.id)) {
        return redirect('/organiser/settings?error=stripe_connect_state_mismatch')
    }

    const adminClient = createAdminClient()

    // Gate behind the platform feature flag
    const { data: setting } = await adminClient
        .from('platform_settings')
        .select('value')
        .eq('key', 'stripe_connect_enabled')
        .maybeSingle()

    if (!setting || setting.value !== 'true') {
        return redirect(`/organiser/settings?error=stripe_connect_disabled`)
    }

    const { data: orgProfile } = await adminClient
        .from('organiser_profiles')
        .select('id, org_name, stripe_connect_allowed, stripe_account_id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!orgProfile?.stripe_connect_allowed) {
        return redirect(`/organiser/settings?error=stripe_connect_not_allowed`)
    }

    if (error) {
        return redirect(`/organiser/settings?error=stripe_connect_cancelled`)
    }

    if (!code) {
        return redirect(`/organiser/settings?error=invalid_callback`)
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
        const response = await stripe.oauth.token({ grant_type: 'authorization_code', code })
        const stripeAccountId = response.stripe_user_id as string
        const previousAccountId = (orgProfile.stripe_account_id as string | null) ?? null

        const { error: updateError } = await adminClient
            .from('organiser_profiles')
            .update({ stripe_account_id: stripeAccountId, payout_method: 'stripe_connect' })
            .eq('user_id', user.id)
        if (updateError) {
            console.error('Stripe connect: failed to save account:', updateError.message)
            return redirect(`/organiser/settings?error=stripe_connect_failed`)
        }

        // This decides where ticket money goes — record it and tell admins, especially on a change.
        const changed = !!previousAccountId && previousAccountId !== stripeAccountId
        await logAuditAction({
            actorId: user.id,
            action: changed ? 'stripe_account_changed' : 'stripe_account_connected',
            entityType: 'organiser',
            entityId: orgProfile.id as string,
            metadata: { from: maskAccountId(previousAccountId), to: maskAccountId(stripeAccountId) },
        })
        await notifyAdmins({
            type: 'security_alert',
            title: changed ? 'Organiser Stripe account CHANGED' : 'Organiser connected Stripe',
            body: `${orgProfile.org_name || 'An organiser'} ${changed ? `switched Stripe account ${maskAccountId(previousAccountId)} → ${maskAccountId(stripeAccountId)}` : `connected Stripe account ${maskAccountId(stripeAccountId)}`}. Payouts now go to this account.`,
            link: `/admin/organisers`,
        })

        // Send confirmation email — best-effort
        void (async () => {
            try {
                const { data: profile } = await adminClient
                    .from('profiles')
                    .select('email, full_name')
                    .eq('id', user.id)
                    .single()

                const { data: orgProfileFull } = await adminClient
                    .from('organiser_profiles')
                    .select('org_name')
                    .eq('user_id', user.id)
                    .single()

                if (profile?.email && orgProfileFull?.org_name) {
                    await sendStripeConnectedEmail({
                        to: profile.email,
                        fullName: profile.full_name || orgProfileFull.org_name,
                        orgName: orgProfileFull.org_name,
                    })
                }
            } catch (emailErr) {
                console.error('Failed to send stripe connected email:', emailErr)
            }
        })()

        return redirect(`/organiser/settings?success=stripe_connected`)
    } catch (err) {
        console.error('Stripe connect callback error:', err)
        return redirect(`/organiser/settings?error=stripe_connect_failed`)
    }
}
