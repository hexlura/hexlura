import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Card, CardSub, CardTitle, Divider, Eyebrow, Icon, Lead, Note, Notice, P, SupportLink, Title } from './components/kit'

interface EventCancelledProps {
    eventTitle: string
    eventDate: string
    refundNote: string
}

export default function EventCancelled({ eventTitle, eventDate, refundNote }: EventCancelledProps) {
    return (
        <BaseEmail previewText={`${eventTitle} has been cancelled`} tag="Event update">
            <Icon glyph="✕" tone="red" />
            <Eyebrow>Event cancellation</Eyebrow>
            <Title>EVENT CANCELLED</Title>
            <Lead>
                We&apos;re sorry to let you know that <strong style={{ color: '#1A0E0C' }}>{eventTitle}</strong> has been cancelled.
            </Lead>

            <Card>
                <CardTitle>{eventTitle}</CardTitle>
                <CardSub>{eventDate}</CardSub>
            </Card>

            <Notice title="Refund info">{refundNote}</Notice>

            <P>
                We apologise for any inconvenience caused. If you have questions, please contact us at <SupportLink />.
            </P>

            <Divider />
            <Note>You received this because you had a booking for {eventTitle}.</Note>
        </BaseEmail>
    )
}
