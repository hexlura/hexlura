import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, Eyebrow, Icon, Lead, Notice, Row, Title } from './components/kit'

interface PayoutFailedAdminProps {
    organiserName: string
    eventName: string
    amount: string
    failureReason: string
    dashboardUrl: string
}

export default function PayoutFailedAdmin({
    organiserName,
    eventName,
    amount,
    failureReason,
    dashboardUrl,
}: PayoutFailedAdminProps) {
    return (
        <BaseEmail previewText="Payout failed — manual action required" tag="Admin">
            <Icon glyph="✕" tone="red" />
            <Eyebrow>Manual action required</Eyebrow>
            <Title>PAYOUT FAILED</Title>
            <Lead>A payout has failed and requires manual action.</Lead>

            <Card>
                <Row label="Organiser">{organiserName}</Row>
                <Row label="Event">{eventName}</Row>
                <Row label="Amount" tone="red">{amount}</Row>
                <Row label="Reason" last>{failureReason}</Row>
            </Card>

            <Notice tone="red" title="Urgent">
                Please resolve this within 24 hours to maintain organiser trust.
            </Notice>

            <Button href={dashboardUrl}>View in dashboard →</Button>
        </BaseEmail>
    )
}
