import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { SeoClient } from './seo-client'
import type { SeoMetadata } from '@/types'

export default async function AdminSeoPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    // Fetch all SEO overrides
    const { data: seoData } = await adminClient
        .from('seo_metadata')
        .select('*')
        .order('page_path')

    // Fetch global SEO defaults from platform_settings
    const { data: settingsData } = await adminClient
        .from('platform_settings')
        .select('key, value')
        .like('key', 'seo_%')

    const globalDefaults: Record<string, string> = {}
    for (const row of (settingsData || []) as { key: string; value: string }[]) {
        globalDefaults[row.key] = row.value
    }

    return (
        <SeoClient
            seoEntries={(seoData || []) as SeoMetadata[]}
            globalDefaults={globalDefaults}
        />
    )
}
