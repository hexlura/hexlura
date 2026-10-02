import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { statusLabel, type SupportStatus } from '@/lib/support'
import { OrganiserSupportList, type TicketListRow } from '@/components/organiser/OrganiserSupport'

export const dynamic = 'force-dynamic'

const BASE = '/organiser/support'

type TicketRow = {
    id: string
    subject: string
    status: SupportStatus
    last_reply_at: string | null
    last_reply_by_admin: boolean
    created_at: string
    updated_at: string | null
}

function timeAgo(iso: string): string {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return 'just now'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
    const d = Math.floor(h / 24)
    if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function OrganiserSupportPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/auth/login?next=${BASE}`)

    const { data: ticketsRaw, error } = await supabase
        .from('support_tickets')
        .select('id, subject, status, last_reply_at, last_reply_by_admin, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
    if (error) throw error

    const tickets: TicketListRow[] = ((ticketsRaw || []) as TicketRow[]).map(t => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        statusLabel: statusLabel(t.status),
        lastReplyBy: t.last_reply_at ? (t.last_reply_by_admin ? 'Hexlura Support' : 'You') : '—',
        updatedLabel: timeAgo(t.updated_at ?? t.last_reply_at ?? t.created_at),
    }))

    return (
        <div className="max-w-7xl">
            <OrganiserSupportList tickets={tickets} />
        </div>
    )
}
