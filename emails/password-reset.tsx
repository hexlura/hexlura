import { Hr, Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface PasswordResetProps {
    userName: string
    resetUrl: string
}

// NOTE: This template is for reference / custom email flows only.
// For Supabase Auth password reset emails, update the template in:
// Supabase Dashboard → Authentication → Email Templates → Reset Password

export default function PasswordReset({ userName, resetUrl }: PasswordResetProps) {
    return (
        <BaseEmail previewText="Reset your Hexlura password">
            <Text style={headingStyle}>PASSWORD RESET</Text>

            <Text style={greetingStyle}>Hi {userName},</Text>

            <Text style={bodyTextStyle}>
                We received a request to reset your password. Click the button below to choose a new password.
            </Text>

            <div style={buttonWrapStyle}>
                <Link href={resetUrl} style={buttonStyle}>
                    Reset Password →
                </Link>
            </div>

            <Text style={noteStyle}>This link expires in 1 hour.</Text>

            <Text style={noteStyle}>
                If you didn&apos;t request this, you can safely ignore this email.
            </Text>

            <Hr style={dividerStyle} />

            <Text style={securityNoteStyle}>
                For security, never share this link with anyone.
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
    fontSize: '16px',
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
    backgroundColor: '#0A0A0F',
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

const dividerStyle: React.CSSProperties = {
    borderColor: '#D0D0D8',
    margin: '20px 0',
}

const securityNoteStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#E63950',
    margin: 0,
}
