import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { resolveOrganiserId } from '@/lib/organiser-access'
import { loadEventAttendees } from '@/lib/organiser-attendees'
import { EventAttendeesPanel } from '@/components/organiser/EventAttendeesPanel'

interface PageProps {
    params: { id: string }
}

export default async function AttendeesPage({ params }: PageProps) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const data = await loadEventAttendees(params.id, organiserId)
    if (!data) notFound()

    const eventDate = new Date(data.event.start_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    })

    return (
        <div className="max-w-7xl">
            <div className="mb-6">
                <h1 className="font-heading text-4xl tracking-wide">ATTENDEES</h1>
                <p className="text-muted text-sm mt-1">{data.event.title} · {eventDate}</p>
            </div>

            <EventAttendeesPanel data={data} />
        </div>
    )
}
