// Pure helpers for the company WhatsApp number — safe to import from both server and client code.
// (The database reader lives in lib/whatsapp.ts, which must stay server-only.)

/**
 * Turn whatever an admin types into WhatsApp's international format: digits only, country code first,
 * no "+" and no leading zeros. Returns null if it can't be a valid number.
 *   "+44 7700 900123"   -> "447700900123"
 *   "07700 900123"      -> "447700900123"   (UK local format; the company is UK based)
 *   "+44 (0)7700 900123"-> "447700900123"   (trunk zero removed)
 *   "0044 7700 900123"  -> "447700900123"
 */
export function normaliseWhatsAppNumber(input: string | null | undefined): string | null {
    if (!input) return null
    // Only digits, "+" and common separators are allowed — anything else (letters etc.) is rejected, not silently dropped.
    if (!/^[\d\s+().-]+$/.test(input.trim())) return null
    let d = input.replace(/\D/g, '')
    if (d.startsWith('00')) d = d.slice(2)
    else if (d.startsWith('0')) d = '44' + d.slice(1)
    if (d.startsWith('440')) d = '44' + d.slice(3)
    if (d.length < 10 || d.length > 15) return null
    return d
}

/** Friendly display, e.g. "+44 7700 900123". */
export function formatWhatsAppNumber(digits: string): string {
    if (digits.startsWith('44') && digits.length === 12) return `+44 ${digits.slice(2, 6)} ${digits.slice(6)}`
    return `+${digits}`
}

/** The click-to-chat link. `message` pre-fills the chat box (optional). */
export function whatsAppLink(digits: string, message?: string | null): string {
    const text = (message ?? '').trim()
    return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export const DEFAULT_WHATSAPP_MESSAGE = 'Hi Hexlura, I have a question.'

/**
 * Used only while the admin has never saved a WhatsApp number (no row in platform_settings), so the
 * company number works from the moment this ships. Saving the field — even saving it blank to turn
 * WhatsApp off — creates the row and overrides this.
 */
export const DEFAULT_COMPANY_WHATSAPP = '447471442401'

export interface WhatsAppSettings {
    /** Digits only, international format. */
    number: string
    /** Pre-filled chat message. */
    message: string
    /** Show the draggable icon on every page (the contact page row shows whenever a number is set). */
    floating: boolean
}
