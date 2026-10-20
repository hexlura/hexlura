import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, Eyebrow, Icon, Lead, Note, Row, Title, TotalRow } from './components/kit'

interface TicketItem {
    name: string
    quantity: number
    /** Line total for this ticket type (ticket price only, no fees), already formatted */
    price: string
}

interface NewBookingOrganiserProps {
    organiserName: string
    eventName: string
    eventDate: string
    buyerName: string
    buyerEmail: string
    ticketItems: TicketItem[]
    totalRevenue: string
    bookingRef: string
    dashboardUrl: string
}

// Organiser-facing: ticket revenue only — never Hexlura's fee or the buyer's gross total.
export default function NewBookingOrganiser({
    organiserName,
    eventName,
    eventDate,
    buyerName,
    buyerEmail,
    ticketItems,
    totalRevenue,
    bookingRef,
    dashboardUrl,
}: NewBookingOrganiserProps) {
    return (
        <BaseEmail previewText={`New booking for ${eventName}`} tag="New booking">
            <Icon glyph="£" tone="green" />
            <Eyebrow>Organiser</Eyebrow>
            <Title>NEW BOOKING!</Title>
            <Lead>
                Hi {organiserName}, you have a new booking for <strong style={{ color: '#1A0E0C' }}>{eventName}</strong>.
            </Lead>

            <Card>
                <Row label="Buyer">{buyerName} · {buyerEmail}</Row>
                <Row label="Event">{eventName}</Row>
                <Row label="Date">{eventDate}</Row>
                <Row label="Reference" mono tone="accent" last>{bookingRef}</Row>
            </Card>

            <Card>
                {ticketItems.map((item, i) => (
                    <Row key={i} label={`${item.quantity} × ${item.name}`}>{item.price}</Row>
                ))}
                <TotalRow label="Your revenue" value={totalRevenue} tone="green" />
            </Card>

            <Button href={dashboardUrl}>View dashboard →</Button>
            <Note center>Keep up the great work!</Note>
        </BaseEmail>
    )
}
