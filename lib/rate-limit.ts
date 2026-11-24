import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Shared rate limiting. Counts live in the database (public.rate_limits, migration 084), so every
// Vercel instance sees the same numbers — the previous in-memory Map only counted per instance.
//
// If the database call itself fails, the request is allowed (and the error logged): a limiter
// outage must never lock every user out of login or checkout.

interface RateLimitConfig {
    name: string
    windowMs: number
    max: number
}

export function rateLimit(config: RateLimitConfig) {
    const windowSeconds = Math.max(1, Math.round(config.windowMs / 1000))
    return async function check(identifier: string): Promise<{ success: boolean }> {
        const key = `${config.name}:${(identifier || 'unknown').toLowerCase()}`
        const { data, error } = await createAdminClient().rpc('hit_rate_limit', {
            p_key: key,
            p_window_seconds: windowSeconds,
            p_max: config.max,
        })
        if (error) {
            console.error(`rate limit "${config.name}" check failed — allowing request:`, error.message)
            return { success: true }
        }
        return { success: data !== false }
    }
}

/** Client IP as Vercel reports it. x-real-ip is set by Vercel and can't be supplied by the client. */
export function getIP(request: NextRequest | Request | { headers: Headers }): string {
    const h = request.headers
    const real = h.get('x-real-ip')
    if (real) return real.trim()
    const forwarded = h.get('x-forwarded-for')
    return forwarded ? forwarded.split(',')[0].trim() : 'unknown'
}

// Pre-configured limiters
// Per-IP net for create-intent — generous, anti-abuse only: several shoppers can share
// one IP (NAT/office wifi). checkoutUserLimiter is the cap that targets one shopper.
export const checkoutLimiter = rateLimit({ name: 'checkout-ip', windowMs: 60 * 1000, max: 30 })
export const checkoutUserLimiter = rateLimit({ name: 'checkout-user', windowMs: 60 * 1000, max: 10 })
export const promoLimiter = rateLimit({ name: 'promo-ip', windowMs: 60 * 60 * 1000, max: 20 })
export const promoterRequestLimiter = rateLimit({ name: 'promoter-request-ip', windowMs: 60 * 60 * 1000, max: 20 })
export const checkinLimiter = rateLimit({ name: 'checkin-user', windowMs: 60 * 1000, max: 120 }) // per staff member

// Auth
export const loginIpLimiter = rateLimit({ name: 'login-ip', windowMs: 15 * 60 * 1000, max: 30 })
export const loginEmailLimiter = rateLimit({ name: 'login-email', windowMs: 15 * 60 * 1000, max: 10 })
export const signupIpLimiter = rateLimit({ name: 'signup-ip', windowMs: 60 * 60 * 1000, max: 10 })
export const resetIpLimiter = rateLimit({ name: 'reset-ip', windowMs: 60 * 60 * 1000, max: 10 })
export const resetEmailLimiter = rateLimit({ name: 'reset-email', windowMs: 60 * 60 * 1000, max: 3 })
export const verifyEmailLimiter = rateLimit({ name: 'verify-email', windowMs: 60 * 60 * 1000, max: 3 })

// Forms
export const contactIpLimiter = rateLimit({ name: 'contact-ip', windowMs: 60 * 60 * 1000, max: 5 })
export const supportUserLimiter = rateLimit({ name: 'support-user', windowMs: 60 * 60 * 1000, max: 10 })
