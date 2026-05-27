import React from 'react'

interface BadgeProps {
    children: React.ReactNode
    variant?: 'default' | 'accent' | 'gold' | 'success' | 'muted'
    className?: string
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
    accent:  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    gold:    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    muted:   'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

export function Badge({
    children,
    variant = 'default',
    className = '',
}: BadgeProps) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    )
}
