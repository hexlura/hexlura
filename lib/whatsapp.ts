import { createServiceClient } from '@/lib/supabase/service'
import { DEFAULT_COMPANY_WHATSAPP, DEFAULT_WHATSAPP_MESSAGE, normaliseWhatsAppNumber, type WhatsAppSettings } from '@/lib/whatsapp-shared'

/**
 * Reads the company WhatsApp settings (admin → Settings → WhatsApp). Returns null when no valid number is
 * set, so callers simply render nothing. Server-only: uses the service client, whose fetch bypasses
 * Next.js's data cache, so an admin change is picked up on the next request.
 *
 * Failure policy: a read error must not break every page of the site, so it logs and returns null
 * (the icon/contact row simply don't show) rather than throwing.
 */
export async function getWhatsAppSettings(): Promise<WhatsAppSettings | null> {
    const supabase = createServiceClient()
    const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['whatsapp_number', 'whatsapp_message', 'whatsapp_floating'])

    if (error) {
        console.error('getWhatsAppSettings: platform_settings read failed:', error)
        return null
    }

    const s: Record<string, string> = {}
    for (const row of data ?? []) s[row.key] = row.value

    // No row at all -> the company default. A saved blank -> deliberately off.
    const number = normaliseWhatsAppNumber(s['whatsapp_number'] === undefined ? DEFAULT_COMPANY_WHATSAPP : s['whatsapp_number'])
    if (!number) return null

    return {
        number,
        message: (s['whatsapp_message'] ?? '').trim() || DEFAULT_WHATSAPP_MESSAGE,
        floating: s['whatsapp_floating'] !== 'false',
    }
}
