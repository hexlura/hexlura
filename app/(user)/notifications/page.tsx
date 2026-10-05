import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type NotificationRow } from '@/components/notifications/NotificationsInbox'
import { UserNotificationsInbox } from '@/components/notifications/UserNotificationsInbox'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/notifications')

    const { data: notifications } = await supabase
        .from('notifications')
        .select('id, type, title, body, is_read, link, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200)

    return <UserNotificationsInbox initial={(notifications || []) as NotificationRow[]} />
}
