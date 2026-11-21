import { NextResponse } from 'next/server'
import { isGuestCheckoutEnabled } from '@/lib/guest-checkout'

// Public, read-only. Read live (never cached) so the admin toggle takes effect
// immediately — the event page itself is cached for 2 minutes.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
    const enabled = await isGuestCheckoutEnabled()
    return NextResponse.json({ enabled }, { headers: { 'Cache-Control': 'no-store' } })
}
