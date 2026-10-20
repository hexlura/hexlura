import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, CardSub, CardTitle, Eyebrow, Note, P } from './components/kit'

interface NewEventFollowersProps {
    orgName: string
    eventTitle: string
    eventDate: string
    venueName: string | null
    eventUrl: string
}

export default function NewEventFollowers({ orgName, eventTitle, eventDate, venueName, eventUrl }: NewEventFollowersProps) {
    return (
        <BaseEmail previewText={`${orgName} just announced: ${eventTitle}`} tag="New event">
            <Eyebrow>New from {orgName}</Eyebrow>

            <Card>
                <CardTitle>{eventTitle}</CardTitle>
                <CardSub>{eventDate}</CardSub>
                {venueName && <CardSub>{venueName}</CardSub>}
            </Card>

            <P>{orgName} — an organiser you follow on Hexlura — just announced a new event.</P>

            <Button href={eventUrl}>View event →</Button>

            <Note>
                You&apos;re receiving this because you follow {orgName} on Hexlura. You can turn off these emails
                from your account settings at any time.
            </Note>
        </BaseEmail>
    )
}
