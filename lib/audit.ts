import { createAdminClient } from '@/lib/supabase/admin'

interface AuditLogEntry {
    actorId: string
    action: string
    entityType?: string
    entityId?: string
    metadata?: Record<string, unknown>
}

// Writes with the service role: audit_logs has no INSERT policy for clients (migration 078), so a
// logged-in user can never forge audit rows. Callers have already authenticated/authorised the actor.
export async function logAuditAction(entry: AuditLogEntry): Promise<void> {
    const supabase = createAdminClient()
    const { error } = await supabase.from('audit_logs').insert({
        actor_id: entry.actorId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        metadata: entry.metadata ?? null,
    })
    if (error) console.error(`Audit log insert failed (${entry.action}):`, error.message)
}
