import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface PromoterPayoutRequestAdminProps {
    promoterName: string
    promoterEmail: string
    referralCode: string
    totalRequestedPence: number
    payoutCount: number
    appUrl: string
}

function formatGBP(pence: number): string {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(pence / 100)
}

export default function PromoterPayoutRequestAdmin({
    promoterName,
    promoterEmail,
    referralCode,
    totalRequestedPence,
    payoutCount,
    appUrl,
}: PromoterPayoutRequestAdminProps) {
    const amount = formatGBP(totalRequestedPence)

    return (
        <BaseEmail previewText={`New promoter payout request: ${promoterName} — ${amount}`}>
            <Text style={headingStyle}>NEW PROMOTER PAYOUT REQUEST</Text>

            <Text style={bodyTextStyle}>
                A promoter has submitted a payout withdrawal request and is awaiting your review.
            </Text>

            <div style={detailBoxStyle}>
                <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                    <tbody>
                        <tr>
                            <td style={rowLabelStyle}>Promoter</td>
                            <td style={rowValueStyle}>{promoterName}</td>
                        </tr>
                        <tr>
                            <td style={rowLabelStyle}>Contact</td>
                            <td style={rowValueStyle}>{promoterEmail}</td>
                        </tr>
                        <tr>
                            <td style={rowLabelStyle}>Referral code</td>
                            <td style={rowMonoValueStyle}>{referralCode}</td>
                        </tr>
                        <tr>
                            <td style={rowLabelStyle}>Amount requested</td>
                            <td style={rowValueStyle}><strong>{amount}</strong></td>
                        </tr>
                        <tr>
                            <td style={rowLabelStyle}>Payouts in batch</td>
                            <td style={rowValueStyle}>{payoutCount}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={buttonWrapStyle}>
                <Link href={`${appUrl}/admin/payouts`} style={primaryButtonStyle}>
                    Review in Admin Panel →
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
    fontSize: '28px',
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

const rowMonoValueStyle: React.CSSProperties = {
    fontFamily: 'Courier New, monospace',
    fontSize: '13px',
    color: '#0A0A0F',
    padding: '10px 0',
    borderBottom: '1px solid #EEEEEE',
    textAlign: 'right',
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
