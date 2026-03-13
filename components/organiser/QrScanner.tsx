'use client'

import { useEffect, useRef } from 'react'

interface QrScannerProps {
    onScan: (value: string) => void
}

export function QrScanner({ onScan }: QrScannerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null)

    useEffect(() => {
        if (!containerRef.current) return
        let stopped = false

        async function init() {
            const { Html5Qrcode } = await import('html5-qrcode')
            if (stopped || !containerRef.current) return
            const scanner = new Html5Qrcode('qr-reader')
            scannerRef.current = scanner
            try {
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (text) => { onScan(text) },
                    undefined
                )
            } catch (err) {
                console.error('Camera error:', err)
            }
        }

        init()

        return () => {
            stopped = true
            scannerRef.current?.stop().catch(() => {})
        }
    }, [onScan])

    return <div id="qr-reader" ref={containerRef} className="w-full" />
}
