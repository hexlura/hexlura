import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { SettingsClient } from './settings-client'

export default async function AdminSettingsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    const { data: settingsData } = await adminClient
        .from('platform_settings')
        .select('key, value')

    const settings: Record<string, string> = {}
    for (const row of (settingsData || []) as { key: string; value: string }[]) {
        settings[row.key] = row.value
    }

    // Get all platform-wide promo codes (event_id = null)
    const { data: promoCodes } = await adminClient
        .from('promo_codes')
        .select('id, code, discount_type, discount_value, max_uses, uses_count, valid_from, valid_to, created_at')
        .is('event_id', null)
        .order('created_at', { ascending: false })

    type PromoRow = {
        id: string; code: string; discount_type: string; discount_value: number
        max_uses: number | null; uses_count: number; valid_from: string | null; valid_to: string | null; created_at: string
    }

    return (
        <SettingsClient
            settings={settings}
            promoCodes={(promoCodes || []) as PromoRow[]}
        />
    )
}
