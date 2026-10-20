import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, CardTitle, EventFacts, Eyebrow, Icon, Lead, Note, Title } from './components/kit'

interface EventReminderProps {
    eventTitle: string
    eventDate: string
    eventTime: string
    venueName: string
    venueAddress: string
    eventUrl: string
    downloadUrl: string
}

export default function EventReminder({
    eventTitle,
    eventDate,
    eventTime,
    venueName,
    venueAddress,
    eventUrl,
    downloadUrl,
}: EventReminderProps) {
    return (
        <BaseEmail previewText={`Reminder: ${eventTitle} is tomorrow!`} tag="Reminder">
            <Icon glyph="24h" tone="amber" />
            <Eyebrow>Event reminder</Eyebrow>
            <Title>YOUR EVENT IS TOMORROW</Title>
            <Lead>Don&apos;t forget — your tickets are ready.</Lead>

            <Card>
                <CardTitle>{eventTitle}</CardTitle>
                <EventFacts date={eventDate} time={eventTime} venue={`${venueName}${venueAddress ? `, ${venueAddress}` : ''}`} />
            </Card>

            <Button href={downloadUrl}>Download ticket →</Button>
            <Button href={eventUrl} ghost>View event details</Button>

            <Note center>Show your QR code at the door. Each code is valid for one scan only.</Note>
        </BaseEmail>
    )
}
