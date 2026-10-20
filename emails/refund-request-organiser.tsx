import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, Eyebrow, Icon, Lead, Note, Notice, Quote, Row, Title } from './components/kit'

interface RefundRequestOrganiserProps {
    organiserName: string
    eventName: string
    buyerName: string
    bookingRef: string
    refundAmount: string
    reason: string
    reviewUrl: string
}

// NOTE: This template is sent when a buyer requests a refund.
// Wire this up in the buyer refund submission route (e.g. /api/bookings/refund-request).
export default function RefundRequestOrganiser({
    organiserName,
    eventName,
    buyerName,
    bookingRef,
    refundAmount,
    reason,
    reviewUrl,
}: RefundRequestOrganiserProps) {
    return (
        <BaseEmail previewText={`Refund request for ${eventName}`} tag="Refund request">
            <Icon glyph="!" tone="amber" />
            <Eyebrow>Organiser</Eyebrow>
            <Title>REFUND REQUEST</Title>
            <Lead>
                Hi {organiserName}, a buyer has requested a refund for <strong style={{ color: '#1A0E0C' }}>{eventName}</strong>.
            </Lead>

            <Card>
                <Row label="Buyer">{buyerName}</Row>
                <Row label="Booking ref" mono tone="accent">{bookingRef}</Row>
                <Row label="Refund amount" last>{refundAmount}</Row>
            </Card>

            <Quote label="Reason">{reason}</Quote>

            <Notice title="Time sensitive">You have 48 hours to approve or reject this request.</Notice>

            <Button href={reviewUrl}>Review request →</Button>
            <Note center>
                If you approve, the refund will be reviewed by the Hexlura admin team before processing.
            </Note>
        </BaseEmail>
    )
}
