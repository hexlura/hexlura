import React from 'react'
import BaseEmail from './components/BaseEmail'
import { Card, CardTitle, Divider, Eyebrow, Icon, Note, P, Row, SupportLink, Title } from './components/kit'

interface BankDetailsChangedProps {
    fullName: string
    orgName: string
    accountName: string
    sortCodeEnding: string
    accountEnding: string
    changedBy: 'you' | 'Hexlura'
    changedAt: string
}

export default function BankDetailsChanged({ fullName, orgName, accountName, sortCodeEnding, accountEnding, changedBy, changedAt }: BankDetailsChangedProps) {
    return (
        <BaseEmail previewText="The bank details for your payouts were changed" tag="Security">
            <Icon glyph="!" tone="amber" />
            <Eyebrow>Organiser</Eyebrow>
            <Title>BANK DETAILS CHANGED</Title>
            <P>Hi {fullName},</P>
            <P>
                The bank details used to pay out <strong>{orgName}</strong> were changed {changedBy === 'you' ? 'from your account' : 'by the Hexlura team'} on {changedAt}.
            </P>

            <Card>
                <CardTitle small>New details</CardTitle>
                <Row label="Account holder">{accountName}</Row>
                <Row label="Sort code">••-••-{sortCodeEnding}</Row>
                <Row label="Account number" mono last>{accountEnding}</Row>
            </Card>

            <Divider />
            <Note>
                {changedBy === 'you'
                    ? <>If this wasn&apos;t you, contact <SupportLink /> straight away so we can hold your payouts and secure your account.</>
                    : <>If you weren&apos;t expecting this change, contact <SupportLink /> straight away.</>}
            </Note>
        </BaseEmail>
    )
}
