import { createHmac, timingSafeEqual } from 'crypto'

// Signs a list-entry id so the public /api/unsubscribe route can trust it without
// requiring a session — an attacker who guesses/enumerates ids can't forge a token
// without the secret, so they can't unsubscribe someone else's entry.
function getSecret(): string {
    return process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || 'hexlura-unsubscribe-default-secret'
}

export function signUnsubscribeToken(entryId: string): string {
    const sig = createHmac('sha256', getSecret()).update(entryId).digest('hex').slice(0, 32)
    return `${entryId}.${sig}`
}

export function verifyUnsubscribeToken(token: string): string | null {
    const lastDot = token.lastIndexOf('.')
    if (lastDot === -1) return null

    const entryId = token.slice(0, lastDot)
    const providedSig = token.slice(lastDot + 1)
    const expectedSig = createHmac('sha256', getSecret()).update(entryId).digest('hex').slice(0, 32)

    const a = Buffer.from(providedSig)
    const b = Buffer.from(expectedSig)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null

    return entryId
}
