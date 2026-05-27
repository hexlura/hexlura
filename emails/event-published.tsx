import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface EventPublishedProps {
    fullName: string
    eventTitle: string
    eventDate: string
    venueName: string | null
    eventUrl: string
    manageUrl: string
}

export default function EventPublished({
    fullName,
    eventTitle,
    eventDate,
    venueName,
    eventUrl,
    manageUrl,
}: EventPublishedProps) {
    return (
        <BaseEmail previewText={`${eventTitle} is now live on Hexlura`}>
            <Text style={headingStyle}>YOU&apos;RE LIVE</Text>

            <Text style={greetingStyle}>Hi {fullName},</Text>

            <Text style={bodyTextStyle}>
                Your event is now published on Hexlura and visible to buyers. Share the link below to start selling tickets.
            </Text>

            <div style={badgeBoxStyle}>
                <Text style={badgeLabelStyle}>EVENT</Text>
                <Text style={badgeValueStyle}>{eventTitle}</Text>
                <Text style={badgeSubStyle}>
                    {eventDate}{venueName ? ` · ${venueName}` : ''}
                </Text>
            </div>

            <div style={buttonWrapStyle}>
                <Link href={eventUrl} style={primaryButtonStyle}>
                    View your live event →
                </Link>
            </div>

            <Text style={bodyTextStyle}>
                Share <Link href={eventUrl} style={linkStyle}>{eventUrl}</Link> on your channels — every buyer that lands here can book in a few clicks.
            </Text>

            <Text style={bodyTextStyle}>
                Need to update details, change ticket types, or pause sales? You can do all of that any time from the{' '}
                <Link href={manageUrl} style={linkStyle}>event manager</Link>.
            </Text>

            <div style={dividerStyle} />

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
    fontSize: '22px',
    fontWeight: 900,
    color: '#FFFFFF',
    margin: '0 0 6px 0',
}

const badgeSubStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#C0C0C8',
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
