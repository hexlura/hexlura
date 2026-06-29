import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

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
        <BaseEmail previewText={`Your payout request of ${amount} has been received`}>
            <Text style={headingStyle}>PAYOUT REQUESTED</Text>

            <Text style={greetingStyle}>Hi {fullName},</Text>

            <Text style={bodyTextStyle}>
                We&apos;ve received your payout request for <strong>{orgName}</strong>. Our team will review it and process your payment shortly.
            </Text>

            <div style={amountBoxStyle}>
                <Text style={amountLabelStyle}>AMOUNT REQUESTED</Text>
                <Text style={amountValueStyle}>{amount}</Text>
                <Text style={amountSubStyle}>{payoutCount} payout{payoutCount === 1 ? '' : 's'} in this batch</Text>
            </div>

            <Text style={bodyTextStyle}>
                You&apos;ll receive another email once your payout has been processed and sent. Bank transfers typically arrive within 1–2 business days after processing.
            </Text>

            <div style={buttonWrapStyle}>
                <Link href={`${appUrl}/organiser/payouts`} style={primaryButtonStyle}>
                    View payout history →
                </Link>
            </div>

            <div style={dividerStyle} />

            <Text style={noteStyle}>
                Questions about your payout? Contact{' '}
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

const amountBoxStyle: React.CSSProperties = {
    backgroundColor: '#0A0A0F',
    padding: '24px',
    margin: '0 0 24px 0',
    textAlign: 'center',
}

const amountLabelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '11px',
    fontWeight: 700,
    color: '#8888AA',
    letterSpacing: '2px',
    margin: '0 0 8px 0',
}

const amountValueStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '36px',
    fontWeight: 900,
    color: '#FFFFFF',
    margin: '0 0 8px 0',
}

const amountSubStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#8888AA',
    margin: 0,
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
