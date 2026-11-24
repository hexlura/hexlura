// A `next=` value is only followed if it is a plain path on this site.
//
// `startsWith('/')` is not enough: `//evil.com` and `/\evil.com` are read by browsers as another
// host, and appending `@evil.com` to an origin (`https://www.hexlura.com@evil.com`) turns the real
// host into a username. Returns '' for anything that isn't a same-site path.
export function safeNextPath(next: string | null | undefined): string {
    if (!next || typeof next !== 'string') return ''
    if (next.length > 512) return ''
    if (!next.startsWith('/')) return ''
    if (next.startsWith('//') || next.startsWith('/\\')) return ''
    // eslint-disable-next-line no-control-regex
    if (/[\\@\u0000-\u001f\u007f]/.test(next)) return ''
    try {
        const url = new URL(next, 'https://hexlura.invalid')
        if (url.host !== 'hexlura.invalid') return ''
        return url.pathname + url.search + url.hash
    } catch {
        return ''
    }
}
