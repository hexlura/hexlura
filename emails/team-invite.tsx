import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Divider, Eyebrow, Icon, Lead, Note, P, Title } from './components/kit'

interface TeamInviteProps {
    orgName: string
    acceptUrl: string
}

export default function TeamInvite({ orgName, acceptUrl }: TeamInviteProps) {
    return (
        <BaseEmail previewText={`You've been invited to join ${orgName} as Door Staff on Hexlura`} tag="Team invitation">
            <Icon glyph="+" tone="ink" />
            <Eyebrow>You&apos;re invited</Eyebrow>
            <Title>TEAM INVITATION</Title>
            <Lead>You&apos;ve been invited to join a team.</Lead>

            <P>
                <strong>{orgName}</strong> has invited you to join their team as <strong>Door Staff</strong> on Hexlura.
                As door staff, you&apos;ll have access to the ticket scanner to check in attendees at their events.
            </P>

            <Button href={acceptUrl}>Accept invitation →</Button>
            <Note center>If you don&apos;t have a Hexlura account yet, you&apos;ll be asked to create one first.</Note>

            <Divider />
            <Note>If you weren&apos;t expecting this invitation, you can safely ignore this email.</Note>
        </BaseEmail>
    )
}
