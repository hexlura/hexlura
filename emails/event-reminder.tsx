import { Text, Link } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface EventReminderProps {
    eventTitle: string
    eventDate: string
    eventTime: string
    venueName: string
    venueAddress: string
    eventUrl: string
    downloadUrl: string
}

export default function EventReminder({
    eventTitle,
    eventDate,
    eventTime,
    venueName,
    venueAddress,
    eventUrl,
    downloadUrl,
}: EventReminderProps) {
    return (
        <BaseEmail previewText={`Reminder: ${eventTitle} is tomorrow!`}>
            <Text style={labelStyle}>EVENT REMINDER</Text>

            <Text style={headingStyle}>YOUR EVENT IS TOMORROW</Text>
            <Text style={subStyle}>Don&apos;t forget — your tickets are ready.</Text>

            <div style={cardStyle}>
                <Text style={eventTitleStyle}>{eventTitle}</Text>
                <Text style={rowStyle}>📅 {eventDate}</Text>
                <Text style={rowStyle}>🕐 {eventTime}</Text>
                <Text style={rowStyle}>📍 {venueName}{venueAddress ? `, ${venueAddress}` : ''}</Text>
            </div>

            <div style={buttonWrapStyle}>
                <Link href={downloadUrl} style={primaryBtnStyle}>
                    Download Ticket →
                </Link>
            </div>

            <div style={buttonWrapStyle}>
                <Link href={eventUrl} style={secondaryBtnStyle}>
                    View Event Details
                </Link>
            </div>

            <Text style={noteStyle}>
                Show your QR code at the door. Each code is valid for one scan only.
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
    color: '#666677',
    margin: '0 0 24px 0',
}

const cardStyle: React.CSSProperties = {
    backgroundColor: '#F5F5F7',
    padding: '20px',
    margin: '0 0 24px 0',
}

const eventTitleStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '18px',
    fontWeight: 900,
    color: '#0A0A0F',
    margin: '0 0 12px 0',
}

const rowStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#333344',
    margin: '4px 0',
}

const buttonWrapStyle: React.CSSProperties = {
    textAlign: 'center',
    margin: '0 0 12px 0',
}

const primaryBtnStyle: React.CSSProperties = {
    backgroundColor: '#E63950',
    color: '#FFFFFF',
    padding: '14px 36px',
    fontSize: '15px',
    fontWeight: 700,
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: 'Arial, sans-serif',
}

const secondaryBtnStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    color: '#E63950',
    padding: '10px 24px',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: 'Arial, sans-serif',
    border: '1px solid #E63950',
}

const noteStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#8888AA',
    textAlign: 'center',
    margin: '16px 0 0 0',
}
