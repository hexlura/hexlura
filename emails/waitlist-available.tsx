import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, CardSub, CardTitle, Eyebrow, Icon, Lead, Note, Title } from './components/kit'

interface WaitlistAvailableProps {
    eventTitle: string
    eventUrl: string
}

export default function WaitlistAvailable({ eventTitle, eventUrl }: WaitlistAvailableProps) {
    return (
        <BaseEmail previewText={`Good news — tickets for ${eventTitle} are available!`} tag="Waitlist">
            <Icon glyph="★" tone="green" />
            <Eyebrow>Waitlist alert</Eyebrow>
            <Title>A SPOT HAS OPENED UP</Title>
            <Lead>
                Tickets for <strong style={{ color: '#1A0E0C' }}>{eventTitle}</strong> are now available. Act fast — these go quickly.
            </Lead>

            <Card>
                <CardTitle>{eventTitle}</CardTitle>
                <CardSub>
                    You joined the waitlist for this event. Tickets are available now on a first-come, first-served basis.
                </CardSub>
            </Card>

            <Button href={eventUrl}>Book now →</Button>

            <Note center>Availability is not guaranteed — book as soon as possible to secure your spot.</Note>
        </BaseEmail>
    )
}
