'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SaveFeedback } from '@/components/ui/SaveFeedback'
import type { PageControl } from '@/lib/page-controls/types'

interface Props {
    pageKey: string
    sections: PageControl[]
}

export function PageControlsClient({ pageKey, sections }: Props) {
    const router = useRouter()

    // Server-provided data is the source of truth; local state only ever
    // reflects a *confirmed* server response, never an optimistic guess.
    const [visibility, setVisibility] = useState<Record<string, boolean>>(
        () => Object.fromEntries(sections.map(s => [s.id, s.is_visible]))
    )
    const [pending, setPending] = useState<Set<string>>(new Set())
    const [feedback, setFeedback] = useState<Record<string, { message: string; tone: 'success' | 'error' }>>({})

    function showFeedback(id: string, message: string, tone: 'success' | 'error') {
        setFeedback(prev => ({ ...prev, [id]: { message, tone } }))
        setTimeout(() => {
            setFeedback(prev => {
                if (prev[id]?.message !== message) return prev
                const rest = { ...prev }
                delete rest[id]
                return rest
            })
        }, 3000)
    }

    async function handleToggle(section: PageControl) {
        if (pending.has(section.id)) return

        const desiredVisible = !visibility[section.id]
        setPending(prev => new Set(prev).add(section.id))

        try {
            const res = await fetch('/api/admin/page-controls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageKey, sectionKey: section.section_key, isVisible: desiredVisible }),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || 'Unable to update page visibility.')
            }

            const body = await res.json() as { isVisible: boolean }
            setVisibility(prev => ({ ...prev, [section.id]: body.isVisible }))
            showFeedback(section.id, body.isVisible ? 'Now visible' : 'Now hidden', 'success')
        } catch (e) {
            // Don't keep an optimistic value on failure — re-sync with the
            // server's authoritative state instead.
            showFeedback(section.id, (e as Error).message, 'error')
            router.refresh()
        } finally {
            setPending(prev => {
                const next = new Set(prev)
                next.delete(section.id)
                return next
            })
        }
    }

    return (
        <div>
            {sections.map((section, i) => {
                const isVisible = visibility[section.id]
                const isPending = pending.has(section.id)
                return (
                    <div
                        key={section.id}
                        className={`flex items-center justify-between py-3 ${i < sections.length - 1 ? 'border-b border-border' : ''}`}
                    >
                        <div>
                            <p className="text-sm text-text">{section.display_name}</p>
                            <p className="text-xs text-muted">{isVisible ? 'Visible' : 'Hidden'} on the public page</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <SaveFeedback message={feedback[section.id]?.message ?? null} tone={feedback[section.id]?.tone} />
                            <button
                                type="button"
                                role="switch"
                                aria-checked={isVisible}
                                aria-label={`${isVisible ? 'Hide' : 'Show'} ${section.display_name} on the public page`}
                                disabled={isPending}
                                onClick={() => handleToggle(section)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${isVisible ? 'bg-accent' : 'bg-border'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
