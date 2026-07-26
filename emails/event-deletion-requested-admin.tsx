import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface EventDeletionRequestedAdminProps {
    orgName: string
    organiserEmail: string
    eventTitle: string
    reason: string
    confirmedBookingCount: number
    revenuePence: number
    appUrl: string
}

function formatGBP(pence: number): string {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(pence / 100)
}

export default function EventDeletionRequestedAdmin({
    orgName,
    organiserEmail,
    eventTitle,
    reason,
    confirmedBookingCount,
    revenuePence,
    appUrl,
}: EventDeletionRequestedAdminProps) {
    return (
        <BaseEmail previewText={`Event deletion requested: ${eventTitle} (${orgName})`}>
            <Text style={headingStyle}>EVENT DELETION REQUESTED</Text>

            <Text style={bodyTextStyle}>
                An organiser has asked to permanently delete an event. It has been unpublished and is
                awaiting your review — it will not be deleted until you approve it.
            </Text>

            <div style={detailBoxStyle}>
                <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                    <tbody>
                        <tr>
                            <td style={rowLabelStyle}>Organiser</td>
                            <td style={rowValueStyle}>{orgName}</td>
                        </tr>
                        <tr>
                            <td style={rowLabelStyle}>Contact</td>
                            <td style={rowValueStyle}>{organiserEmail}</td>
                        </tr>
                        <tr>
                            <td style={rowLabelStyle}>Event</td>
                            <td style={rowValueStyle}>{eventTitle}</td>
                        </tr>
                        <tr>
                            <td style={rowLabelStyle}>Confirmed bookings</td>
                            <td style={rowValueStyle}><strong>{confirmedBookingCount}</strong></td>
                        </tr>
                        <tr>
                            <td style={rowLabelStyle}>Revenue at stake</td>
                            <td style={rowValueStyle}>{formatGBP(revenuePence)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <Text style={reasonLabelStyle}>ORGANISER&apos;S STATED REASON</Text>
            <Text style={reasonTextStyle}>{reason}</Text>

            <div style={buttonWrapStyle}>
                <Link href={`${appUrl}/admin/event-deletion-requests`} style={primaryButtonStyle}>
                    Review Request →
                </Link>
            </div>

            <div style={dividerStyle} />

            <Text style={noteStyle}>
                This is an internal admin notification. Do not forward this email.
            </Text>
        </BaseEmail>
    )
}

const headingStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '26px',
    fontWeight: 900,
    color: '#0A0A0F',
    margin: '0 0 24px 0',
}

const bodyTextStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#666677',
    lineHeight: 1.6,
    margin: '0 0 24px 0',
}

const detailBoxStyle: React.CSSProperties = {
    border: '1px solid #EEEEEE',
    padding: '8px 16px',
    margin: '0 0 24px 0',
}

const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
}

const rowLabelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#666677',
    padding: '10px 0',
    borderBottom: '1px solid #EEEEEE',
    width: '40%',
}

const rowValueStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#0A0A0F',
    padding: '10px 0',
    borderBottom: '1px solid #EEEEEE',
    textAlign: 'right',
}

const reasonLabelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '11px',
    fontWeight: 700,
    color: '#E63950',
    letterSpacing: '1px',
    margin: '0 0 8px 0',
}

const reasonTextStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#333344',
    lineHeight: 1.6,
    margin: '0 0 24px 0',
    whiteSpace: 'pre-wrap',
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
