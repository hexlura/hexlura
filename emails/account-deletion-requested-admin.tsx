import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, Divider, Eyebrow, Icon, Lead, Note, Notice, Quote, Row, Title } from './components/kit'

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
        <BaseEmail previewText={`Account deletion requested: ${orgName}`} tag="Admin">
            <Icon glyph="!" tone="red" />
            <Eyebrow>Awaiting your review</Eyebrow>
            <Title>ACCOUNT DELETION REQUESTED</Title>
            <Lead>
                An organiser has asked to permanently delete their account and everything tied to it.
                Nothing has been deleted yet — it&apos;s awaiting your review.
            </Lead>

            <Card>
                <Row label="Organiser">{orgName}</Row>
                <Row label="Contact">{requesterEmail}</Row>
                <Row label="Events on account">{eventCount}</Row>
                <Row label="Confirmed bookings affected" last><strong>{confirmedBookingCount}</strong></Row>
            </Card>

            <Quote label="Organiser's stated reason">{reason}</Quote>

            {confirmedBookingCount > 0 && (
                <Notice tone="red" title="Refunds will be issued">
                    Approving this will automatically refund all {confirmedBookingCount} confirmed
                    booking{confirmedBookingCount === 1 ? '' : 's'} across this organiser&apos;s events before the account is deleted.
                </Notice>
            )}

            <Button href={`${appUrl}/admin/account-deletion-requests`}>Review request →</Button>

            <Divider />
            <Note>This is an internal admin notification. Do not forward this email.</Note>
        </BaseEmail>
    )
}
