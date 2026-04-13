import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolveOrganiserId } from '@/lib/organiser-access'

export default async function OrganiserAttendeesPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const organiserId = await resolveOrganiserId(user.id)
    if (!organiserId) redirect('/organiser/pending')

    const { data: events } = await supabase
        .from('events')
        .select('id, title, start_at, status')
        .eq('organiser_id', organiserId)
        .in('status', ['published', 'draft'])
        .order('start_at', { ascending: false })
        .limit(20)

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">ATTENDEES</h1>
                <p className="text-muted text-sm mt-1">Select an event to view and manage attendees</p>
            </div>

            <div className="grid gap-3">
                {(events || []).length === 0 && (
                    <div className="bg-card border border-border rounded-none p-12 text-center">
                        <p className="text-muted text-sm">No events yet.</p>
                        <Link href="/organiser/events/new" className="text-accent text-sm hover:underline mt-2 inline-block">Create your first event →</Link>
                    </div>
                )}
                {(events || []).map(e => (
                    <div key={e.id} className="bg-card border border-border rounded-none p-5 flex items-center justify-between hover:bg-[#22223A] transition-colors">
                        <div>
                            <p className="text-text font-medium">{e.title}</p>
                            <p className="text-muted text-xs mt-0.5">
                                {new Date(e.start_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                        <Link
                            href={`/organiser/events/${e.id}/attendees`}
                            className="px-4 py-2 bg-accent/10 text-accent text-sm rounded-sm hover:bg-accent/20 transition-colors"
                        >
                            View Attendees →
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    )
}
