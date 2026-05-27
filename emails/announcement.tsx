import { Text, Link } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface AnnouncementProps {
    eventTitle: string
    subject: string
    message: string
    eventUrl: string
}

export default function Announcement({ eventTitle, subject, message, eventUrl }: AnnouncementProps) {
    return (
        <BaseEmail previewText={`${eventTitle}: ${subject}`}>
            <Text style={labelStyle}>MESSAGE FROM THE ORGANISER</Text>

            <div style={eventBadgeStyle}>
                <Text style={eventTitleStyle}>{eventTitle}</Text>
            </div>

            <Text style={subjectStyle}>{subject}</Text>

            <div style={dividerStyle} />

            <Text style={messageStyle}>{message}</Text>

            <div style={dividerStyle} />

            <div style={buttonWrapStyle}>
                <Link href={eventUrl} style={buttonStyle}>
                    View Event →
                </Link>
            </div>

            <Text style={noteStyle}>
                You received this message because you have a booking for{' '}
                <Link href={eventUrl} style={linkStyle}>{eventTitle}</Link>.
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

const eventBadgeStyle: React.CSSProperties = {
    backgroundColor: '#0A0A0F',
    padding: '16px 20px',
    margin: '0 0 24px 0',
}

const eventTitleStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '18px',
    fontWeight: 900,
    color: '#FFFFFF',
    margin: 0,
}

const subjectStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '20px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '0 0 20px 0',
    lineHeight: 1.3,
}

const dividerStyle: React.CSSProperties = {
    borderTop: '1px solid #EEEEEE',
    margin: '20px 0',
}

const messageStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#333344',
    lineHeight: 1.7,
    margin: '0 0 24px 0',
    whiteSpace: 'pre-wrap',
}

const buttonWrapStyle: React.CSSProperties = {
    margin: '0 0 24px 0',
}

const buttonStyle: React.CSSProperties = {
    backgroundColor: '#E63950',
    color: '#FFFFFF',
    padding: '12px 28px',
    fontSize: '13px',
    fontWeight: 700,
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: 'Arial, sans-serif',
}

const noteStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#8888AA',
    lineHeight: 1.6,
    margin: 0,
}

const linkStyle: React.CSSProperties = {
    color: '#E63950',
    textDecoration: 'none',
}
