import { timingSafeEqual } from 'crypto'

export const CONNECT_STATE_COOKIE = 'hx_connect_state'

/**
 * True only when the OAuth `state` returned by Stripe matches the one-time value this browser was
 * given when it started the flow, and that value was issued to the same user.
 */
export function isValidConnectState(cookieValue: string | undefined, state: string | null, userId: string): boolean {
    if (!cookieValue || !state) return false
    const dot = cookieValue.indexOf('.')
    if (dot < 0) return false
    const cookieUser = cookieValue.slice(0, dot)
    const cookieState = cookieValue.slice(dot + 1)
    if (cookieUser !== userId) return false
    const a = Buffer.from(cookieState)
    const b = Buffer.from(state)
    return a.length === b.length && a.length >= 32 && timingSafeEqual(a, b)
}

/** acct_1AbC…xyz → acct_…xyz (enough to recognise, not to reuse) */
export function maskAccountId(id: string | null | undefined): string | null {
    if (!id) return null
    return id.length > 8 ? `acct_…${id.slice(-4)}` : 'acct_…'
}
