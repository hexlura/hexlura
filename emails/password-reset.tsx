import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Divider, Eyebrow, Icon, Lead, Note, Title } from './components/kit'

interface PasswordResetProps {
    userName: string
    resetUrl: string
}

// NOTE: This template is for reference / custom email flows only.
// For Supabase Auth password reset emails, update the template in:
// Supabase Dashboard → Authentication → Email Templates → Reset Password
export default function PasswordReset({ userName, resetUrl }: PasswordResetProps) {
    return (
        <BaseEmail previewText="Reset your Hexlura password" tag="Account">
            <Icon glyph="•••" tone="red" />
            <Eyebrow>Security</Eyebrow>
            <Title>PASSWORD RESET</Title>
            <Lead>
                Hi {userName}, we received a request to reset your password. Click the button below to choose a new password.
            </Lead>

            <Button href={resetUrl}>Reset password →</Button>
            <Note center>This link expires in 1 hour.</Note>

            <Divider />
            <Note>If you didn&apos;t request this, you can safely ignore this email.</Note>
            <Note>For security, never share this link with anyone.</Note>
        </BaseEmail>
    )
}
