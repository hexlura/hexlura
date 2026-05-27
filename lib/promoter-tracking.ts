import { createHash } from 'crypto'

export const REF_COOKIE_NAME = 'hex_ref'
export const REF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

const BOT_UA_PATTERNS = [
    /bot/i, /crawl/i, /spider/i, /slurp/i, /facebookexternalhit/i,
    /whatsapp/i, /telegrambot/i, /discordbot/i, /linkedinbot/i,
    /twitterbot/i, /pinterest/i, /skypeuripreview/i, /vercel/i,
    /preview/i, /headless/i, /lighthouse/i, /pagespeed/i, /gtmetrix/i,
]

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
    if (!userAgent) return true
    return BOT_UA_PATTERNS.some(pattern => pattern.test(userAgent))
}

/**
 * Hash an IP + UA pair into an opaque token.
 * Used to dedupe clicks by visitor without storing raw IPs.
 * The salt ties the hash to this deployment so the token isn't portable.
 */
export function hashVisitor(ip: string | null | undefined, userAgent: string | null | undefined): string {
    const salt = process.env.PROMOTER_CLICK_SALT || 'hexlura-promoter-default-salt'
    return createHash('sha256').update(`${salt}:${ip || ''}:${userAgent || ''}`).digest('hex').slice(0, 32)
}

/**
 * Pull the client IP from common reverse-proxy headers (Vercel sets x-forwarded-for).
 */
export function getClientIp(headers: Headers): string | null {
    const xff = headers.get('x-forwarded-for')
    if (xff) return xff.split(',')[0].trim()
    return headers.get('x-real-ip') || null
}
