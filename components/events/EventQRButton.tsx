'use client';

import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function EventQRButton() {
    const [open, setOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;

        function handleClickOutside(e: MouseEvent) {
            if (
                popupRef.current && !popupRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }

        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    function handleDownload() {
        const svg = popupRef.current?.querySelector('svg');
        if (!svg) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const a = document.createElement('a');
            a.download = 'event-qr.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 transition-colors hover:border-[#0A0A0F] hover:text-[#0A0A0F]"
                style={{
                    fontSize: '13px',
                    padding: '11px 14px',
                    border: '1px solid #C0C0C8',
                    borderRadius: '2px',
                    background: 'transparent',
                    color: open ? '#0A0A0F' : '#666677',
                    cursor: 'pointer',
                }}
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="1" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="10" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="1" y="10" width="5" height="5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="10" y="10" width="2" height="2" fill="currentColor" />
                    <rect x="13" y="10" width="2" height="2" fill="currentColor" />
                    <rect x="10" y="13" width="2" height="2" fill="currentColor" />
                    <rect x="3" y="3" width="1.5" height="1.5" fill="currentColor" />
                    <rect x="12" y="3" width="1.5" height="1.5" fill="currentColor" />
                    <rect x="3" y="12" width="1.5" height="1.5" fill="currentColor" />
                </svg>
                QR Code
            </button>

            {open && (
                <div
                    ref={popupRef}
                    className="absolute right-0 top-full mt-2 z-50 flex flex-col items-center gap-3 bg-white border border-[#E0E0E6] shadow-lg p-4"
                    style={{ borderRadius: '2px' }}
                >
                    <QRCodeSVG value={window.location.href} size={200} />
                    <button
                        onClick={handleDownload}
                        className="transition-colors hover:text-[#0A0A0F]"
                        style={{
                            fontSize: '12px',
                            color: '#666677',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                        }}
                    >
                        Download PNG
                    </button>
                </div>
            )}
        </div>
    );
}
