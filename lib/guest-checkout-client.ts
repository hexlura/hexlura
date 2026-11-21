/**
 * Browser-side check of the admin "guest checkout" switch. Read live from a no-store
 * endpoint (the event page is cached, so the flag can't be baked into it).
 * Any failure counts as "disabled" — the server routes enforce the same rule.
 */
export async function fetchGuestCheckoutEnabled(): Promise<boolean> {
    try {
        const res = await fetch('/api/settings/guest-checkout', { cache: 'no-store' })
        if (!res.ok) return false
        const data = await res.json()
        return data?.enabled === true
    } catch {
        return false
    }
}
