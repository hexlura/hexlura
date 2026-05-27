import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface OrganiserIdentityVerifiedProps {
    fullName: string
    orgName: string
    verifiedAt: string
    appUrl: string
}

export default function OrganiserIdentityVerified({
    fullName,
    orgName,
    verifiedAt,
    appUrl,
}: OrganiserIdentityVerifiedProps) {
    return (
        <BaseEmail previewText={`Identity verified for ${orgName} — payouts are now enabled`}>
            <Text style={headingStyle}>IDENTITY VERIFIED</Text>

            <Text style={greetingStyle}>Hi {fullName},</Text>

            <Text style={bodyTextStyle}>
                We&apos;ve confirmed your identity for <strong>{orgName}</strong>. Your account is now eligible to request payouts whenever your balance becomes available.
            </Text>

            <div style={badgeBoxStyle}>
                <Text style={badgeLabelStyle}>VERIFIED ON</Text>
                <Text style={badgeValueStyle}>{verifiedAt}</Text>
            </div>

            <Text style={bodyTextStyle}>
                Verification is a one-time check. You won&apos;t need to do this again unless we ever ask you to re-confirm.
            </Text>

            <div style={buttonWrapStyle}>
                <Link href={`${appUrl}/organiser/payouts`} style={primaryButtonStyle}>
                    Go to Payouts →
                </Link>
            </div>

            <div style={dividerStyle} />

            <Text style={noteStyle}>
                Questions? Reply to this email or contact{' '}
                <Link href="mailto:support@hexlura.com" style={linkStyle}>
                    support@hexlura.com
                </Link>
                .
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

const badgeBoxStyle: React.CSSProperties = {
    backgroundColor: '#0A0A0F',
    padding: '24px',
    margin: '0 0 24px 0',
    textAlign: 'center',
}

const badgeLabelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '11px',
    fontWeight: 700,
    color: '#8888AA',
    letterSpacing: '2px',
    margin: '0 0 8px 0',
}

const badgeValueStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '24px',
    fontWeight: 900,
    color: '#FFFFFF',
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
