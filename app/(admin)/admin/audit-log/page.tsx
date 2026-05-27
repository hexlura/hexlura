import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AuditLogClient } from './audit-log-client'

export default async function AdminAuditLogPage({
    searchParams,
}: {
    searchParams: { admin?: string; action?: string; entity?: string; from?: string; to?: string; page?: string }
}) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const adminClient = createAdminClient()

    const page = Math.max(1, parseInt(searchParams.page ?? '1'))
    const pageSize = 50
    const offset = (page - 1) * pageSize

    let query = adminClient
        .from('audit_logs')
        .select('id, action, entity_type, entity_id, metadata, created_at, actor_id, profiles(full_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

    if (searchParams.admin) query = query.eq('actor_id', searchParams.admin)
    if (searchParams.action) query = query.eq('action', searchParams.action)
    if (searchParams.entity && searchParams.entity !== 'all') query = query.eq('entity_type', searchParams.entity)
    if (searchParams.from) query = query.gte('created_at', searchParams.from)
    if (searchParams.to) {
        const toDate = new Date(searchParams.to)
        toDate.setHours(23, 59, 59, 999)
        query = query.lte('created_at', toDate.toISOString())
    }

    const { data: logsData, count } = await query

    // Get distinct actions for filter dropdown
    const { data: actionsData } = await adminClient
        .from('audit_logs')
        .select('action')
        .order('action')

    const distinctActions = Array.from(new Set((actionsData || []).map((a: { action: string }) => a.action)))

    // Get all admin profiles for filter dropdown
    const { data: admins } = await adminClient
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'admin')

    type AuditRow = {
        id: string
        action: string
        entity_type: string | null
        entity_id: string | null
        metadata: Record<string, unknown> | null
        created_at: string
        actor_id: string | null
        profiles: { full_name: string | null } | null
    }

    const logs = (logsData || []) as unknown as AuditRow[]

    return (
        <AuditLogClient
            logs={logs}
            totalRows={count ?? 0}
            page={page}
            pageSize={pageSize}
            distinctActions={distinctActions}
            admins={(admins || []) as { id: string; full_name: string | null }[]}
        />
    )
}
