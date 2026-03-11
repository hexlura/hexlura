import React from 'react'

interface BadgeProps {
    children: React.ReactNode
    variant?: 'default' | 'accent' | 'gold' | 'success' | 'muted'
    className?: string
}

export function Badge({
    children,
    variant = 'default',
    className = '',
}: BadgeProps) {
    // TODO: implement variant colour styles
    return (
        <span className={`data-variant-${variant} ${className}`}>
            {children}
        </span>
    )
}
