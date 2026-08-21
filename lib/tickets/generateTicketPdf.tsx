import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'

export interface TicketPdfData {
    eventName: string
    eventCategory?: string
    eventDate: string
    eventTime: string
    venueName: string
    venueAddress: string
    organiserName?: string
    bookingRef: string
    holderName: string
    ticketName: string
    token: string
    isCancelled: boolean
    ticketIndex: number
    ticketTotal: number
}

const styles = StyleSheet.create({
    page: {
        padding: 24,
        fontSize: 11,
        fontFamily: 'Helvetica',
        color: '#0A0A0F',
    },
    topBar: {
        height: 4,
        backgroundColor: '#E63950',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    logo: {
        fontSize: 16,
        fontWeight: 700,
        color: '#E63950',
        letterSpacing: 2,
    },
    ticketLabel: {
        fontSize: 8,
        color: '#8888AA',
        letterSpacing: 1,
    },
    eventCategory: {
        fontSize: 8,
        fontWeight: 700,
        color: '#E63950',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    eventName: {
        fontSize: 20,
        fontWeight: 700,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    detailLabel: {
        fontSize: 8,
        color: '#8888AA',
        letterSpacing: 1,
        marginBottom: 2,
    },
    detailText: {
        fontSize: 11,
        color: '#333333',
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        marginVertical: 16,
    },
    qrSection: {
        alignItems: 'center',
        marginVertical: 12,
    },
    qrImage: {
        width: 160,
        height: 160,
        marginBottom: 8,
    },
    qrRef: {
        fontSize: 11,
        fontFamily: 'Courier',
        fontWeight: 700,
    },
    qrHint: {
        fontSize: 8,
        color: '#8888AA',
        marginTop: 2,
    },
    stub: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 2,
        borderTopColor: '#E0E0E0',
        borderTopStyle: 'dashed',
    },
    stubRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    stubLabel: {
        fontSize: 8,
        color: '#8888AA',
        letterSpacing: 1,
    },
    stubValue: {
        fontSize: 11,
        fontWeight: 700,
    },
    badge: {
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: 1,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderWidth: 1,
    },
    badgeValid: {
        color: '#00A86B',
        borderColor: '#00C48A',
        backgroundColor: '#E8FFF5',
    },
    badgeCancelled: {
        color: '#E63950',
        borderColor: '#E63950',
        backgroundColor: '#FFF0F0',
    },
    footer: {
        marginTop: 16,
        fontSize: 7,
        color: '#C0C0C8',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
})

function TicketPage({ data, qrDataUrl }: { data: TicketPdfData; qrDataUrl: string }) {
    const ticketLabel = data.ticketTotal > 1
        ? `E-TICKET ${data.ticketIndex} OF ${data.ticketTotal}`
        : 'E-TICKET'

    return (
            <Page size={[320, 560]} style={styles.page}>
                <View style={styles.topBar} />

                <View style={styles.header}>
                    <Text style={styles.logo}>HEXLURA</Text>
                    <Text style={styles.ticketLabel}>{ticketLabel}</Text>
                </View>

                {data.eventCategory ? <Text style={styles.eventCategory}>{data.eventCategory}</Text> : null}
                <Text style={styles.eventName}>{data.eventName}</Text>

                <View style={styles.detailRow}>
                    <View>
                        <Text style={styles.detailLabel}>DATE</Text>
                        <Text style={styles.detailText}>{data.eventDate}</Text>
                    </View>
                </View>
                <View style={styles.detailRow}>
                    <View>
                        <Text style={styles.detailLabel}>TIME</Text>
                        <Text style={styles.detailText}>{data.eventTime}</Text>
                    </View>
                </View>
                <View style={styles.detailRow}>
                    <View>
                        <Text style={styles.detailLabel}>VENUE</Text>
                        <Text style={styles.detailText}>{data.venueName}</Text>
                        {data.venueAddress ? <Text style={styles.detailText}>{data.venueAddress}</Text> : null}
                    </View>
                </View>
                {data.organiserName ? (
                    <View style={styles.detailRow}>
                        <View>
                            <Text style={styles.detailLabel}>ORGANISED BY</Text>
                            <Text style={styles.detailText}>{data.organiserName}</Text>
                        </View>
                    </View>
                ) : null}

                <View style={styles.divider} />

                <View style={styles.qrSection}>
                    <Image src={qrDataUrl} style={styles.qrImage} />
                    <Text style={styles.qrRef}>{data.token}</Text>
                    <Text style={styles.qrHint}>Scan at entry - One scan per ticket</Text>
                </View>

                <View style={styles.stub}>
                    <View style={styles.stubRow}>
                        <View>
                            <Text style={styles.stubLabel}>TICKET TYPE</Text>
                            <Text style={styles.stubValue}>{data.ticketName}</Text>
                        </View>
                        <Text style={[styles.badge, data.isCancelled ? styles.badgeCancelled : styles.badgeValid]}>
                            {data.isCancelled ? 'Cancelled' : 'Valid'}
                        </Text>
                    </View>
                    <View style={styles.stubRow}>
                        <View>
                            <Text style={styles.stubLabel}>TICKET HOLDER</Text>
                            <Text style={styles.stubValue}>{data.holderName}</Text>
                        </View>
                    </View>
                    <View style={styles.stubRow}>
                        <View>
                            <Text style={styles.stubLabel}>BOOKING REF</Text>
                            <Text style={styles.stubValue}>{data.bookingRef}</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.footer}>Valid for 1 person - Non-transferable</Text>
            </Page>
    )
}

// Multi-page PDF — one page per physical ticket, all in a single downloadable file.
export async function generateTicketsPdf(dataList: TicketPdfData[]): Promise<Buffer> {
    const items = await Promise.all(dataList.map(async (data) => ({
        data,
        qrDataUrl: await QRCode.toDataURL(data.token, { width: 320, margin: 1 }),
    })))

    return renderToBuffer(
        <Document>
            {items.map((item, i) => (
                <TicketPage key={i} data={item.data} qrDataUrl={item.qrDataUrl} />
            ))}
        </Document>
    )
}

// Single-ticket convenience wrapper — used for individual email attachments.
export async function generateTicketPdf(data: TicketPdfData): Promise<Buffer> {
    return generateTicketsPdf([data])
}
