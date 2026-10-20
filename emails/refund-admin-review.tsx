import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, Eyebrow, Icon, Lead, Notice, Row, Title } from './components/kit'

interface RefundAdminReviewProps {
    eventName: string
    organiserName: string
    buyerName: string
    buyerEmail: string
    bookingRef: string
    refundAmount: string
    feeKept: string
    reviewUrl: string
}

// Admin-facing: showing Hexlura's fee is fine here (the fee-visibility rule only covers organisers).
export default function RefundAdminReview({
    eventName,
    organiserName,
    buyerName,
    buyerEmail,
    bookingRef,
    refundAmount,
    feeKept,
    reviewUrl,
}: RefundAdminReviewProps) {
    return (
        <BaseEmail previewText="Refund approved by organiser — action required" tag="Admin">
            <Icon glyph="!" tone="amber" />
            <Eyebrow>Refund awaiting your approval</Eyebrow>
            <Title>ACTION REQUIRED</Title>
            <Lead>An organiser has approved a refund request. Please review and confirm or deny.</Lead>

            <Notice title="Needs a decision">The buyer has not been refunded yet. Nothing changes until you confirm.</Notice>

            <Card>
                <Row label="Event">{eventName}</Row>
                <Row label="Organiser">{organiserName}</Row>
                <Row label="Buyer">{buyerName} · {buyerEmail}</Row>
                <Row label="Booking ref" mono tone="accent">{bookingRef}</Row>
                <Row label="Refund amount" tone="red">{refundAmount}</Row>
                <Row label="Platform fee kept" last>{feeKept}</Row>
            </Card>

            <Button href={reviewUrl}>Review &amp; confirm →</Button>
        </BaseEmail>
    )
}
