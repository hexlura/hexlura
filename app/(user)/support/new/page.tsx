import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewTicketForm } from './new-ticket-form'

export const dynamic = 'force-dynamic'

export default async function NewSupportTicketPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login?next=/support/new')

    return (
        <section className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="font-heading text-4xl text-text tracking-wide">NEW TICKET</h1>
                <p className="text-muted text-sm mt-1">Tell us what&apos;s going on. We&apos;ll get back to you as soon as we can.</p>
            </div>
            <NewTicketForm />
        </section>
    )
}
