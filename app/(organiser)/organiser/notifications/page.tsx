import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { NotificationRow } from '@/components/notifications/NotificationsInbox'
import { OrganiserNotificationsInbox } from '@/components/organiser/OrganiserNotificationsInbox'

export const dynamic = 'force-dynamic'

export default async function OrganiserNotificationsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/organiser/notifications')

    const { data: notifications, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, is_read, link, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200)
    if (error) throw error

    return <OrganiserNotificationsInbox initial={(notifications || []) as NotificationRow[]} />
}
