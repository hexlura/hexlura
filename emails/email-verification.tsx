import { Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface EmailVerificationProps {
    userName: string
    verifyUrl: string
}

// NOTE: This template is for reference / custom email flows only.
// For Supabase Auth email verification, update the template in:
// Supabase Dashboard → Authentication → Email Templates → Confirm Signup

export default function EmailVerification({ userName, verifyUrl }: EmailVerificationProps) {
    return (
        <BaseEmail previewText="Verify your Hexlura email address">
            <Text style={headingStyle}>VERIFY YOUR EMAIL</Text>

            <Text style={welcomeStyle}>Welcome to Hexlura, {userName}!</Text>

            <Text style={bodyTextStyle}>
                Please verify your email address to complete your registration and start discovering live events.
            </Text>

            <div style={buttonWrapStyle}>
                <Link href={verifyUrl} style={buttonStyle}>
                    Verify Email Address →
                </Link>
            </div>

            <Text style={noteStyle}>This link expires in 24 hours.</Text>

            <Text style={noteStyle}>
                If you didn&apos;t create a Hexlura account, you can safely ignore this email.
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

const welcomeStyle: React.CSSProperties = {
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
    margin: '0 0 24px 0',
}

const buttonWrapStyle: React.CSSProperties = {
    margin: '0 0 24px 0',
}

const buttonStyle: React.CSSProperties = {
    backgroundColor: '#E63950',
    color: '#FFFFFF',
    padding: '14px 32px',
    fontSize: '14px',
    fontWeight: 700,
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: 'Arial, sans-serif',
}

const noteStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#8888AA',
    margin: '4px 0',
}
