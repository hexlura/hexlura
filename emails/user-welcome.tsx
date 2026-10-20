import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, Card, CardSub, CardTitle, CheckList, Eyebrow, Lead, Note, SupportLink, Title } from './components/kit'

interface UserWelcomeProps {
    fullName: string
    appUrl: string
}

export default function UserWelcome({ fullName, appUrl }: UserWelcomeProps) {
    return (
        <BaseEmail previewText="Welcome to Hexlura — discover live events near you" tag="Welcome">
            <Eyebrow>You&apos;re in</Eyebrow>
            <Title>WELCOME TO HEXLURA</Title>
            <Lead>
                Hi {fullName}, thanks for joining Hexlura — the UK&apos;s home for live events. Your account is ready, and you can now discover, book and manage tickets for everything from club nights and gigs to comedy and festivals.
            </Lead>

            <Button href={`${appUrl}/events`}>Browse events →</Button>

            <Card>
                <CardTitle>What you can do next</CardTitle>
                <CheckList
                    items={[
                        'Find events by city, date or category',
                        'Save events you love with the heart button',
                        'Book tickets in seconds — they’re emailed instantly with QR codes',
                        'Manage all your bookings from your account dashboard',
                    ]}
                />
            </Card>

            <Card white>
                <CardTitle>Run events of your own?</CardTitle>
                <CardSub>
                    Hexlura is also the most organiser-friendly ticketing platform in the UK. Zero monthly fees, you keep 100% of face value, payouts within 2 business days.
                </CardSub>
                <div style={{ height: '14px' }} />
                <Button href={`${appUrl}/business`} ghost>Become an organiser</Button>
            </Card>

            <Note>
                If you haven&apos;t verified your email yet, please check your inbox for the verification link to unlock booking.
            </Note>
            <Note>
                Need help? Just reply to this email or contact <SupportLink />.
            </Note>
        </BaseEmail>
    )
}
