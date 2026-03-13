'use client'

import { QRCodeSVG } from 'qrcode.react'

export default function BookingQR({ value }: { value: string }) {
    return (
        <div className="inline-block bg-white p-4 rounded-xl">
            <QRCodeSVG value={value} size={200} />
        </div>
    )
}
