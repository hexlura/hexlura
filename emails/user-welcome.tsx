import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface UserWelcomeProps {
    fullName: string
    appUrl: string
}

export default function UserWelcome({ fullName, appUrl }: UserWelcomeProps) {
    return (
        <BaseEmail previewText="Welcome to Hexlura — discover live events near you">
            <Text style={headingStyle}>WELCOME TO HEXLURA</Text>

            <Text style={greetingStyle}>Hi {fullName},</Text>

            <Text style={bodyTextStyle}>
                Thanks for joining Hexlura — the UK&apos;s home for live events. Your account is ready, and you can now discover, book and manage tickets for everything from club nights and gigs to comedy and festivals.
            </Text>

            <div style={buttonWrapStyle}>
                <Link href={`${appUrl}/events`} style={primaryButtonStyle}>
                    Browse Events →
                </Link>
            </div>

            <Text style={subHeadingStyle}>What you can do next</Text>

            <Text style={listItemStyle}>
                · Find events by city, date or category
            </Text>
            <Text style={listItemStyle}>
                · Save events you love with the heart button
            </Text>
            <Text style={listItemStyle}>
                · Book tickets in seconds — they&apos;re emailed instantly with QR codes
            </Text>
            <Text style={listItemStyle}>
                · Manage all your bookings from your account dashboard
            </Text>

            <div style={dividerStyle} />

            <Text style={subHeadingStyle}>Run events of your own?</Text>

            <Text style={bodyTextStyle}>
                Hexlura is also the most organiser-friendly ticketing platform in the UK. Zero monthly fees, you keep 100% of face value, payouts within 2 business days.
            </Text>

            <div style={buttonWrapStyle}>
                <Link href={`${appUrl}/sell-tickets`} style={secondaryButtonStyle}>
                    Become an Organiser
                </Link>
            </div>

            <Text style={noteStyle}>
                If you haven&apos;t verified your email yet, please check your inbox for the verification link to unlock booking.
            </Text>

            <Text style={noteStyle}>
                Need help? Just reply to this email or contact{' '}
                <Link href="mailto:support@hexlura.com" style={linkStyle}>
                    support@hexlura.com
                </Link>
                .
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

const subHeadingStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '15px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '24px 0 12px 0',
}

const listItemStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#444455',
    lineHeight: 1.6,
    margin: '0 0 8px 0',
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

const secondaryButtonStyle: React.CSSProperties = {
    backgroundColor: '#0A0A0F',
    color: '#FFFFFF',
    padding: '12px 28px',
    fontSize: '13px',
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
    margin: '8px 0',
}

const linkStyle: React.CSSProperties = {
    color: '#E63950',
    textDecoration: 'none',
}
