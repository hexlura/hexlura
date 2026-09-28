import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  max: number
}

export function rateLimit(config: RateLimitConfig) {
  // Own store per limiter instance — a shared module-level Map would let different
  // limiters (e.g. checkoutLimiter and promoLimiter) collide on the same IP, so
  // whichever touched it first would dictate the reset window for both.
  const store = new Map<string, { count: number; resetTime: number }>()

  return function check(identifier: string): { success: boolean; remaining: number } {
    const now = Date.now()
    const key = identifier
    const record = store.get(key)

    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + config.windowMs })
      return { success: true, remaining: config.max - 1 }
    }

    if (record.count >= config.max) {
      return { success: false, remaining: 0 }
    }

    record.count++
    return { success: true, remaining: config.max - record.count }
  }
}

export function getIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return ip
}

// Pre-configured limiters
// Per-IP net for create-intent — generous, anti-abuse only: several shoppers can share
// one IP (NAT/office wifi). checkoutUserLimiter is the cap that targets one shopper.
export const checkoutLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 })
export const checkoutUserLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 }) // 10 per minute, per user
export const promoLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 }) // 20 per hour
export const checkinLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 }) // 60 per minute
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }) // 10 per 15 minutes
