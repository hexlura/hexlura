import React, { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string
    label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', error, label, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1 w-full">
                {label && <label className="text-sm font-medium text-text">{label}</label>}
                <input
                    className={`flex h-10 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
                    ref={ref}
                    {...props}
                />
                {error && <span className="text-xs text-accent">{error}</span>}
            </div>
        )
    }
)
Input.displayName = 'Input'
