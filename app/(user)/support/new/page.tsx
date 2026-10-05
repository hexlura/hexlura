import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserNewTicketForm } from './user-new-ticket-form'

export const dynamic = 'force-dynamic'

export default async function NewSupportTicketPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/support/new')

    return (
        <section className="max-w-2xl mx-auto">
            <Link href="/support" className="text-sm text-muted hover:text-accent mb-2 inline-block">← Back to Support</Link>
            <h1 className="font-heading text-3xl tracking-wide mb-6">NEW SUPPORT TICKET</h1>
            <UserNewTicketForm />
        </section>
    )
}
