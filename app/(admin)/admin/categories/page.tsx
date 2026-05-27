import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { CategoriesClient } from './categories-client'

export const dynamic = 'force-dynamic'

export type CategoryRow = {
    id: string
    name: string
    slug: string
    image_url: string | null
    display_order: number
    is_active: boolean
    created_at: string
}

export default async function AdminCategoriesPage() {
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

    const { data: categories } = await adminClient
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })

    return <CategoriesClient categories={(categories || []) as CategoryRow[]} />
}
