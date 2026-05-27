import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { CitiesClient } from './cities-client'

export const dynamic = 'force-dynamic'

export type CityRow = {
    id: string
    name: string
    slug: string
    image_url: string | null
    display_order: number
    is_active: boolean
    created_at: string
}

export default async function AdminCitiesPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') redirect('/')

    const { data: cities } = await adminClient
        .from('cities')
        .select('*')
        .order('display_order', { ascending: true })

    return <CitiesClient cities={(cities || []) as CityRow[]} />
}
