import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Event } from '@/types'
import EventCard from '@/components/events/EventCard'
import Link from 'next/link'

export const metadata = {
    title: 'My Favourites | Hexlura',
    description: 'Events you have saved as favourites.',
}

export default async function FavouritesPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login?next=/favourites')
    }

    // Fetch liked events joined with full event data
    const { data: likes } = await supabase
        .from('likes')
        .select(`
            event_id,
            created_at,
            event:events (
                id,
                title,
                slug,
                start_at,
                end_at,
                venue_name,
                venue_address,
                banner_url,
                category,
                status,
                ticket_types (
                    id,
                    name,
                    price_pence,
                    quantity_total,
                    quantity_sold
                )
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    // Filter to valid, published events
    const likedEvents = (likes || [])
        .map((l) => l.event as unknown as Event)
        .filter((e) => !!e && e.status === 'published')

    return (
        <section className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="font-heading text-4xl text-text">MY FAVOURITES</h1>
                <p className="text-muted mt-1">
                    {likedEvents.length > 0
                        ? `${likedEvents.length} saved event${likedEvents.length !== 1 ? 's' : ''}`
                        : 'Events you like will appear here.'}
                </p>
            </div>

            {/* Grid or empty state */}
            {likedEvents.length > 0 ? (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: '16px',
                    }}
                >
                    {likedEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center border-2 border-dashed border-border rounded-none">
                    <div style={{ fontSize: 48, marginBottom: 16 }}>♡</div>
                    <p className="text-muted mb-2 text-lg">No favourites yet</p>
                    <p className="text-muted text-sm mb-6">
                        Tap the heart on any event to save it here.
                    </p>
                    <Link
                        href="/events"
                        className="inline-flex h-10 px-6 items-center text-sm font-medium bg-accent text-white hover:bg-accent/90 transition"
                        style={{ borderRadius: 0 }}
                    >
                        Browse Events →
                    </Link>
                </div>
            )}
        </section>
    )
}
