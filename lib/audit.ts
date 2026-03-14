import { createClient } from '@/lib/supabase/server'

interface AuditLogEntry {
    actorId: string
    action: string
    entityType?: string
    entityId?: string
    metadata?: Record<string, unknown>
}

export async function logAuditAction(entry: AuditLogEntry): Promise<void> {
    const supabase = createClient()
    await supabase.from('audit_logs').insert({
        actor_id: entry.actorId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        metadata: entry.metadata ?? null,
    })
}
