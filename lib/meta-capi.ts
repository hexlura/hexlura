import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const GRAPH_VERSION = 'v21.0'

export interface MetaUserData {
    email?: string | null
    phone?: string | null
    fullName?: string | null
    externalId?: string | null
    fbp?: string | null
    fbc?: string | null
    ip?: string | null
    userAgent?: string | null
}

export interface MetaEventInput {
    eventName: 'Purchase' | 'Lead' | 'CompleteRegistration' | 'InitiateCheckout' | 'AddToCart'
    /** Must equal the browser Pixel's eventID for the same action, or Meta double-counts. */
    eventId: string
    sourceUrl?: string | null
    user: MetaUserData
    custom?: Record<string, unknown>
}

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex')
}

/** Meta wants lowercase, trimmed values hashed with SHA-256. */
function hashNorm(value: string | null | undefined): string | undefined {
    const v = value?.trim().toLowerCase()
    return v ? sha256(v) : undefined
}

/** Digits only, with country code. UK national numbers (07…) become 447…. */
function hashPhone(raw: string | null | undefined): string | undefined {
    if (!raw) return undefined
    let digits = raw.replace(/\D/g, '')
    if (!digits) return undefined
    if (digits.startsWith('00')) digits = digits.slice(2)
    else if (digits.startsWith('0')) digits = `44${digits.slice(1)}`
    return sha256(digits)
}

function splitName(fullName: string | null | undefined): { first?: string; last?: string } {
    const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? []
    if (parts.length === 0) return {}
    if (parts.length === 1) return { first: parts[0] }
    return { first: parts[0], last: parts[parts.length - 1] }
}

function buildUserData(user: MetaUserData): Record<string, unknown> {
    const { first, last } = splitName(user.fullName)
    const out: Record<string, unknown> = {}
    const em = hashNorm(user.email)
    const ph = hashPhone(user.phone)
    const fn = hashNorm(first)
    const ln = hashNorm(last)
    const ext = hashNorm(user.externalId)
    if (em) out.em = [em]
    if (ph) out.ph = [ph]
    if (fn) out.fn = [fn]
    if (ln) out.ln = [ln]
    if (ext) out.external_id = [ext]
    if (user.fbp) out.fbp = user.fbp
    if (user.fbc) out.fbc = user.fbc
    if (user.ip) out.client_ip_address = user.ip
    if (user.userAgent) out.client_user_agent = user.userAgent
    return out
}

async function getPixelId(): Promise<string> {
    const { data, error } = await createAdminClient()
        .from('platform_settings')
        .select('value')
        .eq('key', 'meta_pixel_id')
        .maybeSingle()
    if (error) {
        console.error('[meta-capi] could not read meta_pixel_id:', error.message)
        return ''
    }
    return (data?.value as string | undefined)?.trim() || ''
}

/**
 * Server-side Conversions API event. Best-effort: never throws, because a tracking
 * failure must never fail a booking that has already been paid for.
 * Needs META_CAPI_ACCESS_TOKEN (Events Manager → Settings → Conversions API).
 * Optional META_CAPI_TEST_EVENT_CODE routes events to the Test Events tab.
 */
export async function sendMetaEvent(input: MetaEventInput): Promise<void> {
    try {
        const token = process.env.META_CAPI_ACCESS_TOKEN
        if (!token) {
            console.warn('[meta-capi] META_CAPI_ACCESS_TOKEN not set — skipping', input.eventName)
            return
        }
        const pixelId = await getPixelId()
        if (!pixelId) {
            console.warn('[meta-capi] no meta_pixel_id configured — skipping', input.eventName)
            return
        }

        const payload: Record<string, unknown> = {
            data: [{
                event_name: input.eventName,
                event_time: Math.floor(Date.now() / 1000),
                event_id: input.eventId,
                action_source: 'website',
                event_source_url: input.sourceUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hexlura.com',
                user_data: buildUserData(input.user),
                custom_data: input.custom ?? {},
            }],
        }
        if (process.env.META_CAPI_TEST_EVENT_CODE) {
            payload.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE
        }

        // Token goes in the Authorization header, never the query string (logged by proxies).
        const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) {
            console.error('[meta-capi] Graph API error', res.status, (await res.text()).slice(0, 500))
        }
    } catch (err) {
        console.error('[meta-capi] failed to send', input.eventName, err)
    }
}
