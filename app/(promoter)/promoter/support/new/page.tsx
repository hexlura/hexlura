import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserNewTicketForm } from '@/app/(user)/support/new/user-new-ticket-form'

export const dynamic = 'force-dynamic'

const BASE = '/promoter/support'

export default async function PromoterNewSupportTicketPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/auth/login?next=${BASE}/new`)

    return (
        <section className="max-w-2xl">
            <Link href={BASE} className="text-sm text-muted hover:text-accent mb-2 inline-block">← Back to support</Link>
            <h1 className="font-heading text-4xl tracking-wide mb-6">NEW SUPPORT TICKET</h1>
            <UserNewTicketForm basePath={BASE} />
        </section>
    )
}
