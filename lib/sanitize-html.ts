import sanitize from 'sanitize-html'

// Stored rich text (event descriptions, legal documents) is written by organisers/admins and
// rendered with dangerouslySetInnerHTML. Organisers write events straight from the browser, so the
// stored value can be anything — it must be cleaned at render time, every time.
//
// Uses sanitize-html (pure JS). isomorphic-dompurify needs jsdom on the server, which fails to load
// in Vercel serverless functions and took down every page that rendered rich text.
//
// The allowlist covers everything the TipTap editor produces (checked against live data).

const OPTIONS: sanitize.IOptions = {
    allowedTags: [
        'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'span',
        'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a',
    ],
    allowedAttributes: {
        '*': ['class', 'style'],
        a: ['href'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    // Inline styles only for simple text formatting — no url(), positioning or overlays.
    allowedStyles: {
        '*': {
            'color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
            'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
            'text-align': [/^(left|right|center|justify)$/],
            'font-weight': [/^(normal|bold|[1-9]00)$/],
            'font-style': [/^(normal|italic)$/],
            'text-decoration': [/^[a-z\s-]+$/],
        },
    },
    transformTags: {
        // External links open in a new tab without getting a handle on this page.
        a: (tagName, attribs) => {
            const href = attribs.href || ''
            if (/^https?:/i.test(href)) {
                return { tagName, attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' } }
            }
            return { tagName, attribs }
        },
    },
}
// target/rel are only ever set by transformTags above, never taken from the input.
OPTIONS.allowedAttributes = { ...(OPTIONS.allowedAttributes as Record<string, string[]>), a: ['href', 'target', 'rel'] }

export function sanitizeRichText(html: string | null | undefined): string {
    if (!html) return ''
    return sanitize(html, OPTIONS)
}

/** Escape text for interpolation into a raw HTML string (emails, invoices). */
export function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
