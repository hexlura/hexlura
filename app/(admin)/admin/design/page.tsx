import { createAdminClient } from '@/lib/supabase/admin'
import { DesignClient } from './design-client'

export default async function DesignPage() {
    const adminClient = createAdminClient()
    const { data } = await adminClient
        .from('platform_settings')
        .select('key, value')
        .like('key', 'design_%')

    const settings: Record<string, string> = {}
    for (const row of data ?? []) settings[row.key] = row.value

    return <DesignClient initialSettings={settings} />
}
