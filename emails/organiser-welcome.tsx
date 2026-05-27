import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface OrganiserWelcomeProps {
    fullName: string
    orgName: string
    appUrl: string
}

export default function OrganiserWelcome({ fullName, orgName, appUrl }: OrganiserWelcomeProps) {
    return (
        <BaseEmail previewText={`${orgName} is live on Hexlura — start selling tickets`}>
            <Text style={headingStyle}>YOU&apos;RE LIVE</Text>

            <Text style={greetingStyle}>Welcome aboard, {fullName}!</Text>

            <Text style={bodyTextStyle}>
                <strong>{orgName}</strong> is approved and your organiser dashboard is ready. You can create events, sell tickets, and check in attendees — all from one place.
            </Text>

            <div style={buttonWrapStyle}>
                <Link href={`${appUrl}/organiser`} style={primaryButtonStyle}>
                    Go to Dashboard →
                </Link>
            </div>

            <Text style={subHeadingStyle}>Quick start checklist</Text>

            <Text style={stepStyle}>
                <strong style={stepNumStyle}>1.</strong> Set up payouts
            </Text>
            <Text style={stepBodyStyle}>
                Connect Stripe or add bank details so you can withdraw your sales. You won&apos;t be paid until this is done.
            </Text>
            <div style={inlineLinkWrapStyle}>
                <Link href={`${appUrl}/organiser/settings`} style={inlineLinkStyle}>
                    Configure payouts →
                </Link>
            </div>

            <Text style={stepStyle}>
                <strong style={stepNumStyle}>2.</strong> Create your first event
            </Text>
            <Text style={stepBodyStyle}>
                Add details, upload a banner, set ticket types and prices. Your event goes live the moment you publish.
            </Text>
            <div style={inlineLinkWrapStyle}>
                <Link href={`${appUrl}/organiser/events/new`} style={inlineLinkStyle}>
                    Create event →
                </Link>
            </div>

            <Text style={stepStyle}>
                <strong style={stepNumStyle}>3.</strong> Share your event page
            </Text>
            <Text style={stepBodyStyle}>
                Every event gets a public page with a unique URL. Drop the link in your socials, ads or messaging — sales start immediately.
            </Text>

            <div style={dividerStyle} />

            <Text style={subHeadingStyle}>Why organisers love Hexlura</Text>

            <Text style={listItemStyle}>· Zero monthly fees — keep 100% of your face value</Text>
            <Text style={listItemStyle}>· Payouts within 2 business days of your event ending</Text>
            <Text style={listItemStyle}>· Built-in QR code check-in with the door scanner</Text>
            <Text style={listItemStyle}>· Real-time analytics and attendee data</Text>

            <Text style={noteStyle}>
                Got a question? Reach our team at{' '}
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

const subHeadingStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '15px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '24px 0 16px 0',
}

const stepStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '15px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '20px 0 4px 0',
}

const stepNumStyle: React.CSSProperties = {
    color: '#E63950',
    marginRight: '8px',
}

const stepBodyStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#666677',
    lineHeight: 1.6,
    margin: '0 0 8px 0',
}

const inlineLinkWrapStyle: React.CSSProperties = {
    margin: '0 0 12px 0',
}

const inlineLinkStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#E63950',
    fontWeight: 700,
    textDecoration: 'none',
}

const listItemStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#444455',
    lineHeight: 1.6,
    margin: '0 0 8px 0',
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
