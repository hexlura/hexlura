import React from 'react'
import BaseEmail from './components/BaseEmail'
import { A, Button, Card, CardSub, CardTitle, Divider, Eyebrow, Icon, Lead, Note, P, SupportLink, Title } from './components/kit'

interface EventPublishedProps {
    fullName: string
    eventTitle: string
    eventDate: string
    venueName: string | null
    eventUrl: string
    manageUrl: string
}

export default function EventPublished({
    fullName,
    eventTitle,
    eventDate,
    venueName,
    eventUrl,
    manageUrl,
}: EventPublishedProps) {
    return (
        <BaseEmail previewText={`${eventTitle} is now live on Hexlura`} tag="Event live">
            <Icon glyph="✓" tone="green" />
            <Eyebrow>Organiser</Eyebrow>
            <Title>YOU&apos;RE LIVE</Title>
            <Lead>
                Hi {fullName}, your event is now published on Hexlura and visible to buyers. Share the link below to start selling tickets.
            </Lead>

            <Card>
                <CardTitle>{eventTitle}</CardTitle>
                <CardSub>
                    {eventDate}{venueName ? ` · ${venueName}` : ''}
                </CardSub>
            </Card>

            <Button href={eventUrl}>View your live event →</Button>

            <P>
                Share <A href={eventUrl}>{eventUrl}</A> on your channels — every buyer that lands here can book in a few clicks.
            </P>
            <P>
                Need to update details, change ticket types, or pause sales? You can do all of that any time from the{' '}
                <A href={manageUrl}>event manager</A>.
            </P>

            <Divider />
            <Note>
                Questions? Contact <SupportLink />.
            </Note>
        </BaseEmail>
    )
}
