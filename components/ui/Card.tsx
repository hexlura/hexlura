import React from 'react'

interface CardProps {
    children: React.ReactNode
    className?: string
    hover?: boolean
}

export function Card({ children, className = '', hover = false }: CardProps) {
    return (
        <div
            className={`bg-card border border-border rounded-none p-6 ${hover ? 'hover:bg-[#22223A] transition-colors cursor-pointer' : ''} ${className}`}
        >
            {children}
        </div>
    )
}
