import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, Divider, Eyebrow, Icon, Lead, Note, Row, Title } from './components/kit'

interface PayoutRequestAdminProps {
    orgName: string
    organiserEmail: string
    totalRequestedPence: number
    payoutCount: number
    appUrl: string
}

function formatGBP(pence: number): string {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(pence / 100)
}

export default function PayoutRequestAdmin({
    orgName,
    organiserEmail,
    totalRequestedPence,
    payoutCount,
    appUrl,
}: PayoutRequestAdminProps) {
    const amount = formatGBP(totalRequestedPence)

    return (
        <BaseEmail previewText={`New payout request: ${orgName} — ${amount}`} tag="Admin">
            <Icon glyph="£" tone="amber" />
            <Eyebrow>Awaiting your review</Eyebrow>
            <Title>NEW PAYOUT REQUEST</Title>
            <Lead>An organiser has submitted a payout withdrawal request and is awaiting your review.</Lead>

            <Card>
                <Row label="Organiser">{orgName}</Row>
                <Row label="Contact">{organiserEmail}</Row>
                <Row label="Amount requested"><strong>{amount}</strong></Row>
                <Row label="Payouts in batch" last>{payoutCount}</Row>
            </Card>

            <Button href={`${appUrl}/admin/payouts`}>Review in admin panel →</Button>

            <Divider />
            <Note>This is an internal admin notification. Do not forward this email.</Note>
        </BaseEmail>
    )
}
