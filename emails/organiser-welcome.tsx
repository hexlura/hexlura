import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, CheckList, Divider, Eyebrow, Icon, Lead, Note, P, Step, SubHeading, SupportLink, Title } from './components/kit'

interface OrganiserWelcomeProps {
    fullName: string
    orgName: string
    appUrl: string
}

export default function OrganiserWelcome({ fullName, orgName, appUrl }: OrganiserWelcomeProps) {
    return (
        <BaseEmail previewText={`${orgName} is live on Hexlura — start selling tickets`} tag="Welcome">
            <Icon glyph="✓" tone="green" />
            <Eyebrow>Organiser</Eyebrow>
            <Title>YOU&apos;RE LIVE</Title>
            <Lead>Welcome aboard, {fullName}!</Lead>
            <P>
                <strong>{orgName}</strong> is approved and your organiser dashboard is ready. You can create events, sell tickets, and check in attendees — all from one place.
            </P>

            <Button href={`${appUrl}/organiser`}>Go to dashboard →</Button>

            <SubHeading>Quick start checklist</SubHeading>
            <Step n={1} title="Set up payouts" href={`${appUrl}/organiser/settings`} linkLabel="Configure payouts →">
                Connect Stripe or add bank details so you can withdraw your sales. You won&apos;t be paid until this is done.
            </Step>
            <Step n={2} title="Create your first event" href={`${appUrl}/organiser/events/new`} linkLabel="Create event →">
                Add details, upload a banner, set ticket types and prices. Your event goes live the moment you publish.
            </Step>
            <Step n={3} title="Share your event page">
                Every event gets a public page with a unique URL. Drop the link in your socials, ads or messaging — sales start immediately.
            </Step>

            <Divider />
            <SubHeading>Why organisers love Hexlura</SubHeading>
            <CheckList
                items={[
                    'Zero monthly fees — keep 100% of your face value',
                    'Payouts within 2 business days of your event ending',
                    'Built-in QR code check-in with the door scanner',
                    'Real-time analytics and attendee data',
                ]}
            />

            <Note>
                Got a question? Reach our team at <SupportLink /> — we usually respond within a few hours.
            </Note>
        </BaseEmail>
    )
}
