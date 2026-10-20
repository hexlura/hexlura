import React from 'react'
import BaseEmail from './components/BaseEmail'
import { AmountBox, Button, Divider, Eyebrow, Icon, Lead, Note, P, SupportLink, Title } from './components/kit'

interface PayoutRequestedOrganiserProps {
    fullName: string
    orgName: string
    totalRequestedPence: number
    payoutCount: number
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

export default function PayoutRequestedOrganiser({
    fullName,
    orgName,
    totalRequestedPence,
    payoutCount,
    appUrl,
}: PayoutRequestedOrganiserProps) {
    const amount = formatGBP(totalRequestedPence)

    return (
        <BaseEmail previewText={`Your payout request of ${amount} has been received`} tag="Payout">
            <Icon glyph="£" tone="amber" />
            <Eyebrow>Organiser</Eyebrow>
            <Title>PAYOUT REQUESTED</Title>
            <Lead>
                Hi {fullName}, we&apos;ve received your payout request for <strong style={{ color: '#1A0E0C' }}>{orgName}</strong>. Our team will review it and process your payment shortly.
            </Lead>

            <AmountBox label="AMOUNT REQUESTED" amount={amount} sub={`${payoutCount} payout${payoutCount === 1 ? '' : 's'} in this batch`} />

            <P>
                You&apos;ll receive another email once your payout has been processed and sent. Bank transfers typically arrive within 1–2 business days after processing.
            </P>

            <Button href={`${appUrl}/organiser/payouts`}>View payout history →</Button>

            <Divider />
            <Note>
                Questions about your payout? Contact <SupportLink /> — we usually respond within a few hours.
            </Note>
        </BaseEmail>
    )
}
