import React from 'react'

// Warm-theme version of the shared Button (rounded pills, warm colours).
// The original components/ui/Button.tsx is still used by pages that have not been redesigned.
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    children: React.ReactNode
}

const variantClasses = {
    primary: 'bg-[#1A0E0C] text-white hover:bg-black border border-transparent',
    secondary: 'bg-card text-text border border-border hover:border-[#1A0E0C]/30',
    outline: 'bg-transparent text-text border border-border hover:bg-background',
    ghost: 'bg-transparent text-text hover:bg-background border border-transparent',
    danger: 'bg-accent text-white shadow-glow hover:brightness-110 border border-transparent',
}

const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs rounded-full',
    md: 'px-5 py-2.5 text-sm rounded-full',
    lg: 'px-7 py-3.5 text-base rounded-full',
}

export function Button({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
