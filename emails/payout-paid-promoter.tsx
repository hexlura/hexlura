import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface PayoutPaidPromoterProps {
    fullName: string
    displayName: string
    referralCode: string
    netPence: number
    paidAt: string
    reference: string
    appUrl: string
}

const gbp = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
})

function formatGBP(pence: number): string {
    return gbp.format(pence / 100)
}

export default function PayoutPaidPromoter({
    fullName,
    displayName,
    referralCode,
    netPence,
    paidAt,
    reference,
    appUrl,
}: PayoutPaidPromoterProps) {
    const amount = formatGBP(netPence)

    return (
        <BaseEmail previewText={`Your commission of ${amount} is on its way`}>
            <Text style={headingStyle}>COMMISSION PAID</Text>

            <Text style={greetingStyle}>Hi {fullName},</Text>

            <Text style={bodyTextStyle}>
                Nice work — your commission earnings as <strong>{displayName}</strong> have just been released by bank transfer to your nominated account. Keep sharing your link to earn more.
            </Text>

            <div style={amountBoxStyle}>
                <Text style={amountLabelStyle}>YOUR COMMISSION</Text>
                <Text style={amountValueStyle}>{amount}</Text>
                <Text style={amountSubStyle}>Sent on {paidAt}</Text>
            </div>

            <Text style={subHeadingStyle}>Payout details</Text>

            <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                <tbody>
                    <tr>
                        <td style={rowLabelStyle}>Promoter code</td>
                        <td style={rowMonoValueStyle}>{referralCode}</td>
                    </tr>
                    <tr>
                        <td style={rowLabelStyle}>Method</td>
                        <td style={rowValueStyle}>Bank transfer</td>
                    </tr>
                    <tr>
                        <td style={rowLabelStyle}>Reference</td>
                        <td style={rowMonoValueStyle}>{reference}</td>
                    </tr>
                </tbody>
            </table>

            <Text style={bodyTextStyle}>
                Funds typically arrive in your bank account within 1–2 business days. If you don&apos;t see them after that, let us know and we&apos;ll chase it up.
            </Text>

            <div style={buttonWrapStyle}>
                <Link href={`${appUrl}/promoter/payouts`} style={primaryButtonStyle}>
                    View payout history →
                </Link>
            </div>

            <div style={dividerStyle} />

            <Text style={noteStyle}>
                Something not right? Reply to this email or contact{' '}
                <Link href="mailto:support@hexlura.com" style={linkStyle}>
                    support@hexlura.com
                </Link>
                {' '}— we usually respond within a few hours.
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

const greetingStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '18px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '0 0 12px 0',
}

const bodyTextStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#666677',
    lineHeight: 1.6,
    margin: '0 0 24px 0',
}

const subHeadingStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '15px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '24px 0 12px 0',
}

const amountBoxStyle: React.CSSProperties = {
    backgroundColor: '#0A0A0F',
    padding: '24px',
    margin: '0 0 24px 0',
    textAlign: 'center',
}

const amountLabelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '11px',
    fontWeight: 700,
    color: '#8888AA',
    letterSpacing: '2px',
    margin: '0 0 8px 0',
}

const amountValueStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '36px',
    fontWeight: 900,
    color: '#FFFFFF',
    margin: '0 0 8px 0',
}

const amountSubStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#8888AA',
    margin: 0,
}

const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '0 0 24px 0',
}

const rowLabelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#666677',
    padding: '10px 0',
    borderBottom: '1px solid #EEEEEE',
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

const linkStyle: React.CSSProperties = {
    color: '#E63950',
    textDecoration: 'none',
}
