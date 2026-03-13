import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { calculateBookingFee } from '@/lib/fees'

interface CheckoutItem {
    ticket_type_id: string
    quantity: number
}

interface CreateIntentRequest {
    event_id: string
    items: CheckoutItem[]
    promo_code?: string
    attendee_details: {
        full_name: string
        email: string
        phone: string
    }
}

export async function POST(request: Request) {
    const body = (await request.json()) as CreateIntentRequest
    const { event_id, items, promo_code, attendee_details } = body

    if (!event_id || !items?.length || !attendee_details?.full_name || !attendee_details?.email) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify event exists and is published
    const { data: event } = await supabase
        .from('events')
        .select('*, organiser:organiser_profiles(stripe_account_id)')
        .eq('id', event_id)
        .eq('status', 'published')
        .single()

    if (!event) {
        return NextResponse.json({ error: 'Event not found or not available' }, { status: 404 })
    }

    // Verify ticket types and calculate prices server-side
    let ticketSubtotalPence = 0
    let totalBookingFeePence = 0

    for (const item of items) {
        const { data: ticketType } = await supabase
            .from('ticket_types')
            .select('*')
            .eq('id', item.ticket_type_id)
            .eq('event_id', event_id)
            .single()

        if (!ticketType) {
            return NextResponse.json({ error: `Ticket type not found: ${item.ticket_type_id}` }, { status: 400 })
        }

        if (!ticketType.is_visible) {
            return NextResponse.json({ error: `Ticket not available: ${ticketType.name}` }, { status: 400 })
        }

        // Check sale period
        const now = new Date().toISOString()
        if (ticketType.sale_starts_at && now < ticketType.sale_starts_at) {
            return NextResponse.json({ error: `Sales haven't started for: ${ticketType.name}` }, { status: 400 })
        }
        if (ticketType.sale_ends_at && now > ticketType.sale_ends_at) {
            return NextResponse.json({ error: `Sales ended for: ${ticketType.name}` }, { status: 400 })
        }

        // Availability check
        const available = ticketType.quantity_total - ticketType.quantity_sold
        if (item.quantity > available) {
            return NextResponse.json(
                { error: `Tickets no longer available for: ${ticketType.name}` },
                { status: 409 }
            )
        }

        ticketSubtotalPence += ticketType.price_pence * item.quantity
        totalBookingFeePence += calculateBookingFee(ticketType.price_pence, item.quantity)
    }

    // Apply promo code if provided
    let discountPence = 0
    let promoCodeId: string | null = null

    if (promo_code) {
        const { data: promo } = await supabase
            .from('promo_codes')
            .select('*')
            .ilike('code', promo_code)
            .single()

        if (promo) {
            const now = new Date().toISOString()
            const isValid =
                (!promo.valid_from || now >= promo.valid_from) &&
                (!promo.valid_to || now <= promo.valid_to) &&
                (promo.max_uses === null || promo.uses_count < promo.max_uses) &&
                (!promo.event_id || promo.event_id === event_id) &&
                ticketSubtotalPence >= (promo.min_order_pence || 0)

            if (isValid) {
                if (promo.discount_type === 'percent') {
                    discountPence = Math.round(ticketSubtotalPence * promo.discount_value / 100)
                } else {
                    discountPence = promo.discount_value
                }
                discountPence = Math.min(discountPence, ticketSubtotalPence)
                promoCodeId = promo.id
            }
        }
    }

    const totalPence = ticketSubtotalPence - discountPence + totalBookingFeePence

    if (totalPence < 50) {
        return NextResponse.json({ error: 'Order total too low' }, { status: 400 })
    }

    const organiserStripeAccountId = event.organiser?.stripe_account_id || null

    // Create Stripe PaymentIntent
    const paymentIntent = await getStripe().paymentIntents.create({
        amount: totalPence,
        currency: 'gbp',
        automatic_payment_methods: { enabled: true },
        metadata: {
            event_id,
            user_id: user.id,
            organiser_stripe_account_id: organiserStripeAccountId || '',
            ticket_subtotal_pence: String(ticketSubtotalPence),
            booking_fee_pence: String(totalBookingFeePence),
            discount_pence: String(discountPence),
            promo_code_id: promoCodeId || '',
            items: JSON.stringify(items),
            attendee_name: attendee_details.full_name,
            attendee_email: attendee_details.email,
            attendee_phone: attendee_details.phone,
        },
    })

    return NextResponse.json({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
    })
}
