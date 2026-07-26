import { Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface AccountDeletionApprovedProps {
    fullName: string
    orgName: string
}

export default function AccountDeletionApproved({ fullName, orgName }: AccountDeletionApprovedProps) {
    return (
        <BaseEmail previewText="Your Hexlura account has been deleted">
            <Text style={headingStyle}>YOUR ACCOUNT HAS BEEN DELETED</Text>

            <Text style={bodyTextStyle}>Hi {fullName},</Text>

            <Text style={bodyTextStyle}>
                As requested, your Hexlura account for <strong>{orgName}</strong> and its associated
                data have now been permanently deleted. If any of your events had confirmed bookings,
                those attendees have already been refunded in full.
            </Text>

            <Text style={bodyTextStyle}>
                This action is final and cannot be reversed. If this wasn&apos;t you, or you have any
                questions, please contact us at support@hexlura.com immediately.
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
    color: '#333344',
    lineHeight: 1.7,
    margin: '0 0 20px 0',
}
