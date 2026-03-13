import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const code = searchParams.get('code')
    const state = searchParams.get('state') // user_id
    const error = searchParams.get('error')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

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

        const supabase = createClient()
        await supabase
            .from('organiser_profiles')
            .update({ stripe_account_id: stripeAccountId })
            .eq('user_id', state)

        return NextResponse.redirect(`${appUrl}/organiser/settings?success=stripe_connected`)
    } catch (err) {
        console.error('Stripe connect callback error:', err)
        return NextResponse.redirect(`${appUrl}/organiser/settings?error=stripe_connect_failed`)
    }
}
