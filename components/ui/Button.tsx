import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    children: React.ReactNode
}

const variantClasses = {
    primary: 'bg-accent text-white hover:bg-[#cc2f43] border border-transparent',
    secondary: 'bg-card text-text hover:bg-[#22223A] border border-border',
    outline: 'bg-transparent text-text hover:bg-card border border-border',
    ghost: 'bg-transparent text-muted hover:text-text border border-transparent',
    danger: 'bg-red-700 text-white hover:bg-red-800 border border-transparent',
}

const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-xl',
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
            className={`inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
