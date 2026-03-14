import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsersClient } from './users-client'

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: { q?: string; role?: string; status?: string; joined?: string; page?: string }
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const page = Math.max(1, parseInt(searchParams.page ?? '1'))
    const pageSize = 25
    const offset = (page - 1) * pageSize

    let query = supabase
        .from('profiles')
        .select('id, full_name, email, role, is_suspended, is_verified, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

    if (searchParams.q) {
        query = query.or(`email.ilike.%${searchParams.q}%,full_name.ilike.%${searchParams.q}%`)
    }
    if (searchParams.role && searchParams.role !== 'all') {
        query = query.eq('role', searchParams.role)
    }
    if (searchParams.status === 'active') {
        query = query.eq('is_suspended', false)
    } else if (searchParams.status === 'suspended') {
        query = query.eq('is_suspended', true)
    }
    if (searchParams.joined === '7d') {
        const d = new Date(); d.setDate(d.getDate() - 7)
        query = query.gte('created_at', d.toISOString())
    } else if (searchParams.joined === '30d') {
        const d = new Date(); d.setDate(d.getDate() - 30)
        query = query.gte('created_at', d.toISOString())
    } else if (searchParams.joined === '90d') {
        const d = new Date(); d.setDate(d.getDate() - 90)
        query = query.gte('created_at', d.toISOString())
    }

    const { data: profiles, count } = await query

    // For each user, get booking count and total spent
    const userIds = (profiles || []).map((p: { id: string }) => p.id)
    const bookingStats: Record<string, { count: number; total: number }> = {}
    if (userIds.length > 0) {
        const { data: bkgs } = await supabase
            .from('bookings')
            .select('user_id, total_pence')
            .in('user_id', userIds)
            .eq('status', 'confirmed')
        for (const b of (bkgs || []) as { user_id: string | null; total_pence: number | null }[]) {
            if (!b.user_id) continue
            if (!bookingStats[b.user_id]) bookingStats[b.user_id] = { count: 0, total: 0 }
            bookingStats[b.user_id].count++
            bookingStats[b.user_id].total += b.total_pence || 0
        }
    }

    type UserRow = {
        id: string
        full_name: string | null
        email: string | null
        role: 'user' | 'organiser' | 'admin'
        is_suspended: boolean
        is_verified: boolean
        created_at: string
        bookings_count: number
        total_spent_pence: number
    }

    const users: UserRow[] = (profiles || []).map((p: { id: string; full_name: string | null; email: string | null; role: 'user' | 'organiser' | 'admin'; is_suspended: boolean; is_verified: boolean; created_at: string }) => ({
        ...p,
        bookings_count: bookingStats[p.id]?.count ?? 0,
        total_spent_pence: bookingStats[p.id]?.total ?? 0,
    }))

    const { count: totalCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })

    return (
        <UsersClient
            users={users}
            totalCount={totalCount ?? 0}
            page={page}
            pageSize={pageSize}
            totalRows={count ?? 0}
            currentAdminId={user.id}
        />
    )
}
