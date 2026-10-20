import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Button, CheckList, Eyebrow, Icon, Lead, Note, P, RefBox, SubHeading, SupportLink, Title } from './components/kit'

interface PromoterWelcomeProps {
    displayName: string
    referralCode: string
    appUrl: string
}

export default function PromoterWelcome({ displayName, referralCode, appUrl }: PromoterWelcomeProps) {
    return (
        <BaseEmail previewText="You're now a Hexlura promoter — start earning commission" tag="Promoter">
            <Icon glyph="★" tone="green" />
            <Eyebrow>Welcome aboard</Eyebrow>
            <Title>YOU&apos;RE A PROMOTER</Title>
            <Lead>
                Hi {displayName}, welcome aboard. You&apos;re now a Hexlura promoter and can earn commission on every ticket sold through your referral links.
            </Lead>

            <RefBox label="YOUR REFERRAL CODE" value={referralCode} />
            <P>
                Append <strong>?ref={referralCode}</strong> to any event link you share. When someone books through your link, you earn the commission % set by the event organiser.
            </P>

            <SubHeading>What happens next</SubHeading>
            <CheckList
                items={[
                    'Organisers can now invite you to promote their events',
                    'Track clicks, sales and earnings in your dashboard',
                    'Request payouts whenever your balance clears the cooldown window',
                ]}
            />

            <Button href={`${appUrl}/promoter`}>Open promoter dashboard →</Button>
            <Note>
                Questions? Contact <SupportLink />.
            </Note>
        </BaseEmail>
    )
}
