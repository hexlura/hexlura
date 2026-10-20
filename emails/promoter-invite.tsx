import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, Eyebrow, Icon, Note, P, Row, Title } from './components/kit'

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
        <BaseEmail previewText={`${orgName} invited you to promote ${eventName}`} tag="Promoter">
            <Icon glyph="%" tone="green" />
            <Eyebrow>Promoter invitation</Eyebrow>
            <Title>YOU&apos;VE BEEN INVITED</Title>
            <P>
                <strong>{orgName}</strong> has invited you to promote one of their events on Hexlura and earn commission on every ticket you sell.
            </P>

            <Card>
                <Row label="Event">{eventName}</Row>
                <Row label="Date">{eventDate}</Row>
                <Row label="Commission" tone="green" last>
                    {commissionPercent}% of each ticket sold via your link
                </Row>
            </Card>

            {isPromoter ? (
                <P>Click below to accept the invitation. Your referral link will be added to your promoter dashboard.</P>
            ) : (
                <P>
                    You&apos;ll need a free Hexlura promoter account to accept. The button below will walk you through it in under a minute.
                </P>
            )}

            <Button href={acceptUrl}>{isPromoter ? 'Accept invitation →' : 'Accept & join →'}</Button>
            <Note center>If you weren&apos;t expecting this email you can safely ignore it.</Note>
        </BaseEmail>
    )
}
