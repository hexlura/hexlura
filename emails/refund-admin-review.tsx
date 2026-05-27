import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface RefundAdminReviewProps {
    eventName: string
    organiserName: string
    buyerName: string
    buyerEmail: string
    bookingRef: string
    refundAmount: string
    feeKept: string
    reviewUrl: string
}

export default function RefundAdminReview({
    eventName,
    organiserName,
    buyerName,
    buyerEmail,
    bookingRef,
    refundAmount,
    feeKept,
    reviewUrl,
}: RefundAdminReviewProps) {
    return (
        <BaseEmail previewText="Refund approved by organiser — action required">
            <Text style={headingStyle}>ACTION REQUIRED</Text>
            <Text style={subheadingStyle}>REFUND AWAITING YOUR APPROVAL</Text>
            <Text style={bodyStyle}>
                An organiser has approved a refund request. Please review and confirm or deny.
            </Text>

            <div style={detailsBoxStyle}>
                <div style={rowStyle}>
                    <span style={labelStyle}>Event</span>
                    <span style={valueStyle}>{eventName}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Organiser</span>
                    <span style={valueStyle}>{organiserName}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Buyer</span>
                    <span style={valueStyle}>{buyerName} · {buyerEmail}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Booking Ref</span>
                    <span style={refStyle}>{bookingRef}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Refund Amount</span>
                    <span style={refundAmountStyle}>{refundAmount}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Platform Fee Kept</span>
                    <span style={feeKeptStyle}>{feeKept}</span>
                </div>
            </div>

            <div style={buttonWrapStyle}>
                <Link href={reviewUrl} style={buttonStyle}>
                    Review &amp; Confirm →
                </Link>
            </div>
        </BaseEmail>
    )
}

const headingStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '28px',
    fontWeight: 900,
    color: '#E63950',
    margin: '0 0 8px 0',
}

const subheadingStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '20px',
    fontWeight: 900,
    color: '#0A0A0F',
    margin: '0 0 16px 0',
}

const bodyStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#666677',
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

const labelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#8888AA',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    minWidth: '120px',
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

const refundAmountStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    fontWeight: 700,
    color: '#E63950',
    textAlign: 'right' as const,
}

const feeKeptStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    fontWeight: 700,
    color: '#00C48A',
    textAlign: 'right' as const,
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
