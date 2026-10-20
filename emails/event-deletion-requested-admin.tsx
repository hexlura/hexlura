import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, Divider, Eyebrow, Icon, Lead, Note, Quote, Row, Title } from './components/kit'

interface EventDeletionRequestedAdminProps {
    orgName: string
    organiserEmail: string
    eventTitle: string
    reason: string
    confirmedBookingCount: number
    revenuePence: number
    appUrl: string
}

function formatGBP(pence: number): string {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(pence / 100)
}

export default function EventDeletionRequestedAdmin({
    orgName,
    organiserEmail,
    eventTitle,
    reason,
    confirmedBookingCount,
    revenuePence,
    appUrl,
}: EventDeletionRequestedAdminProps) {
    return (
        <BaseEmail previewText={`Event deletion requested: ${eventTitle} (${orgName})`} tag="Admin">
            <Icon glyph="!" tone="amber" />
            <Eyebrow>Awaiting your review</Eyebrow>
            <Title>EVENT DELETION REQUESTED</Title>
            <Lead>
                An organiser has asked to permanently delete an event. It has been unpublished and is
                awaiting your review — it will not be deleted until you approve it.
            </Lead>

            <Card>
                <Row label="Organiser">{orgName}</Row>
                <Row label="Contact">{organiserEmail}</Row>
                <Row label="Event">{eventTitle}</Row>
                <Row label="Confirmed bookings"><strong>{confirmedBookingCount}</strong></Row>
                <Row label="Revenue at stake" last>{formatGBP(revenuePence)}</Row>
            </Card>

            <Quote label="Organiser's stated reason">{reason}</Quote>

            <Button href={`${appUrl}/admin/event-deletion-requests`}>Review request →</Button>

            <Divider />
            <Note>This is an internal admin notification. Do not forward this email.</Note>
        </BaseEmail>
    )
}
