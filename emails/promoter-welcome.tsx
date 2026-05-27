import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface PromoterWelcomeProps {
    displayName: string
    referralCode: string
    appUrl: string
}

export default function PromoterWelcome({ displayName, referralCode, appUrl }: PromoterWelcomeProps) {
    return (
        <BaseEmail previewText="You're now a Hexlura promoter — start earning commission">
            <Text style={headingStyle}>YOU&apos;RE A PROMOTER</Text>

            <Text style={greetingStyle}>Hi {displayName},</Text>

            <Text style={bodyTextStyle}>
                Welcome aboard. You&apos;re now a Hexlura promoter and can earn commission on every ticket sold through your referral links.
            </Text>

            <Text style={subHeadingStyle}>Your referral code</Text>
            <div style={codeBoxStyle}>
                <Text style={codeStyle}>{referralCode}</Text>
            </div>

            <Text style={bodyTextStyle}>
                Append <strong>?ref={referralCode}</strong> to any event link you share. When someone books through your link, you earn the commission % set by the event organiser.
            </Text>

            <Text style={subHeadingStyle}>What happens next</Text>

            <Text style={listItemStyle}>· Organisers can now invite you to promote their events</Text>
            <Text style={listItemStyle}>· Track clicks, sales and earnings in your dashboard</Text>
            <Text style={listItemStyle}>· Request payouts whenever your balance clears the cooldown window</Text>

            <div style={buttonWrapStyle}>
                <Link href={`${appUrl}/promoter`} style={primaryButtonStyle}>
                    Open Promoter Dashboard →
                </Link>
            </div>

            <Text style={noteStyle}>
                Questions? Reply to this email or contact{' '}
                <Link href="mailto:support@hexlura.com" style={linkStyle}>support@hexlura.com</Link>.
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
    margin: '0 0 16px 0',
}
const subHeadingStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '15px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '24px 0 12px 0',
}
const codeBoxStyle: React.CSSProperties = {
    background: '#F5F5F7',
    border: '2px dashed #C0C0C8',
    padding: '16px',
    textAlign: 'center',
    margin: '8px 0 16px 0',
}
const codeStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '24px',
    fontWeight: 900,
    color: '#E63950',
    margin: 0,
    letterSpacing: '2px',
}
const listItemStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#444455',
    lineHeight: 1.6,
    margin: '0 0 8px 0',
}
const buttonWrapStyle: React.CSSProperties = { margin: '24px 0' }
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
const noteStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#8888AA',
    lineHeight: 1.6,
    margin: '8px 0',
}
const linkStyle: React.CSSProperties = { color: '#E63950', textDecoration: 'none' }
