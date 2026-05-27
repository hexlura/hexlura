import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EventForm } from '@/components/organiser/EventForm'
import { resolveOrganiserId } from '@/lib/organiser-access'

export default async function NewEventPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">CREATE EVENT</h1>
                <p className="text-muted text-sm mt-1">Fill in the details to create your event</p>
            </div>
            <EventForm organiserId={organiserId} />
        </div>
    )
}
