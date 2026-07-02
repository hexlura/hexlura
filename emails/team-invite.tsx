import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface TeamInviteProps {
    orgName: string
    acceptUrl: string
}

export default function TeamInvite({ orgName, acceptUrl }: TeamInviteProps) {
    return (
        <BaseEmail previewText={`You've been invited to join ${orgName} as Door Staff on Hexlura`}>
            <Text style={headingStyle}>TEAM INVITATION</Text>

            <Text style={greetingStyle}>You've been invited to join a team</Text>

            <Text style={bodyTextStyle}>
                <strong>{orgName}</strong> has invited you to join their team as <strong>Door Staff</strong> on Hexlura.
                As door staff, you'll have access to the ticket scanner to check in attendees at their events.
            </Text>

            <div style={buttonWrapStyle}>
                <Link href={acceptUrl} style={primaryButtonStyle}>
                    Accept Invitation →
                </Link>
            </div>

            <Text style={noteStyle}>
                If you don't have a Hexlura account yet, you'll be asked to create one first.
            </Text>

            <div style={dividerStyle} />

            <Text style={footerNoteStyle}>
                If you weren't expecting this invitation, you can safely ignore this email.
            </Text>
        </BaseEmail>
    )
}

const headingStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '28px',
    fontWeight: 900,
    color: '#0A0A0F',
    margin: '0 0 24px 0',
}

const greetingStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '18px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '0 0 12px 0',
}

const bodyTextStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#666677',
    lineHeight: 1.6,
    margin: '0 0 24px 0',
}

const buttonWrapStyle: React.CSSProperties = {
    margin: '0 0 24px 0',
}

const primaryButtonStyle: React.CSSProperties = {
    backgroundColor: '#E63950',
    color: '#FFFFFF',
    padding: '14px 32px',
    fontSize: '14px',
    fontWeight: 700,
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: 'Arial, sans-serif',
}

const dividerStyle: React.CSSProperties = {
    borderTop: '1px solid #EEEEEE',
    margin: '32px 0',
}

const noteStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#8888AA',
    lineHeight: 1.6,
    margin: '0 0 0 0',
}

const footerNoteStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#8888AA',
    lineHeight: 1.6,
    margin: '0',
}
