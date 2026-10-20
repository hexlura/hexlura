import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Divider, Eyebrow, Icon, Note, P, SupportLink, Title } from './components/kit'

interface StripeConnectedProps {
    fullName: string
    orgName: string
    appUrl: string
}

export default function StripeConnected({ fullName, orgName, appUrl }: StripeConnectedProps) {
    return (
        <BaseEmail previewText="Your Stripe account is now connected to Hexlura" tag="Payouts">
            <Icon glyph="✓" tone="green" />
            <Eyebrow>Organiser</Eyebrow>
            <Title>STRIPE ACCOUNT CONNECTED</Title>
            <P>Hi {fullName},</P>
            <P>
                Your Stripe account is now connected to <strong>{orgName}</strong> on Hexlura. Payouts from ticket sales will be transferred directly to your Stripe account once your Connect onboarding is complete.
            </P>
            <P>You can manage your payout settings from your organiser dashboard at any time.</P>

            <Button href={`${appUrl}/organiser/settings`}>View settings →</Button>

            <Divider />
            <Note>
                Questions? Contact <SupportLink /> — we usually respond within a few hours.
            </Note>
        </BaseEmail>
    )
}
