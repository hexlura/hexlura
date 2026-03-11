import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    children: React.ReactNode
}

export function Button({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...props
}: ButtonProps) {
    // TODO: implement variant and size styles
    return (
        <button className={`data-variant-${variant} data-size-${size} ${className}`} {...props}>
            {children}
        </button>
    )
}
