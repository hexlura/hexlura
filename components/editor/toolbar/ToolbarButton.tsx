'use client'

import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

interface ToolbarButtonProps {
    icon?: ComponentType<LucideProps>
    label: string
    active?: boolean
    disabled?: boolean
    onClick: () => void
    children?: React.ReactNode
}

export function ToolbarButton({ icon: Icon, label, active, disabled, onClick, children }: ToolbarButtonProps) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
            className={`flex items-center justify-center h-8 min-w-8 px-1.5 rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface ${
                active ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text hover:bg-black/[0.05]'
            }`}
        >
            {Icon ? <Icon size={16} strokeWidth={2} /> : children}
        </button>
    )
}

export function ToolbarSeparator() {
    return <div className="w-px h-6 bg-border mx-1 self-center shrink-0" />
}
