import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface RefundRequestOrganiserProps {
    organiserName: string
    eventName: string
    buyerName: string
    bookingRef: string
    refundAmount: string
    reason: string
    reviewUrl: string
}

// NOTE: This template is sent when a buyer requests a refund.
// Wire this up in the buyer refund submission route (e.g. /api/bookings/refund-request).

export default function RefundRequestOrganiser({
    organiserName,
    eventName,
    buyerName,
    bookingRef,
    refundAmount,
    reason,
    reviewUrl,
}: RefundRequestOrganiserProps) {
    return (
        <BaseEmail previewText={`Refund request for ${eventName}`}>
            <Text style={warningStyle}>⚠️</Text>
            <Text style={headingStyle}>REFUND REQUEST</Text>

            <Text style={greetingStyle}>Hi {organiserName},</Text>
            <Text style={bodyStyle}>A buyer has requested a refund for <strong>{eventName}</strong>.</Text>

            <div style={detailsBoxStyle}>
                <div style={rowStyle}>
                    <span style={labelStyle}>Buyer</span>
                    <span style={valueStyle}>{buyerName}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Booking Ref</span>
                    <span style={refStyle}>{bookingRef}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Refund Amount</span>
                    <span style={valueStyle}>{refundAmount}</span>
                </div>
                <div style={reasonWrapStyle}>
                    <span style={labelStyle}>Reason</span>
                    <span style={reasonStyle}>{reason}</span>
                </div>
            </div>

            <Text style={urgentStyle}>
                You have 48 hours to approve or reject this request.
            </Text>

            <div style={buttonWrapStyle}>
                <Link href={reviewUrl} style={buttonStyle}>
                    Review Request →
                </Link>
            </div>

            <Text style={noteStyle}>
                If you approve, the refund will be reviewed by the Hexlura admin team before processing.
            </Text>
        </BaseEmail>
    )
}

const warningStyle: React.CSSProperties = {
    fontSize: '48px',
    textAlign: 'center',
    margin: '0 0 8px 0',
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
    fontSize: '16px',
    color: '#0A0A0F',
    margin: '0 0 8px 0',
}

const bodyStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    color: '#0A0A0F',
    margin: '0 0 24px 0',
}

const detailsBoxStyle: React.CSSProperties = {
    backgroundColor: '#F5F5F7',
    padding: '20px',
    margin: '0 0 24px 0',
}

const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
}

const reasonWrapStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    gap: '16px',
}

const labelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#8888AA',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    minWidth: '100px',
    flexShrink: 0,
}

const valueStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#0A0A0F',
    textAlign: 'right' as const,
}

const refStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#E63950',
    fontWeight: 700,
    textAlign: 'right' as const,
}

const reasonStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#0A0A0F',
    textAlign: 'right' as const,
    flex: 1,
}

const urgentStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    fontWeight: 700,
    color: '#E63950',
    margin: '0 0 24px 0',
}

const buttonWrapStyle: React.CSSProperties = {
    margin: '0 0 24px 0',
}

const buttonStyle: React.CSSProperties = {
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
    margin: 0,
}
