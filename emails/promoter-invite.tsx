import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface PromoterInviteProps {
    orgName: string
    eventName: string
    eventDate: string
    commissionPercent: number
    acceptUrl: string
    isPromoter: boolean
}

export default function PromoterInvite({
    orgName, eventName, eventDate, commissionPercent, acceptUrl, isPromoter,
}: PromoterInviteProps) {
    return (
        <BaseEmail previewText={`${orgName} invited you to promote ${eventName}`}>
            <Text style={headingStyle}>YOU&apos;VE BEEN INVITED</Text>

            <Text style={bodyTextStyle}>
                <strong>{orgName}</strong> has invited you to promote one of their events on Hexlura and earn commission on every ticket you sell.
            </Text>

            <div style={detailsBoxStyle}>
                <Text style={detailLabelStyle}>EVENT</Text>
                <Text style={detailValueStyle}>{eventName}</Text>
                <Text style={detailMetaStyle}>{eventDate}</Text>

                <Text style={detailLabelStyle}>COMMISSION</Text>
                <Text style={commissionStyle}>{commissionPercent}%</Text>
                <Text style={detailMetaStyle}>of each ticket sold via your link</Text>
            </div>

            {isPromoter ? (
                <Text style={bodyTextStyle}>
                    Click below to accept the invitation. Your referral link will be added to your promoter dashboard.
                </Text>
            ) : (
                <Text style={bodyTextStyle}>
                    You&apos;ll need a free Hexlura promoter account to accept. The button below will walk you through it in under a minute.
                </Text>
            )}

            <div style={buttonWrapStyle}>
                <Link href={acceptUrl} style={primaryButtonStyle}>
                    {isPromoter ? 'Accept Invitation →' : 'Accept & Join →'}
                </Link>
            </div>

            <Text style={noteStyle}>
                If you weren&apos;t expecting this email you can safely ignore it.
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
    margin: '0 0 16px 0',
}
const detailsBoxStyle: React.CSSProperties = {
    background: '#F5F5F7',
    padding: '20px',
    margin: '16px 0 24px 0',
}
const detailLabelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '11px',
    color: '#8888AA',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: '0 0 4px 0',
}
const detailValueStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '18px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '0 0 4px 0',
}
const detailMetaStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#666677',
    margin: '0 0 16px 0',
}
const commissionStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '32px',
    fontWeight: 900,
    color: '#00C48A',
    margin: '0 0 4px 0',
}
const buttonWrapStyle: React.CSSProperties = { margin: '24px 0' }
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
const noteStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#8888AA',
    lineHeight: 1.6,
    margin: '16px 0 0 0',
}
