import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { OrganiserDetailClient } from './organiser-detail-client'

export default async function AdminOrganiserDetailPage({ params }: { params: { id: string } }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    const { data: organiser } = await adminClient
        .from('organiser_profiles')
        .select(`
            id, org_name, slug, organiser_type, stripe_account_id, stripe_connect_allowed,
            stripe_charges_enabled, stripe_payouts_enabled, payout_method, is_approved,
            is_suspended, identity_status, created_at, approved_at, user_id,
            profiles!organiser_profiles_user_id_fkey (full_name, email)
        `)
        .eq('id', params.id)
        .single()

    if (!organiser) notFound()

    type OrganiserDetail = {
        id: string; org_name: string; slug: string; organiser_type: string | null
        stripe_account_id: string | null; stripe_connect_allowed: boolean
        stripe_charges_enabled: boolean; stripe_payouts_enabled: boolean
        payout_method: string; is_approved: boolean; is_suspended: boolean
        identity_status: 'processing' | 'verified' | 'requires_input' | 'canceled' | null
        created_at: string; approved_at: string | null; user_id: string
        profiles: { full_name: string | null; email: string | null } | null
    }

    return <OrganiserDetailClient organiser={organiser as unknown as OrganiserDetail} />
}
