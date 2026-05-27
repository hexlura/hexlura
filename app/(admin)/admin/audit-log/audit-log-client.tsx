'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface AuditRow {
    id: string
    action: string
    entity_type: string | null
    entity_id: string | null
    metadata: Record<string, unknown> | null
    created_at: string
    actor_id: string | null
    profiles: { full_name: string | null } | null
}

interface Props {
    logs: AuditRow[]
    totalRows: number
    page: number
    pageSize: number
    distinctActions: string[]
    admins: { id: string; full_name: string | null }[]
}

function fmtUK(d: string) {
    return new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).replace(',', '')
}

export function AuditLogClient({ logs, totalRows, page, pageSize, distinctActions, admins }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [detailModal, setDetailModal] = useState<AuditRow | null>(null)

    function updateParam(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString())
        if (value) params.set(key, value)
        else params.delete(key)
        params.delete('page')
        router.push(`${pathname}?${params.toString()}`)
    }

    const totalPages = Math.ceil(totalRows / pageSize)

    return (
        <div className="max-w-7xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-heading text-4xl text-text tracking-wide">AUDIT LOG</h1>
                    <p className="text-muted text-sm mt-1">Read-only record of all admin actions</p>
                </div>
                <Link
                    href="/api/admin/export/audit-log"
                    className="text-xs px-3 py-2 rounded-sm bg-card border border-border text-muted hover:text-text transition-colors"
                >
                    Export CSV
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <select
                    defaultValue={searchParams.get('admin') ?? ''}
                    onChange={e => updateParam('admin', e.target.value)}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                >
                    <option value="">All Admins</option>
                    {admins.map(a => (
                        <option key={a.id} value={a.id}>{a.full_name ?? a.id}</option>
                    ))}
                </select>
                <select
                    defaultValue={searchParams.get('action') ?? ''}
                    onChange={e => updateParam('action', e.target.value)}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                >
                    <option value="">All Actions</option>
                    {distinctActions.map(a => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
                <select
                    defaultValue={searchParams.get('entity') ?? ''}
                    onChange={e => updateParam('entity', e.target.value)}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                >
                    <option value="">All Entity Types</option>
                    {['user', 'organiser', 'event', 'booking', 'payout'].map(e => (
                        <option key={e} value={e}>{e}</option>
                    ))}
                </select>
                <input
                    type="date"
                    defaultValue={searchParams.get('from') ?? ''}
                    onChange={e => updateParam('from', e.target.value)}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                />
                <input
                    type="date"
                    defaultValue={searchParams.get('to') ?? ''}
                    onChange={e => updateParam('to', e.target.value)}
                    className="bg-card border border-border rounded-sm px-3 py-2 text-sm text-text focus:outline-none"
                />
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-none overflow-hidden mb-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {['Timestamp', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'Details'].map(h => (
                                <th key={h} className="text-left text-xs text-muted py-3 px-4 font-normal">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 && (
                            <tr><td colSpan={6} className="text-center text-muted text-xs py-12">No audit log entries</td></tr>
                        )}
                        {logs.map(log => (
                            <tr key={log.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                                <td className="py-3 px-4 text-muted text-xs whitespace-nowrap font-mono">{fmtUK(log.created_at)}</td>
                                <td className="py-3 px-4 text-text text-xs">{log.profiles?.full_name ?? log.actor_id?.slice(0, 8) ?? '—'}</td>
                                <td className="py-3 px-4">
                                    <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">{log.action}</span>
                                </td>
                                <td className="py-3 px-4 text-muted text-xs">{log.entity_type ?? '—'}</td>
                                <td className="py-3 px-4 text-muted text-xs font-mono truncate max-w-[100px]">{log.entity_id ?? '—'}</td>
                                <td className="py-3 px-4">
                                    {log.metadata && (
                                        <button
                                            onClick={() => setDetailModal(log)}
                                            className="text-xs text-muted hover:text-text underline"
                                        >
                                            View
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalRows)} of {totalRows}</p>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))} className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40">← Prev</button>
                        <span className="text-xs px-3 py-1.5 text-muted">Page {page} of {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => updateParam('page', String(page + 1))} className="text-xs px-3 py-1.5 rounded bg-card border border-border text-muted hover:text-text disabled:opacity-40">Next →</button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detailModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-none p-6 max-w-lg w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading text-xl text-text">{detailModal.action}</h3>
                            <button onClick={() => setDetailModal(null)} className="text-muted hover:text-text text-xl">×</button>
                        </div>
                        <p className="text-xs text-muted mb-3">{fmtUK(detailModal.created_at)}</p>
                        <pre className="bg-surface rounded-none p-4 text-xs text-success font-mono overflow-auto max-h-80 whitespace-pre-wrap">
                            {JSON.stringify(detailModal.metadata, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    )
}
