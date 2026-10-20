import React from 'react'
import BaseEmail from './components/BaseEmail'
import { AmountBox, Button, Card, CardTitle, Divider, Eyebrow, Icon, Lead, Note, P, Row, SupportLink, Title } from './components/kit'

interface PayoutPaidPromoterProps {
    fullName: string
    displayName: string
    referralCode: string
    netPence: number
    paidAt: string
    reference: string
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

export default function PayoutPaidPromoter({
    fullName,
    displayName,
    referralCode,
    netPence,
    paidAt,
    reference,
    appUrl,
}: PayoutPaidPromoterProps) {
    const amount = formatGBP(netPence)

    return (
        <BaseEmail previewText={`Your commission of ${amount} is on its way`} tag="Payout">
            <Icon glyph="✓" tone="green" />
            <Eyebrow>Promoter</Eyebrow>
            <Title>COMMISSION PAID</Title>
            <Lead>
                Hi {fullName}, nice work — your commission earnings as <strong style={{ color: '#1A0E0C' }}>{displayName}</strong> have just been released by bank transfer to your nominated account. Keep sharing your link to earn more.
            </Lead>

            <AmountBox label="YOUR COMMISSION" amount={amount} sub={`Sent on ${paidAt}`} />

            <Card>
                <CardTitle small>Payout details</CardTitle>
                <Row label="Promoter code" mono>{referralCode}</Row>
                <Row label="Method">Bank transfer</Row>
                <Row label="Reference" mono last>{reference}</Row>
            </Card>

            <P>
                Funds typically arrive in your bank account within 1–2 business days. If you don&apos;t see them after that, let us know and we&apos;ll chase it up.
            </P>

            <Button href={`${appUrl}/promoter/payouts`}>View payout history →</Button>

            <Divider />
            <Note>
                Something not right? Reply to this email or contact <SupportLink /> — we usually respond within a few hours.
            </Note>
        </BaseEmail>
    )
}
