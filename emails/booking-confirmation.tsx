import { Hr, Link, Text } from '@react-email/components'
import React from 'react'
import BaseEmail from './components/BaseEmail'

interface TicketItem {
    name: string
    quantity: number
    price: string
}

interface BookingConfirmationProps {
    buyerName: string
    eventName: string
    eventDate: string
    eventTime: string
    venueName: string
    venueAddress: string
    bookingRef: string
    ticketItems: TicketItem[]
    totalPaid: string
    downloadUrl: string
}

export default function BookingConfirmation({
    buyerName,
    eventName,
    eventDate,
    eventTime,
    venueName,
    venueAddress,
    bookingRef,
    ticketItems,
    totalPaid,
    downloadUrl,
}: BookingConfirmationProps) {
    return (
        <BaseEmail previewText={`Your tickets for ${eventName} are confirmed!`}>
            {/* Green checkmark */}
            <Text style={checkmarkStyle}>✓</Text>

            {/* YOU'RE GOING! */}
            <Text style={headingStyle}>YOU&apos;RE GOING!</Text>
            <Text style={subheadingStyle}>Your tickets have been confirmed.</Text>

            {/* Booking reference box */}
            <div style={refBoxStyle}>
                <Text style={refLabelStyle}>BOOKING REFERENCE</Text>
                <Text style={refValueStyle}>{bookingRef}</Text>
            </div>

            {/* Event details box */}
            <div style={detailsBoxStyle}>
                <Text style={eventNameStyle}>{eventName}</Text>
                <Text style={detailRowStyle}>📅 {eventDate}</Text>
                <Text style={detailRowStyle}>🕐 {eventTime}</Text>
                <Text style={detailRowStyle}>📍 {venueName}{venueAddress ? `, ${venueAddress}` : ''}</Text>

                <Hr style={dividerStyle} />

                {/* Ticket items */}
                {ticketItems.map((item, i) => (
                    <div key={i} style={tableRowStyle}>
                        <span style={ticketNameStyle}>{item.name}</span>
                        <span style={ticketPriceStyle}>{item.quantity} × {item.price}</span>
                    </div>
                ))}

                <Hr style={dividerStyle} />

                {/* Total row */}
                <div style={totalRowStyle}>
                    <span style={totalLabelStyle}>Total Paid</span>
                    <span style={totalValueStyle}>{totalPaid}</span>
                </div>
            </div>

            {/* Download button */}
            <div style={buttonWrapStyle}>
                <Link href={downloadUrl} style={buttonStyle}>
                    Download Your Ticket →
                </Link>
            </div>

            {/* Footer notes */}
            <Text style={footerNoteStyle}>
                Show your QR code at the door. Each QR code is valid for one scan only.
            </Text>
            <Text style={footerNoteStyle}>
                Questions? Contact support@hexlura.com
            </Text>

            {/* Hi note — used for personalisation */}
            <Text style={{ display: 'none' }}>Hi {buyerName},</Text>
        </BaseEmail>
    )
}

const checkmarkStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '48px',
    color: '#00C48A',
    textAlign: 'center',
    margin: '0 0 8px 0',
}

const headingStyle: React.CSSProperties = {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: '32px',
    fontWeight: 900,
    color: '#0A0A0F',
    textAlign: 'center',
    margin: '0 0 8px 0',
}

const subheadingStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    color: '#666677',
    textAlign: 'center',
    margin: '0 0 24px 0',
}

const refBoxStyle: React.CSSProperties = {
    backgroundColor: '#F5F5F7',
    border: '2px dashed #C0C0C8',
    borderRadius: '0',
    padding: '20px',
    textAlign: 'center',
    margin: '24px 0',
}

const refLabelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '11px',
    color: '#8888AA',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    margin: '0 0 8px 0',
    textAlign: 'center',
}

const refValueStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: '32px',
    fontWeight: 900,
    color: '#E63950',
    margin: 0,
    textAlign: 'center',
}

const detailsBoxStyle: React.CSSProperties = {
    backgroundColor: '#F5F5F7',
    padding: '20px',
    margin: '16px 0',
}

const eventNameStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '20px',
    fontWeight: 700,
    color: '#0A0A0F',
    margin: '0 0 12px 0',
}

const detailRowStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#0A0A0F',
    margin: '4px 0',
}

const dividerStyle: React.CSSProperties = {
    borderColor: '#D0D0D8',
    margin: '12px 0',
}

const tableRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
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

const totalRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
}

const totalLabelStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    fontWeight: 700,
    color: '#0A0A0F',
}

const totalValueStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    fontWeight: 700,
    color: '#0A0A0F',
}

const buttonWrapStyle: React.CSSProperties = {
    textAlign: 'center',
    margin: '32px auto',
}

const buttonStyle: React.CSSProperties = {
    backgroundColor: '#E63950',
    color: '#FFFFFF',
    padding: '16px 40px',
    fontSize: '16px',
    fontWeight: 700,
    textAlign: 'center',
    display: 'block',
    textDecoration: 'none',
    fontFamily: 'Arial, sans-serif',
}

const footerNoteStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#666677',
    textAlign: 'center',
    margin: '4px 0',
}
