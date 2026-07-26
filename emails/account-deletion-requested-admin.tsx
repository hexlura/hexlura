import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface AccountDeletionRequestedAdminProps {
    orgName: string
    requesterEmail: string
    reason: string
    eventCount: number
    confirmedBookingCount: number
    appUrl: string
}

export default function AccountDeletionRequestedAdmin({
    orgName,
    requesterEmail,
    reason,
    eventCount,
    confirmedBookingCount,
    appUrl,
}: AccountDeletionRequestedAdminProps) {
    return (
        <BaseEmail previewText={`Account deletion requested: ${orgName}`}>
            <Text style={headingStyle}>ACCOUNT DELETION REQUESTED</Text>

            <Text style={bodyTextStyle}>
                An organiser has asked to permanently delete their account and everything tied to it.
                Nothing has been deleted yet — it&apos;s awaiting your review.
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
                            <td style={rowValueStyle}>{requesterEmail}</td>
                        </tr>
                        <tr>
                            <td style={rowLabelStyle}>Events on account</td>
                            <td style={rowValueStyle}>{eventCount}</td>
                        </tr>
                        <tr>
                            <td style={rowLabelStyle}>Confirmed bookings affected</td>
                            <td style={rowValueStyle}><strong>{confirmedBookingCount}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <Text style={reasonLabelStyle}>ORGANISER&apos;S STATED REASON</Text>
            <Text style={reasonTextStyle}>{reason}</Text>

            {confirmedBookingCount > 0 && (
                <Text style={warnTextStyle}>
                    Approving this will automatically refund all {confirmedBookingCount} confirmed
                    booking{confirmedBookingCount === 1 ? '' : 's'} across this organiser&apos;s events before the account is deleted.
                </Text>
            )}

            <div style={buttonWrapStyle}>
                <Link href={`${appUrl}/admin/account-deletion-requests`} style={primaryButtonStyle}>
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

const warnTextStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#E63950',
    lineHeight: 1.6,
    margin: '0 0 24px 0',
    fontWeight: 700,
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
