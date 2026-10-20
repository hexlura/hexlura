import {
    Html,
    Head,
    Body,
    Container,
    Link,
    Preview,
    Text,
} from '@react-email/components'
import React from 'react'
import { colors, fonts } from './kit'

interface BaseEmailProps {
    children: React.ReactNode
    previewText: string
    /** Small label in the header, e.g. "Your tickets", "Payout", "Admin". Optional. */
    tag?: string
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hexlura.com').replace(/\/$/, '')

export default function BaseEmail({ children, previewText, tag }: BaseEmailProps) {
    return (
        <Html lang="en">
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={bodyStyle}>
                <Container style={containerStyle}>
                    {/* Top strip — solid red where gradients are unsupported (Outlook) */}
                    <div style={stripStyle} />

                    {/* Header */}
                    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ padding: '22px 36px 0 36px' }}>
                        <tbody>
                            <tr>
                                <td valign="middle">
                                    <span style={logoStyle}>
                                        HEXLURA<sup style={{ fontSize: '0.45em', letterSpacing: 'normal' }}>®</sup>
                                    </span>
                                </td>
                                {tag ? (
                                    <td valign="middle" align="right">
                                        <span style={tagStyle}>{tag}</span>
                                    </td>
                                ) : null}
                            </tr>
                        </tbody>
                    </table>

                    {/* Content */}
                    <div style={contentStyle}>{children}</div>

                    {/* Footer */}
                    <div style={footerStyle}>
                        <span style={{ ...logoStyle, fontSize: '20px' }}>
                            HEXLURA<sup style={{ fontSize: '0.45em', letterSpacing: 'normal' }}>®</sup>
                        </span>
                        <Text style={footerTextStyle}>
                            Hexlura Ltd · Company No. 17102803
                            <br />
                            Registered office: 71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ
                        </Text>
                        <Text style={footerTextStyle}>
                            <Link href="mailto:support@hexlura.com" style={footerLinkStyle}>support@hexlura.com</Link>
                            {' · '}
                            <Link href={`${SITE}/terms`} style={footerLinkStyle}>Terms</Link>
                            {' · '}
                            <Link href={`${SITE}/privacy`} style={footerLinkStyle}>Privacy</Link>
                        </Text>
                        <Text style={{ ...footerTextStyle, marginTop: '4px' }}>
                            This is an automated email — please do not reply
                        </Text>
                    </div>
                </Container>
            </Body>
        </Html>
    )
}

const bodyStyle: React.CSSProperties = {
    backgroundColor: colors.page,
    margin: 0,
    padding: '24px 12px',
}

const containerStyle: React.CSSProperties = {
    maxWidth: '600px',
    backgroundColor: colors.card,
    margin: '0 auto',
    border: `1px solid ${colors.border}`,
    borderRadius: '22px',
    overflow: 'hidden',
}

const stripStyle: React.CSSProperties = {
    height: '6px',
    lineHeight: '6px',
    fontSize: '6px',
    backgroundColor: colors.accent,
    backgroundImage: `linear-gradient(90deg, ${colors.accent}, ${colors.orange})`,
}

const logoStyle: React.CSSProperties = {
    fontFamily: fonts.heading,
    fontSize: '30px',
    fontWeight: 400,
    letterSpacing: '4px',
    lineHeight: '30px',
    color: colors.accent,
}

const tagStyle: React.CSSProperties = {
    fontFamily: fonts.body,
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: colors.muted,
    backgroundColor: colors.page,
    border: `1px solid ${colors.border}`,
    borderRadius: '999px',
    padding: '6px 11px',
    whiteSpace: 'nowrap',
}

const contentStyle: React.CSSProperties = {
    padding: '26px 36px 36px 36px',
}

const footerStyle: React.CSSProperties = {
    backgroundColor: colors.page,
    borderTop: `1px solid ${colors.border}`,
    padding: '24px 36px 26px 36px',
    textAlign: 'center',
}

const footerTextStyle: React.CSSProperties = {
    fontFamily: fonts.body,
    fontSize: '12px',
    lineHeight: '20px',
    color: colors.muted,
    margin: '6px 0 0 0',
    textAlign: 'center',
}

const footerLinkStyle: React.CSSProperties = {
    color: colors.muted,
    textDecoration: 'underline',
}
