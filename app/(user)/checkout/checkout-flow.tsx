'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useCheckout } from '@/lib/checkout-context'
import { createClient } from '@/lib/supabase/client'
import StepDetails from './step-details'
import StepPayment from './step-payment'

const STEP_LABELS = ['Details', 'Payment', 'Confirmation']

export default function CheckoutFlow() {
    const searchParams = useSearchParams()
    const { state, setItems, setEventInfo, setStep } = useCheckout()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadEventData() {
            const eventId = searchParams.get('event_id')
            const ticketsParam = searchParams.get('tickets') // format: typeId:qty,typeId:qty

            if (!eventId || !ticketsParam) {
                setError('Invalid checkout link. Please select tickets from an event page.')
                setLoading(false)
                return
            }

            const supabase = createClient()

            const { data: event } = await supabase
                .from('events')
                .select('id, title, start_at, end_at, venue_name, venue_address')
                .eq('id', eventId)
                .single()

            if (!event) {
                setError('Event not found.')
                setLoading(false)
                return
            }

            const ticketPairs = ticketsParam.split(',').map((pair) => {
                const [id, qty] = pair.split(':')
                return { ticket_type_id: id, quantity: parseInt(qty) || 0 }
            }).filter(p => p.quantity > 0)

            if (!ticketPairs.length) {
                setError('No tickets selected.')
                setLoading(false)
                return
            }

            // Fetch ticket type details
            const { data: ticketTypes } = await supabase
                .from('ticket_types')
                .select('id, name, price_pence')
                .in('id', ticketPairs.map(p => p.ticket_type_id))

            if (!ticketTypes?.length) {
                setError('Ticket types not found.')
                setLoading(false)
                return
            }

            const items = ticketPairs.map((pair) => {
                const tt = ticketTypes.find(t => t.id === pair.ticket_type_id)
                return {
                    ticket_type_id: pair.ticket_type_id,
                    ticket_name: tt?.name || 'Ticket',
                    quantity: pair.quantity,
                    price_pence: tt?.price_pence || 0,
                }
            })

            const eventDate = new Intl.DateTimeFormat('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            }).format(new Date(event.start_at))

            const eventTime = new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
            }).format(new Date(event.start_at))

            setEventInfo({
                eventId: event.id,
                eventTitle: event.title,
                eventDate,
                eventTime,
                venueName: event.venue_name || 'TBC',
            })
            setItems(items)
            setStep(1)
            setLoading(false)
        }

        loadEventData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto py-12 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
                <p className="text-muted mt-4">Loading checkout...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                    <span className="text-accent text-2xl">!</span>
                </div>
                <p className="text-text font-medium">{error}</p>
                <a href="/events" className="text-accent hover:underline text-sm">Browse events</a>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto py-8 space-y-8">
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2">
                {STEP_LABELS.map((label, i) => {
                    const stepNum = i + 1
                    const isActive = state.step === stepNum
                    const isComplete = state.step > stepNum
                    return (
                        <div key={label} className="flex items-center gap-2">
                            {i > 0 && <div className={`w-8 h-px ${isComplete ? 'bg-accent' : 'bg-border'}`} />}
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                    isActive ? 'bg-accent text-white' :
                                    isComplete ? 'bg-accent/20 text-accent' :
                                    'bg-surface border border-border text-muted'
                                }`}>
                                    {isComplete ? '✓' : stepNum}
                                </div>
                                <span className={`text-sm font-medium ${isActive ? 'text-text' : 'text-muted'}`}>{label}</span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {state.step === 1 && <StepDetails />}
            {state.step === 2 && <StepPayment />}
        </div>
    )
}
