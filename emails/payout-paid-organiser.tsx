import React from 'react'
import BaseEmail from './components/BaseEmail'
import { AmountBox, Button, Card, CardTitle, Divider, Eyebrow, Icon, Lead, Note, P, Row, SupportLink, Title } from './components/kit'

interface PayoutPaidOrganiserProps {
    fullName: string
    orgName: string
    netPence: number
    paidAt: string
    reference: string
    eventName?: string
    appUrl: string
}

const gbp = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
})

function formatGBP(pence: number): string {
    return gbp.format(pence / 100)
}

export default function PayoutPaidOrganiser({
    fullName,
    orgName,
    netPence,
    paidAt,
    reference,
    eventName,
    appUrl,
}: PayoutPaidOrganiserProps) {
    const amount = formatGBP(netPence)

    return (
        <BaseEmail previewText={`Your payout of ${amount} is on its way`} tag="Payout">
            <Icon glyph="✓" tone="green" />
            <Eyebrow>Organiser</Eyebrow>
            <Title>PAYOUT SENT</Title>
            <Lead>
                Hi {fullName}, great news — your payout for <strong style={{ color: '#1A0E0C' }}>{orgName}</strong> has just been released by bank transfer to your nominated account.
            </Lead>

            <AmountBox label="YOUR PAYOUT" amount={amount} sub={`Sent on ${paidAt}`} />

            <Card>
                <CardTitle small>Payout details</CardTitle>
                {eventName ? <Row label="Event">{eventName}</Row> : null}
                <Row label="Method">Bank transfer</Row>
                <Row label="Reference" mono last>{reference}</Row>
            </Card>

            <P>
                Funds typically arrive in your bank account within 1–2 business days. If you don&apos;t see them after that, let us know and we&apos;ll chase it up.
            </P>

            <Button href={`${appUrl}/organiser/payouts`}>View payout history →</Button>

            <Divider />
            <Note>
                Something not right? Contact <SupportLink /> — we usually respond within a few hours.
            </Note>
        </BaseEmail>
    )
}
