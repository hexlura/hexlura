import React from 'react'

interface CardProps {
    children: React.ReactNode
    className?: string
    hover?: boolean
}

export function Card({ children, className = '', hover = false }: CardProps) {
    // TODO: implement card styles with bg-card, border, hover effects
    return (
        <div className={`data-hover-${hover} ${className}`}>
            {children}
        </div>
    )
}
