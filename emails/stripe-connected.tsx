import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface StripeConnectedProps {
    fullName: string
    orgName: string
    appUrl: string
}

export default function StripeConnected({ fullName, orgName, appUrl }: StripeConnectedProps) {
    return (
        <BaseEmail previewText="Your Stripe account is now connected to Hexlura">
            <Text style={headingStyle}>STRIPE ACCOUNT CONNECTED</Text>

            <Text style={greetingStyle}>Hi {fullName},</Text>

            <Text style={bodyTextStyle}>
                Your Stripe account is now connected to <strong>{orgName}</strong> on Hexlura. Payouts from ticket sales will be transferred directly to your Stripe account once your Connect onboarding is complete.
            </Text>

            <Text style={bodyTextStyle}>
                You can manage your payout settings from your organiser dashboard at any time.
            </Text>

            <div style={buttonWrapStyle}>
                <Link href={`${appUrl}/organiser/settings`} style={primaryButtonStyle}>
                    View Settings →
                </Link>
            </div>

            <div style={dividerStyle} />

            <Text style={noteStyle}>
                Questions? Contact{' '}
                <Link href="mailto:support@hexlura.com" style={linkStyle}>
                    support@hexlura.com
                </Link>
                {' '}— we usually respond within a few hours.
            </Text>
        </BaseEmail>
    )
}

const headingStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '28px',
    fontWeight: 900,
    color: '#0A0A0F',
    margin: '0 0 24px 0',
}

const greetingStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '18px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '0 0 12px 0',
}

const bodyTextStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#666677',
    lineHeight: 1.6,
    margin: '0 0 24px 0',
}

const buttonWrapStyle: React.CSSProperties = {
    margin: '0 0 24px 0',
}

const primaryButtonStyle: React.CSSProperties = {
    backgroundColor: '#E63950',
    color: '#FFFFFF',
    padding: '14px 32px',
    fontSize: '14px',
    fontWeight: 700,
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: 'Arial, sans-serif',
}

const dividerStyle: React.CSSProperties = {
    borderTop: '1px solid #EEEEEE',
    margin: '32px 0',
}

const noteStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#8888AA',
    lineHeight: 1.6,
    margin: '16px 0 0 0',
}

const linkStyle: React.CSSProperties = {
    color: '#E63950',
    textDecoration: 'none',
}
