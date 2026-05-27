import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Booking } from '@/types'
import BookingTabs from './booking-tabs'

export default async function BookingsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const { data: bookingsRaw } = await supabase
        .from('bookings')
        .select('*, event:events(title, start_at, end_at, venue_name, venue_address, banner_url, category)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const bookings = (bookingsRaw || []) as Booking[]

    const now = new Date().toISOString()

    const upcoming = bookings.filter(
        (b) => b.status === 'confirmed' && b.event && b.event.start_at > now
    )
    const past = bookings.filter(
        (b) => b.status === 'confirmed' && b.event && b.event.start_at <= now
    )
    const cancelled = bookings.filter(
        (b) => b.status === 'cancelled' || b.status === 'refunded'
    )

    return (
        <section className="space-y-6">
            <h1 className="font-heading text-4xl text-text">MY BOOKINGS</h1>
            <BookingTabs upcoming={upcoming} past={past} cancelled={cancelled} />
        </section>
    )
}
