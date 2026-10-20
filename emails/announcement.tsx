import React from 'react'
import BaseEmail from './components/BaseEmail'
import { A, Button, Card, CardTitle, Divider, Eyebrow, Note, P } from './components/kit'

interface AnnouncementProps {
    eventTitle: string
    subject: string
    message: string
    eventUrl: string
}

export default function Announcement({ eventTitle, subject, message, eventUrl }: AnnouncementProps) {
    return (
        <BaseEmail previewText={`${eventTitle}: ${subject}`} tag="From the organiser">
            <Eyebrow>Message from the organiser</Eyebrow>

            <Card>
                <CardTitle>{eventTitle}</CardTitle>
            </Card>

            <P style={{ fontSize: '22px', lineHeight: '30px', fontWeight: 700, margin: '4px 0 0 0' }}>{subject}</P>
            <Divider />
            {/* The organiser's own text: keep their line breaks */}
            <P style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message}</P>
            <Divider />

            <Button href={eventUrl}>View event →</Button>

            <Note>
                You received this message because you have a booking for <A href={eventUrl}>{eventTitle}</A>.
            </Note>
        </BaseEmail>
    )
}
