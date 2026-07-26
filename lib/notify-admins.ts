import { createAdminClient } from '@/lib/supabase/admin'

// In-app notification fan-out to every admin account — mirrors the pattern
// already used for new support tickets.
export async function notifyAdmins(notification: { type: string; title: string; body: string; link: string }): Promise<void> {
    const adminClient = createAdminClient()
    const { data: admins } = await adminClient.from('profiles').select('id').eq('role', 'admin')

    if (admins?.length) {
        await adminClient.from('notifications').insert(
            admins.map(a => ({
                user_id: a.id,
                type: notification.type,
                title: notification.title,
                body: notification.body,
                link: notification.link,
            }))
        )
    }
}
