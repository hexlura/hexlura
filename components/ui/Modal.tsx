'use client'

import React, { useEffect } from 'react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-lg rounded-xl bg-surface border border-border p-6 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-muted hover:text-text"
                    aria-label="Close"
                >
                    ✕
                </button>
                {title && <h2 className="text-xl font-heading mb-4 text-text">{title}</h2>}
                <div>{children}</div>
            </div>
        </div>
    )
}
