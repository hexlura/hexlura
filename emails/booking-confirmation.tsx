import React from 'react'
import BaseEmail from './components/BaseEmail'
import { allocateFee } from '../lib/fees'
import { A, Button, Card, CardTitle, EventFacts, Eyebrow, Icon, Lead, Note, RefBox, Row, Title, TotalRow } from './components/kit'

interface TicketItem {
    name: string
    quantity: number
    /** Line total at ticket price (unit price × quantity), in pence */
    pricePence: number
}

interface BookingConfirmationProps {
    buyerName: string
    eventName: string
    eventDate: string
    eventTime: string
    venueName: string
    venueAddress: string
    bookingRef: string
    ticketItems: TicketItem[]
    /** Fees are never shown separately: lines carry all fees, and the total notes them as one figure */
    bookingFeePence?: number
    processingFeePence?: number
    discountPence?: number
    totalPaid: string
    downloadUrl: string
}

export default function BookingConfirmation({
    buyerName,
    eventName,
    eventDate,
    eventTime,
    venueName,
    venueAddress,
    bookingRef,
    ticketItems,
    bookingFeePence = 0,
    processingFeePence = 0,
    discountPence = 0,
    totalPaid,
    downloadUrl,
}: BookingConfirmationProps) {
    const feePence = bookingFeePence + processingFeePence
    const lineFees = allocateFee(ticketItems.map(t => t.pricePence), feePence)
    const venue = `${venueName}${venueAddress ? `, ${venueAddress}` : ''}`

    return (
        <BaseEmail previewText={`Your tickets for ${eventName} are confirmed!`} tag="Your tickets">
            <Icon glyph="✓" tone="green" />
            <Eyebrow>Booking confirmed</Eyebrow>
            <Title>YOU&apos;RE GOING!</Title>
            <Lead>{buyerName ? `Hi ${buyerName}, your` : 'Your'} tickets have been confirmed.</Lead>

            <RefBox label="BOOKING REFERENCE" value={bookingRef} />

            <Card>
                <CardTitle>{eventName}</CardTitle>
                <EventFacts date={eventDate} time={eventTime} venue={venue} />
            </Card>

            <Card>
                {ticketItems.map((item, i) => (
                    <Row key={i} label={`${item.quantity} × ${item.name}`}>
                        £{((item.pricePence + lineFees[i]) / 100).toFixed(2)}
                    </Row>
                ))}
                {discountPence > 0 && (
                    <Row label="Discount" tone="green">
                        -£{(discountPence / 100).toFixed(2)}
                    </Row>
                )}
                <TotalRow
                    label="Total paid"
                    value={totalPaid}
                    note={feePence > 0 ? `includes £${(feePence / 100).toFixed(2)} in fees` : undefined}
                />
            </Card>

            <Button href={downloadUrl}>Download your tickets →</Button>

            <Note center>Show your QR code at the door. Each QR code is valid for one scan only.</Note>
            <Note center>
                Questions? Contact <A href="mailto:support@hexlura.com">support@hexlura.com</A>
            </Note>
        </BaseEmail>
    )
}
