import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Icon, P, Title } from './components/kit'

interface AccountDeletionApprovedProps {
    fullName: string
    orgName: string
}

export default function AccountDeletionApproved({ fullName, orgName }: AccountDeletionApprovedProps) {
    return (
        <BaseEmail previewText="Your Hexlura account has been deleted" tag="Account">
            <Icon glyph="✓" tone="ink" />
            <Title>YOUR ACCOUNT HAS BEEN DELETED</Title>
            <P>Hi {fullName},</P>
            <P>
                As requested, your Hexlura account for <strong>{orgName}</strong> and its associated
                data have now been permanently deleted. If any of your events had confirmed bookings,
                those attendees have already been refunded in full.
            </P>
            <P>
                This action is final and cannot be reversed. If this wasn&apos;t you, or you have any
                questions, please contact us at support@hexlura.com immediately.
            </P>
        </BaseEmail>
    )
}
