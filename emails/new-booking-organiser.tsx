import { Hr, Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface TicketItem {
    name: string
    quantity: number
    price: string
}

interface NewBookingOrganiserProps {
    organiserName: string
    eventName: string
    eventDate: string
    buyerName: string
    buyerEmail: string
    ticketItems: TicketItem[]
    totalRevenue: string
    bookingRef: string
    dashboardUrl: string
}

export default function NewBookingOrganiser({
    organiserName,
    eventName,
    eventDate,
    buyerName,
    buyerEmail,
    ticketItems,
    totalRevenue,
    bookingRef,
    dashboardUrl,
}: NewBookingOrganiserProps) {
    return (
        <BaseEmail previewText={`New booking for ${eventName}`}>
            <Text style={moneyStyle}>💰</Text>
            <Text style={headingStyle}>NEW BOOKING!</Text>

            <Text style={greetingStyle}>Hi {organiserName},</Text>
            <Text style={bodyStyle}>You have a new booking for <strong>{eventName}</strong>!</Text>

            <div style={detailsBoxStyle}>
                <div style={rowStyle}>
                    <span style={labelStyle}>Buyer</span>
                    <span style={valueStyle}>{buyerName} · {buyerEmail}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Event</span>
                    <span style={valueStyle}>{eventName}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Date</span>
                    <span style={valueStyle}>{eventDate}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Ref</span>
                    <span style={refStyle}>{bookingRef}</span>
                </div>

                <Hr style={dividerStyle} />

                {ticketItems.map((item, i) => (
                    <div key={i} style={ticketRowStyle}>
                        <span style={ticketNameStyle}>{item.name}</span>
                        <span style={ticketPriceStyle}>{item.quantity} × {item.price}</span>
                    </div>
                ))}

                <Hr style={dividerStyle} />

                <div style={revenueRowStyle}>
                    <span style={revenueLabelStyle}>Your Revenue</span>
                    <span style={revenueValueStyle}>{totalRevenue}</span>
                </div>
            </div>

            <div style={buttonWrapStyle}>
                <Link href={dashboardUrl} style={buttonStyle}>
                    View Dashboard →
                </Link>
            </div>

            <Text style={closingStyle}>Keep up the great work!</Text>
        </BaseEmail>
    )
}

const moneyStyle: React.CSSProperties = {
    fontSize: '48px',
    textAlign: 'center',
    margin: '0 0 8px 0',
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
    margin: '0 0 8px 0',
}

const bodyStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    color: '#0A0A0F',
    margin: '0 0 24px 0',
}

const detailsBoxStyle: React.CSSProperties = {
    backgroundColor: '#F5F5F7',
    padding: '20px',
    margin: '0 0 24px 0',
}

const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
}

const labelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#8888AA',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    minWidth: '80px',
}

const valueStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#0A0A0F',
    textAlign: 'right' as const,
}

const refStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#E63950',
    fontWeight: 700,
    textAlign: 'right' as const,
}

const dividerStyle: React.CSSProperties = {
    borderColor: '#D0D0D8',
    margin: '12px 0',
}

const ticketRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
}

const ticketNameStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#0A0A0F',
}

const ticketPriceStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#0A0A0F',
}

const revenueRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
}

const revenueLabelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    fontWeight: 700,
    color: '#0A0A0F',
}

const revenueValueStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '20px',
    fontWeight: 700,
    color: '#00C48A',
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

const closingStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#666677',
    margin: 0,
}
