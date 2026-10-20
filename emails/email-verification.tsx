import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Divider, Eyebrow, Icon, Lead, Note, Title } from './components/kit'

interface EmailVerificationProps {
    userName: string
    verifyUrl: string
}

// NOTE: This template is for reference / custom email flows only.
// For Supabase Auth email verification, update the template in:
// Supabase Dashboard → Authentication → Email Templates → Confirm Signup
export default function EmailVerification({ userName, verifyUrl }: EmailVerificationProps) {
    return (
        <BaseEmail previewText="Verify your Hexlura email address" tag="Account">
            <Icon glyph="@" tone="green" />
            <Eyebrow>One last step</Eyebrow>
            <Title>VERIFY YOUR EMAIL</Title>
            <Lead>
                Welcome to Hexlura, {userName}! Please verify your email address to complete your registration and start discovering live events.
            </Lead>

            <Button href={verifyUrl}>Verify email address →</Button>
            <Note center>This link expires in 24 hours.</Note>

            <Divider />
            <Note>If you didn&apos;t create a Hexlura account, you can safely ignore this email.</Note>
        </BaseEmail>
    )
}
