import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const connectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    if (!connectSecret) {
        console.error('STRIPE_CONNECT_WEBHOOK_SECRET is not set')
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    let event: Stripe.Event

    try {
        event = getStripe().webhooks.constructEvent(body, signature, connectSecret)
    } catch (err) {
        console.error('Connect webhook signature verification failed:', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'account.updated') {
        const account = event.data.object as Stripe.Account

        console.log('Connect account.updated received:', account.id, {
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
        })

        try {
            const adminClient = createAdminClient()
            const { error } = await adminClient
                .from('organiser_profiles')
                .update({
                    stripe_charges_enabled: account.charges_enabled ?? false,
                    stripe_payouts_enabled: account.payouts_enabled ?? false,
                })
                .eq('stripe_account_id', account.id)

            if (error) {
                console.error('Failed to update organiser Connect status:', error.message)
            }
        } catch (err) {
            console.error('Error handling connect account.updated:', err)
        }
    }

    return NextResponse.json({ received: true }, { status: 200 })
}
