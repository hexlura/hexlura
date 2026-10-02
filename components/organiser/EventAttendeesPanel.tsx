import { formatPence } from '@/lib/fees'
import type { EventAttendeesData } from '@/lib/organiser-attendees'
import { AttendeesClient } from '@/components/organiser/AttendeesClient'

interface EventAttendeesPanelProps {
    data: EventAttendeesData
    /** "{event} — Attendee List" heading (shown when the panel sits under the event cards) */
    showHeading?: boolean
}

// Stats + filters + table for one event — shared by the Attendees page and the per-event page.
export function EventAttendeesPanel({ data, showHeading = false }: EventAttendeesPanelProps) {
    const { event, attendees, ticketTypes, totalTickets, checkedIn, totalRevenuePence } = data

    // Whole pounds when exact (as in the design), otherwise keep the pence so nothing is rounded away
    const revenueLabel = totalRevenuePence % 100 === 0
        ? `£${(totalRevenuePence / 100).toLocaleString('en-GB')}`
        : formatPence(totalRevenuePence)

    return (
        <section id="attendee-list" className="scroll-mt-28">
            {showHeading && (
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold">{event.title} — Attendee List</h2>
                </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-card rounded-2xl shadow-card p-4">
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">Total Tickets</p>
                    <p className="font-heading text-2xl">{totalTickets.toLocaleString()}</p>
                </div>
                <div className="bg-card rounded-2xl shadow-card p-4">
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">Checked In</p>
                    <p className="font-heading text-2xl text-warm-green">{checkedIn.toLocaleString()}</p>
                </div>
                <div className="bg-card rounded-2xl shadow-card p-4">
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">Revenue</p>
                    <p className="font-heading text-2xl">{revenueLabel}</p>
                </div>
            </div>

            {/* key resets the filters/search when another event is selected */}
            <AttendeesClient
                key={event.id}
                eventId={event.id}
                eventTitle={event.title}
                attendees={attendees}
                ticketTypes={ticketTypes}
            />
        </section>
    )
}
