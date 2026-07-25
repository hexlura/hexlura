import { createAdminClient } from '@/lib/supabase/admin'

export async function getOrganiserProfile(userId: string): Promise<{ id: string; org_name: string } | null> {
    const adminClient = createAdminClient()
    const { data } = await adminClient
        .from('organiser_profiles')
        .select('id, org_name')
        .eq('user_id', userId)
        .single()
    return data
}
