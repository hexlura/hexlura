import DOMPurify from 'isomorphic-dompurify'

// Stored rich text (event descriptions, legal documents) is written by organisers/admins and
// rendered with dangerouslySetInnerHTML. Organisers write events straight from the browser, so the
// stored value can be anything — it must be cleaned at render time, every time.
//
// The allowlist covers everything the TipTap editor produces (checked against live data).

const ALLOWED_TAGS = [
    'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'span',
    'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a',
]
const ALLOWED_ATTR = ['href', 'class', 'style']

let hooked = false
function ensureLinkHook() {
    if (hooked) return
    hooked = true
    // DOMPurify drops `target`, so set it here: external links open in a new tab (as the editor
    // intends) without getting a handle on this page.
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (node.tagName === 'A' && /^https?:/i.test(node.getAttribute('href') || '')) {
            node.setAttribute('target', '_blank')
            node.setAttribute('rel', 'noopener noreferrer nofollow')
        }
    })
}

export function sanitizeRichText(html: string | null | undefined): string {
    if (!html) return ''
    ensureLinkHook()
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
    })
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
