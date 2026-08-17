'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import DOMPurify from 'isomorphic-dompurify'
import { LEGAL_DOC_TYPES, LEGAL_DOC_LABELS, type LegalDocType } from '@/lib/legal'
import { LEGAL_CONTENT_CLASSES } from '@/lib/legal-content-styles'

const RichTextEditor = dynamic(
    () => import('@/components/editor/RichTextEditor').then(m => m.RichTextEditor),
    { ssr: false, loading: () => <div className="h-64 bg-surface border border-border animate-pulse" /> }
)

interface DocVersion {
    id: string
    doc_type: LegalDocType
    content_html: string
    version: string
    published_at: string
}

const PUBLIC_URLS: Record<LegalDocType, string> = {
    terms: '/terms',
    privacy: '/privacy',
    cookies: '/cookie-policy',
    refund: '/refund-policy',
}

const TOAST_DURATION_MS = 4000
const MIN_CONTENT_LENGTH = 50

// Fixed to UTC so the server-rendered markup and the client's first render always
// agree, regardless of the visitor's local time zone — avoids hydration mismatches.
function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: 'UTC',
    })
}

// Strips markup so publish-readiness reflects real text content, not raw HTML length
// (e.g. a single empty <p></p> tag shouldn't pass a bare-length check).
function plainTextLength(html: string) {
    return html.replace(/<[^>]*>/g, '').trim().length
}

export function LegalEditorClient({ documents }: { documents: DocVersion[] }) {
    const router = useRouter()
    const [docType, setDocType] = useState<LegalDocType>('terms')
    const [drafts, setDrafts] = useState<Partial<Record<LegalDocType, string>>>({})
    const [showPreview, setShowPreview] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        }
    }, [])

    const versionsByType = useMemo(() => {
        const map: Record<LegalDocType, DocVersion[]> = { terms: [], privacy: [], cookies: [], refund: [] }
        for (const d of documents) map[d.doc_type]?.push(d)
        // Newest first, so `[0]` is guaranteed to be the live version regardless of
        // the order the documents arrived in.
        for (const t of LEGAL_DOC_TYPES) {
            map[t].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
        }
        return map
    }, [documents])

    const latestByType = useMemo(() => {
        return LEGAL_DOC_TYPES.reduce((acc, t) => {
            acc[t] = versionsByType[t][0] ?? null
            return acc
        }, {} as Record<LegalDocType, DocVersion | null>)
    }, [versionsByType])

    const dirtyByType = useMemo(() => {
        return LEGAL_DOC_TYPES.reduce((acc, t) => {
            acc[t] = drafts[t] !== undefined && drafts[t] !== (latestByType[t]?.content_html ?? '')
            return acc
        }, {} as Record<LegalDocType, boolean>)
    }, [drafts, latestByType])

    const currentVersions = versionsByType[docType]
    const latest = latestByType[docType]
    const draft = drafts[docType] ?? latest?.content_html ?? ''
    const hasUnsavedChanges = dirtyByType[docType]
    const anyUnsavedChanges = LEGAL_DOC_TYPES.some(t => dirtyByType[t])

    useEffect(() => {
        if (!anyUnsavedChanges) return
        function handleBeforeUnload(e: BeforeUnloadEvent) {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [anyUnsavedChanges])

    function setDraft(html: string) {
        setDrafts(prev => ({ ...prev, [docType]: html }))
    }

    function showToast(msg: string, ok = true) {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToast({ msg, ok })
        toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS)
    }

    async function publish() {
        if (!confirm(`Publish a new version of the ${LEGAL_DOC_LABELS[docType]}? It goes live on the public site immediately.`)) return
        setPublishing(true)
        try {
            const res = await fetch('/api/admin/legal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doc_type: docType, content_html: draft }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                showToast(json.error || 'Failed to publish', false)
            } else {
                showToast(`Published version ${json.version} — now live`)
                setDrafts(prev => ({ ...prev, [docType]: undefined }))
                router.refresh()
            }
        } catch {
            showToast('Failed to publish — check your connection', false)
        }
        setPublishing(false)
    }

    function loadVersion(v: DocVersion) {
        if (draft !== (latest?.content_html ?? '') && !confirm('Discard your unsaved changes and load this version into the editor?')) return
        setDrafts(prev => ({ ...prev, [docType]: v.content_html }))
        setShowPreview(false)
        showToast(`Version ${v.version} loaded into the editor — publish to make it live again`)
    }

    return (
        <div className="max-w-5xl">
            {toast && (
                <div
                    role="alert"
                    className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-none text-sm border ${toast.ok ? 'bg-success/20 border-success/40 text-success' : 'bg-accent/10 border-accent/40 text-accent'}`}
                >
                    {toast.msg}
                </div>
            )}

            <h1 className="font-heading text-4xl text-text tracking-wide mb-2">LEGAL PAGES</h1>
            <p className="text-muted text-sm mb-8">
                Edit and publish the public legal documents. Every publish creates a new dated version — old versions are kept permanently as a legal record and can be viewed or restored below.
            </p>

            {/* Document tabs */}
            <div role="tablist" aria-label="Legal document type" className="flex gap-1 mb-6 border-b border-border">
                {LEGAL_DOC_TYPES.map(t => (
                    <button
                        key={t}
                        role="tab"
                        aria-selected={docType === t}
                        onClick={() => { setDocType(t); setShowPreview(false) }}
                        className={`px-4 py-2.5 text-sm transition-colors -mb-px border-b-2 ${docType === t ? 'text-text border-accent' : 'text-muted border-transparent hover:text-text'}`}
                    >
                        {LEGAL_DOC_LABELS[t]}
                        {dirtyByType[t] && <span className="text-gold ml-1" title="Unpublished changes">*</span>}
                    </button>
                ))}
            </div>

            {/* Status line */}
            <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-muted">
                {latest ? (
                    <span>
                        Live version: <span className="text-text font-medium">{latest.version}</span> (published {fmtDateTime(latest.published_at)})
                    </span>
                ) : (
                    <span className="text-gold">
                        No published version yet — the site is showing the built-in page. Tip: open{' '}
                        <a href={PUBLIC_URLS[docType]} target="_blank" rel="noopener noreferrer" className="underline">{PUBLIC_URLS[docType]}</a>,
                        select all, copy, and paste here to start from the current text.
                    </span>
                )}
                <a href={PUBLIC_URLS[docType]} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">View public page →</a>
                {hasUnsavedChanges && <span className="text-gold">Unpublished changes</span>}
            </div>

            {/* Editor / preview */}
            <div role="tabpanel" className="bg-card border border-border p-4 mb-4">
                {showPreview ? (
                    <div
                        className={`legal-preview px-4 py-3 text-sm text-text max-w-none ${LEGAL_CONTENT_CLASSES}`}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(draft) }}
                    />
                ) : (
                    <RichTextEditor content={draft} onChange={setDraft} />
                )}
            </div>

            <div className="flex items-center gap-3 mb-10">
                <button
                    onClick={publish}
                    disabled={publishing || plainTextLength(draft) < MIN_CONTENT_LENGTH}
                    className="bg-text text-white text-sm font-medium px-6 py-2.5 hover:bg-text/90 disabled:opacity-50"
                >
                    {publishing ? 'Publishing…' : 'Publish new version'}
                </button>
                <button
                    onClick={() => setShowPreview(v => !v)}
                    className="text-sm text-muted border border-border px-6 py-2.5 hover:text-text hover:border-text"
                >
                    {showPreview ? 'Back to editor' : 'Preview'}
                </button>
            </div>

            {/* Version history */}
            <h2 className="text-sm font-medium text-text mb-3">Version history — {LEGAL_DOC_LABELS[docType]}</h2>
            <div className="bg-card border border-border">
                {currentVersions.length === 0 && (
                    <p className="text-muted text-xs p-6 text-center">No versions published yet</p>
                )}
                {currentVersions.map((v, i) => (
                    <div key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0">
                        <span className="text-sm text-text font-mono">{v.version}</span>
                        <span className="text-xs text-muted">{fmtDateTime(v.published_at)}</span>
                        {i === 0 && <span className="text-xs text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">Live</span>}
                        <span className="flex-1" />
                        <button onClick={() => loadVersion(v)} className="text-xs text-accent hover:underline">
                            Load into editor
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
