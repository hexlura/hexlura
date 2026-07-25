import { Text, Link } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface NewEventFollowersProps {
    orgName: string
    eventTitle: string
    eventDate: string
    venueName: string | null
    eventUrl: string
}

export default function NewEventFollowers({ orgName, eventTitle, eventDate, venueName, eventUrl }: NewEventFollowersProps) {
    return (
        <BaseEmail previewText={`${orgName} just announced: ${eventTitle}`}>
            <Text style={labelStyle}>NEW FROM {orgName.toUpperCase()}</Text>

            <div style={eventBadgeStyle}>
                <Text style={eventTitleStyle}>{eventTitle}</Text>
                <Text style={eventMetaStyle}>{eventDate}</Text>
                {venueName && <Text style={eventMetaStyle}>{venueName}</Text>}
            </div>

            <Text style={messageStyle}>
                {orgName} — an organiser you follow on Hexlura — just announced a new event.
            </Text>

            <div style={buttonWrapStyle}>
                <Link href={eventUrl} style={buttonStyle}>
                    View Event →
                </Link>
            </div>

            <Text style={noteStyle}>
                You&apos;re receiving this because you follow {orgName} on Hexlura. You can turn off these emails
                from your account settings at any time.
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
    margin: '0 0 4px 0',
}

const eventMetaStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#C0C0D0',
    margin: 0,
}

const messageStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#333344',
    lineHeight: 1.7,
    margin: '0 0 24px 0',
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
