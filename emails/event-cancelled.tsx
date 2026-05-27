import { Text, Link } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface EventCancelledProps {
    eventTitle: string
    eventDate: string
    refundNote: string
}

export default function EventCancelled({ eventTitle, eventDate, refundNote }: EventCancelledProps) {
    return (
        <BaseEmail previewText={`${eventTitle} has been cancelled`}>
            <Text style={labelStyle}>EVENT CANCELLATION</Text>

            <div style={eventBadgeStyle}>
                <Text style={eventTitleStyle}>{eventTitle}</Text>
                <Text style={eventDateStyle}>{eventDate}</Text>
            </div>

            <Text style={bodyStyle}>
                We&apos;re sorry to let you know that <strong>{eventTitle}</strong> has been cancelled.
            </Text>

            <div style={refundBoxStyle}>
                <Text style={refundLabelStyle}>REFUND INFO</Text>
                <Text style={refundTextStyle}>{refundNote}</Text>
            </div>

            <Text style={bodyStyle}>
                We apologise for any inconvenience caused. If you have questions, please contact us at{' '}
                <Link href="mailto:support@hexlura.com" style={linkStyle}>support@hexlura.com</Link>.
            </Text>

            <div style={dividerStyle} />

            <Text style={noteStyle}>
                You received this because you had a booking for {eventTitle}.
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
    padding: '20px 24px',
    margin: '0 0 24px 0',
}

const eventTitleStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '20px',
    fontWeight: 900,
    color: '#FFFFFF',
    margin: '0 0 6px 0',
}

const eventDateStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#8888AA',
    margin: 0,
}

const bodyStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#333344',
    lineHeight: 1.7,
    margin: '0 0 20px 0',
}

const refundBoxStyle: React.CSSProperties = {
    backgroundColor: '#F5F5F7',
    borderLeft: '3px solid #E63950',
    padding: '16px 20px',
    margin: '0 0 24px 0',
}

const refundLabelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '10px',
    fontWeight: 700,
    color: '#8888AA',
    letterSpacing: '2px',
    margin: '0 0 6px 0',
}

const refundTextStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#0A0A0F',
    margin: 0,
    lineHeight: 1.6,
}

const dividerStyle: React.CSSProperties = {
    borderTop: '1px solid #EEEEEE',
    margin: '20px 0',
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
