import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { EventForm } from '@/components/organiser/EventForm'
import { resolveOrganiserId } from '@/lib/organiser-access'

export default async function NewEventPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    return (
        <div className="max-w-7xl">
            <Link href="/organiser/events" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors mb-4">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                Back to Events
            </Link>
            <div className="mb-8">
                <h1 className="font-heading text-4xl tracking-wide">CREATE EVENT</h1>
                <p className="text-muted text-sm mt-1">Fill in the details to create your event</p>
            </div>
            <EventForm organiserId={organiserId} />
        </div>
    )
}
