import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  max: number
}

const store = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(config: RateLimitConfig) {
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
export const checkoutLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 }) // 10 per minute
export const promoLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 }) // 20 per hour
export const checkinLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 }) // 60 per minute
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }) // 10 per 15 minutes
