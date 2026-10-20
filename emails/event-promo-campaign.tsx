import React from 'react'
import BaseEmail from './components/BaseEmail'
import { A, Button, Card, CardTitle, Divider, Eyebrow, Note, P } from './components/kit'

interface EventPromoCampaignProps {
    orgName: string
    eventTitle: string
    subject: string
    message: string
    eventUrl: string
    unsubscribeUrl: string
}

export default function EventPromoCampaign({ orgName, eventTitle, subject, message, eventUrl, unsubscribeUrl }: EventPromoCampaignProps) {
    return (
        <BaseEmail previewText={`${orgName}: ${subject}`} tag="Update">
            <Eyebrow>From {orgName}</Eyebrow>

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
                You&apos;re receiving this because {orgName} added your email to a contact list on Hexlura.{' '}
                <A href={unsubscribeUrl}>Unsubscribe</A> at any time.
            </Note>
        </BaseEmail>
    )
}
