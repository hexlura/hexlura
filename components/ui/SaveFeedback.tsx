'use client'

interface SaveFeedbackProps {
    message: string | null
    tone?: 'success' | 'error'
}

// Small inline status pill rendered next to a Save button. Replaces the
// fixed-position top-right toast for save actions so the confirmation
// appears where the user's attention already is.
export function SaveFeedback({ message, tone = 'success' }: SaveFeedbackProps) {
    if (!message) return null
    const colours = tone === 'success'
        ? 'text-success bg-success/10 border-success/40'
        : 'text-accent bg-accent/10 border-accent/40'
    return (
        <span
            role="status"
            aria-live="polite"
            className={`inline-flex items-center text-xs px-3 py-1.5 border rounded-sm ${colours}`}
        >
            {message}
        </span>
    )
}
