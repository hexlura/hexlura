import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Heading,
    Text,
    Preview,
} from '@react-email/components'
import React from 'react'

interface BaseEmailProps {
    children: React.ReactNode
    previewText: string
}

export default function BaseEmail({ children, previewText }: BaseEmailProps) {
    return (
        <Html lang="en">
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={bodyStyle}>
                <Container style={containerStyle}>
                    {/* Header */}
                    <Section style={headerStyle}>
                        <Heading style={logoStyle}>HEXLURA<span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', border: '1px solid currentColor', fontSize: '6px', lineHeight: '10px', textAlign: 'center', verticalAlign: 'super', marginLeft: '2px' }}>™</span></Heading>
                        <Text style={taglineStyle}>UK Event Ticketing</Text>
                    </Section>

                    {/* Content */}
                    <Section style={contentStyle}>
                        {children}
                    </Section>

                    {/* Footer */}
                    <Section style={footerStyle}>
                        <Text style={footerTextStyle}>
                            Hexlura Ltd · Company No. 17102803 · support@hexlura.com
                        </Text>
                        <Text style={footerSubTextStyle}>
                            This is an automated email — please do not reply
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

const bodyStyle: React.CSSProperties = {
    backgroundColor: '#F5F5F7',
    margin: 0,
    padding: 0,
}

const containerStyle: React.CSSProperties = {
    maxWidth: '600px',
    backgroundColor: '#FFFFFF',
    margin: '0 auto',
}

const headerStyle: React.CSSProperties = {
    backgroundColor: '#0A0A0F',
    padding: '24px 40px',
}

const logoStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '28px',
    fontWeight: 900,
    color: '#E63950',
    letterSpacing: '4px',
    margin: 0,
    padding: 0,
}

const taglineStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#8888AA',
    margin: '4px 0 0 0',
}

const contentStyle: React.CSSProperties = {
    padding: '40px',
}

const footerStyle: React.CSSProperties = {
    backgroundColor: '#F5F5F7',
    padding: '24px 40px',
    textAlign: 'center',
}

const footerTextStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#8888AA',
    margin: 0,
    textAlign: 'center',
}

const footerSubTextStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '11px',
    color: '#8888AA',
    marginTop: '8px',
    marginBottom: 0,
    textAlign: 'center',
}
