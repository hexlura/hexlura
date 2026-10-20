import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, Divider, Eyebrow, Icon, Note, P, Row, SupportLink, Title } from './components/kit'

interface OrganiserIdentityVerifiedProps {
    fullName: string
    orgName: string
    verifiedAt: string
    appUrl: string
}

export default function OrganiserIdentityVerified({
    fullName,
    orgName,
    verifiedAt,
    appUrl,
}: OrganiserIdentityVerifiedProps) {
    return (
        <BaseEmail previewText={`Identity verified for ${orgName} — payouts are now enabled`} tag="Payouts">
            <Icon glyph="✓" tone="green" />
            <Eyebrow>Organiser</Eyebrow>
            <Title>IDENTITY VERIFIED</Title>
            <P>Hi {fullName},</P>
            <P>
                We&apos;ve confirmed your identity for <strong>{orgName}</strong>. Your account is now eligible to request payouts whenever your balance becomes available.
            </P>

            <Card>
                <Row label="Verified on" last>{verifiedAt}</Row>
            </Card>

            <P>
                Verification is a one-time check. You won&apos;t need to do this again unless we ever ask you to re-confirm.
            </P>

            <Button href={`${appUrl}/organiser/payouts`}>Go to payouts →</Button>

            <Divider />
            <Note>
                Questions? Contact <SupportLink />.
            </Note>
        </BaseEmail>
    )
}
