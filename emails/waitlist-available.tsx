import { Text, Link } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface WaitlistAvailableProps {
    eventTitle: string
    eventUrl: string
}

export default function WaitlistAvailable({ eventTitle, eventUrl }: WaitlistAvailableProps) {
    return (
        <BaseEmail previewText={`Good news — tickets for ${eventTitle} are available!`}>
            <Text style={labelStyle}>WAITLIST ALERT</Text>

            <Text style={headingStyle}>A SPOT HAS OPENED UP</Text>
            <Text style={subStyle}>
                Tickets for <strong>{eventTitle}</strong> are now available. Act fast — these go quickly.
            </Text>

            <div style={cardStyle}>
                <Text style={eventTitleStyle}>{eventTitle}</Text>
                <Text style={noteStyle}>
                    You joined the waitlist for this event. Tickets are available now on a first-come, first-served basis.
                </Text>
            </div>

            <div style={buttonWrapStyle}>
                <Link href={eventUrl} style={btnStyle}>
                    Book Now →
                </Link>
            </div>

            <Text style={footerNoteStyle}>
                Availability is not guaranteed — book as soon as possible to secure your spot.
            </Text>
        </BaseEmail>
    )
}

const labelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '11px',
    fontWeight: 700,
    color: '#E63950',
    letterSpacing: '2px',
    margin: '0 0 16px 0',
}

const headingStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '28px',
    fontWeight: 900,
    color: '#0A0A0F',
    margin: '0 0 8px 0',
}

const subStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '15px',
    color: '#333344',
    lineHeight: 1.6,
    margin: '0 0 24px 0',
}

const cardStyle: React.CSSProperties = {
    backgroundColor: '#F5F5F7',
    borderLeft: '4px solid #E63950',
    padding: '20px',
    margin: '0 0 28px 0',
}

const eventTitleStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '18px',
    fontWeight: 900,
    color: '#0A0A0F',
    margin: '0 0 8px 0',
}

const noteStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#666677',
    margin: 0,
}

const buttonWrapStyle: React.CSSProperties = {
    textAlign: 'center',
    margin: '0 0 16px 0',
}

const btnStyle: React.CSSProperties = {
    backgroundColor: '#E63950',
    color: '#FFFFFF',
    padding: '14px 40px',
    fontSize: '16px',
    fontWeight: 700,
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: 'Arial, sans-serif',
}

const footerNoteStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#8888AA',
    textAlign: 'center',
    margin: 0,
}
