import { createAdminClient } from '@/lib/supabase/admin'

// In-app notification fan-out to every admin account — mirrors the pattern
// already used for new support tickets. Failures are logged (never thrown): an alert that could not be
// delivered must not undo the action it describes, but it must not vanish silently either.
export async function notifyAdmins(notification: { type: string; title: string; body: string; link: string }): Promise<void> {
    const adminClient = createAdminClient()
    const { data: admins, error: adminsErr } = await adminClient.from('profiles').select('id').eq('role', 'admin')
    if (adminsErr) {
        console.error(`notifyAdmins(${notification.type}): could not load admins:`, adminsErr.message)
        return
    }

    if (admins?.length) {
        const { error } = await adminClient.from('notifications').insert(
            admins.map(a => ({
                user_id: a.id,
                type: notification.type,
                title: notification.title,
                body: notification.body,
                link: notification.link,
            }))
        )
        if (error) console.error(`notifyAdmins(${notification.type}): insert failed:`, error.message)
    }
}
