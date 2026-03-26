import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    children: React.ReactNode
}

const variantClasses = {
    primary: 'bg-[#0A0A0F] text-white hover:bg-[#333333] border border-transparent',
    secondary: 'bg-transparent text-[#0A0A0F] hover:bg-[#0A0A0F] hover:text-white border border-[#0A0A0F]',
    outline: 'bg-transparent text-[#0A0A0F] hover:bg-[#0A0A0F] hover:text-white border border-[#0A0A0F]',
    ghost: 'bg-transparent text-[#0A0A0F] hover:bg-[#F5F5F7] border border-transparent',
    danger: 'bg-[#E63950] text-white hover:bg-[#cc2f43] border border-transparent',
}

const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-sm',
    md: 'px-4 py-2 text-sm rounded-sm',
    lg: 'px-6 py-3 text-base rounded-sm',
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
