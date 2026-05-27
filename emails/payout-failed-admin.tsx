import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface PayoutFailedAdminProps {
    organiserName: string
    eventName: string
    amount: string
    failureReason: string
    dashboardUrl: string
}

export default function PayoutFailedAdmin({
    organiserName,
    eventName,
    amount,
    failureReason,
    dashboardUrl,
}: PayoutFailedAdminProps) {
    return (
        <BaseEmail previewText="Payout failed — manual action required">
            <Text style={crossStyle}>❌</Text>
            <Text style={headingStyle}>PAYOUT FAILED</Text>

            <Text style={bodyStyle}>
                A payout has failed and requires manual action.
            </Text>

            <div style={detailsBoxStyle}>
                <div style={rowStyle}>
                    <span style={labelStyle}>Organiser</span>
                    <span style={valueStyle}>{organiserName}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Event</span>
                    <span style={valueStyle}>{eventName}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Amount</span>
                    <span style={amountStyle}>{amount}</span>
                </div>
                <div style={reasonWrapStyle}>
                    <span style={labelStyle}>Reason</span>
                    <span style={reasonStyle}>{failureReason}</span>
                </div>
            </div>

            <div style={buttonWrapStyle}>
                <Link href={dashboardUrl} style={buttonStyle}>
                    View in Dashboard →
                </Link>
            </div>

            <Text style={urgentStyle}>
                Please resolve this within 24 hours to maintain organiser trust.
            </Text>
        </BaseEmail>
    )
}

const crossStyle: React.CSSProperties = {
    fontSize: '48px',
    textAlign: 'center',
    margin: '0 0 8px 0',
}

const headingStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '28px',
    fontWeight: 900,
    color: '#E63950',
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
    minWidth: '80px',
    flexShrink: 0,
}

const valueStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#0A0A0F',
    textAlign: 'right' as const,
}

const amountStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    fontWeight: 700,
    color: '#E63950',
    textAlign: 'right' as const,
}

const reasonStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#0A0A0F',
    textAlign: 'right' as const,
    flex: 1,
}

const buttonWrapStyle: React.CSSProperties = {
    margin: '0 0 24px 0',
}

const buttonStyle: React.CSSProperties = {
    backgroundColor: '#0A0A0F',
    color: '#FFFFFF',
    padding: '14px 32px',
    fontSize: '14px',
    fontWeight: 700,
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: 'Arial, sans-serif',
}

const urgentStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#E63950',
    margin: 0,
}
