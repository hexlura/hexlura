import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPence } from '@/lib/fees'

export default async function OrganiserBookingsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const serviceClient = createServiceClient()
    const { data: organiser } = await serviceClient
        .from('organiser_profiles').select('id').eq('user_id', user.id).single()
    if (!organiser) redirect('/organiser/pending')

    const { data: events } = await supabase
        .from('events').select('id').eq('organiser_id', organiser.id)
    const eventIds = (events || []).map(e => e.id)

    const { data: bookings } = eventIds.length
        ? await supabase
            .from('bookings')
            .select('id, booking_ref, status, ticket_subtotal_pence, booking_fee_pence, total_pence, created_at, confirmed_at, event:events(id, title)')
            .in('event_id', eventIds)
            .order('created_at', { ascending: false })
            .limit(100)
        : { data: [] }

    const rows = (bookings || []) as unknown as {
        id: string; booking_ref: string; status: string;
        ticket_subtotal_pence: number | null; booking_fee_pence: number | null;
        total_pence: number | null; created_at: string; confirmed_at: string | null;
        event: { id: string; title: string } | null
    }[]

    const statusColors: Record<string, string> = {
        confirmed: 'text-success bg-success/10 border-success/20',
        pending: 'text-gold bg-gold/10 border-gold/20',
        cancelled: 'text-accent bg-accent/10 border-accent/20',
        refunded: 'text-muted bg-muted/10 border-muted/20',
    }

    return (
        <div className="max-w-7xl">
            <div className="mb-8">
                <h1 className="font-heading text-4xl text-text tracking-wide">BOOKINGS</h1>
                <p className="text-muted text-sm mt-1">{rows.length} bookings shown</p>
            </div>

            <div className="bg-card border border-border rounded-none p-6">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left text-xs text-muted pb-3 font-normal pr-4">Booking Ref</th>
                            <th className="text-left text-xs text-muted pb-3 font-normal pr-4">Event</th>
                            <th className="text-left text-xs text-muted pb-3 font-normal pr-4">Status</th>
                            <th className="hidden md:table-cell text-left text-xs text-muted pb-3 font-normal pr-4">Subtotal</th>
                            <th className="hidden md:table-cell text-left text-xs text-muted pb-3 font-normal pr-4">Fee</th>
                            <th className="text-left text-xs text-muted pb-3 font-normal pr-4">Total</th>
                            <th className="text-left text-xs text-muted pb-3 font-normal pr-4">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr><td colSpan={7} className="text-center text-muted text-xs py-12">No bookings yet</td></tr>
                        )}
                        {rows.map(b => (
                            <tr key={b.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                <td className="py-3 pr-4">
                                    <Link href={`/organiser/bookings/${b.booking_ref}`} className="font-mono text-xs text-accent hover:underline">
                                        {b.booking_ref}
                                    </Link>
                                </td>
                                <td className="py-3 pr-4 text-text text-xs max-w-[160px] truncate">{b.event?.title || '—'}</td>
                                <td className="py-3 pr-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[b.status] || 'text-muted border-border'}`}>
                                        {b.status}
                                    </span>
                                </td>
                                <td className="hidden md:table-cell py-3 pr-4 text-text text-xs">{formatPence(b.ticket_subtotal_pence || 0)}</td>
                                <td className="hidden md:table-cell py-3 pr-4 text-muted text-xs">{formatPence(b.booking_fee_pence || 0)}</td>
                                <td className="py-3 pr-4 text-text text-xs font-medium">{formatPence(b.total_pence || 0)}</td>
                                <td className="py-3 text-muted text-xs">
                                    {new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    )
}
