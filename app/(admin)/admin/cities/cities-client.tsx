'use client'

import { useState, useRef } from 'react'
import type { CityRow } from './page'

interface CitiesClientProps {
    cities: CityRow[]
}

function slugify(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function CitiesClient({ cities: initialCities }: CitiesClientProps) {
    const [cities, setCities] = useState<CityRow[]>(initialCities)
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [displayOrder, setDisplayOrder] = useState(cities.length + 1)
    const [isActive, setIsActive] = useState(true)
    const [adding, setAdding] = useState(false)
    const [addError, setAddError] = useState('')
    const [uploading, setUploading] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [editData, setEditData] = useState<Partial<CityRow>>({})
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const handleNameChange = (val: string) => {
        setName(val)
        setSlug(slugify(val))
    }

    const handleFileUpload = async (file: File, targetSlug: string) => {
        if (file.size > 2 * 1024 * 1024) {
            setAddError('File must be under 2MB')
            return null
        }
        setUploading(true)
        const ext = file.name.split('.').pop()
        const path = `cities/${targetSlug}.${ext}`
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', path)
        const res = await fetch('/api/admin/cities/upload', { method: 'POST', body: formData })
        setUploading(false)
        if (!res.ok) {
            setAddError('Upload failed')
            return null
        }
        const { url } = await res.json()
        return url as string
    }

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddError('')
        if (!name.trim() || !slug.trim()) {
            setAddError('Name and slug are required')
            return
        }
        setAdding(true)
        let finalImageUrl = imageUrl

        if (fileRef.current?.files?.[0]) {
            const uploaded = await handleFileUpload(fileRef.current.files[0], slug)
            if (!uploaded) { setAdding(false); return }
            finalImageUrl = uploaded
        }

        const res = await fetch('/api/admin/cities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), slug: slug.trim(), image_url: finalImageUrl || null, display_order: displayOrder, is_active: isActive }),
        })
        const data = await res.json()
        setAdding(false)
        if (!res.ok) {
            setAddError(data.error || 'Failed to add city')
            return
        }
        setCities(prev => [...prev, data.city])
        setName('')
        setSlug('')
        setImageUrl('')
        setDisplayOrder(cities.length + 2)
        setIsActive(true)
        if (fileRef.current) fileRef.current.value = ''
    }

    const handleOrderBlur = async (id: string, order: number) => {
        await fetch('/api/admin/cities', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, display_order: order }),
        })
    }

    const handleToggleActive = async (city: CityRow) => {
        const newVal = !city.is_active
        setCities(prev => prev.map(c => c.id === city.id ? { ...c, is_active: newVal } : c))
        await fetch('/api/admin/cities', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: city.id, is_active: newVal }),
        })
    }

    const handleEditSave = async (id: string) => {
        setSaving(true)
        const res = await fetch('/api/admin/cities', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...editData }),
        })
        const data = await res.json()
        setSaving(false)
        if (res.ok) {
            setCities(prev => prev.map(c => c.id === id ? { ...c, ...editData } : c))
            setEditId(null)
            setEditData({})
        } else {
            alert(data.error || 'Save failed')
        }
    }

    const handleDelete = async (id: string) => {
        const res = await fetch('/api/admin/cities', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        if (res.ok) {
            setCities(prev => prev.filter(c => c.id !== id))
        }
        setDeleteConfirm(null)
    }

    const inputStyle: React.CSSProperties = {
        border: '1px solid #E0E0E0',
        padding: '8px 12px',
        fontSize: '14px',
        color: '#0A0A0F',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    }

    const labelStyle: React.CSSProperties = {
        fontSize: '12px',
        color: '#666677',
        marginBottom: '4px',
        display: 'block',
    }

    return (
        <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
            <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '36px', color: '#0A0A0F', margin: '0 0 32px 0' }}>
                CITIES
            </h1>

            {/* Add City */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E0E0E0', padding: '24px', marginBottom: '32px' }}>
                <p style={{ fontSize: '16px', color: '#0A0A0F', fontWeight: 600, marginBottom: '16px', margin: '0 0 16px 0' }}>
                    Add New City
                </p>
                <form onSubmit={handleAdd}>
                    {/* Row 1: Name + Slug */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>City Name</label>
                            <input
                                value={name}
                                onChange={e => handleNameChange(e.target.value)}
                                placeholder="e.g. Sheffield"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Slug</label>
                            <input
                                value={slug}
                                onChange={e => setSlug(e.target.value)}
                                placeholder="e.g. sheffield"
                                style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    {/* Row 2: Image URL */}
                    <div style={{ marginBottom: '8px' }}>
                        <label style={labelStyle}>Image URL</label>
                        <input
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            style={inputStyle}
                        />
                        <p style={{ fontSize: '11px', color: '#8888AA', margin: '4px 0 0 0' }}>
                            Use an Unsplash URL or upload below
                        </p>
                    </div>

                    {/* Row 3: File upload */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>OR Upload Image (JPG/PNG/WebP, max 2MB)</label>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ fontSize: '13px', color: '#0A0A0F' }}
                        />
                    </div>

                    {/* Row 4: Display order + Active */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '16px' }}>
                        <div>
                            <label style={labelStyle}>Display Order</label>
                            <input
                                type="number"
                                value={displayOrder}
                                onChange={e => setDisplayOrder(Number(e.target.value))}
                                style={{ ...inputStyle, width: '90px' }}
                                min={1}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '2px' }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>Active</label>
                            <button
                                type="button"
                                onClick={() => setIsActive(v => !v)}
                                style={{
                                    width: '44px',
                                    height: '24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: isActive ? '#22C55E' : '#C0C0C8',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'background 0.2s',
                                }}
                            >
                                <span style={{
                                    position: 'absolute',
                                    top: '3px',
                                    left: isActive ? '23px' : '3px',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: '#FFFFFF',
                                    transition: 'left 0.2s',
                                }} />
                            </button>
                        </div>
                    </div>

                    {addError && (
                        <p style={{ fontSize: '13px', color: '#E63950', marginBottom: '12px' }}>{addError}</p>
                    )}

                    <button
                        type="submit"
                        disabled={adding || uploading}
                        style={{
                            background: '#0A0A0F',
                            color: '#FFFFFF',
                            padding: '10px 24px',
                            fontSize: '14px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: adding || uploading ? 'not-allowed' : 'pointer',
                            opacity: adding || uploading ? 0.6 : 1,
                        }}
                    >
                        {adding || uploading ? 'Adding...' : 'Add City'}
                    </button>
                </form>
            </div>

            {/* Cities Table */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #E0E0E0', background: '#F8F8FA' }}>
                            {['Image', 'Name', 'Slug', 'Order', 'Active', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#666677', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {cities.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#8888AA', fontSize: '14px' }}>
                                    No cities yet. Add one above.
                                </td>
                            </tr>
                        )}
                        {cities.map(city => (
                            editId === city.id ? (
                                // Inline edit row
                                <tr key={city.id} style={{ borderBottom: '1px solid #E0E0E0', background: '#FFFBF0' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#E0E0E8', flexShrink: 0 }}>
                                            {(editData.image_url || city.image_url) ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={editData.image_url || city.image_url || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#8888AA' }}>
                                                    {city.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <input
                                            value={editData.name ?? city.name}
                                            onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                                            style={{ ...inputStyle, width: '140px' }}
                                        />
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <input
                                            value={editData.slug ?? city.slug}
                                            onChange={e => setEditData(d => ({ ...d, slug: e.target.value }))}
                                            style={{ ...inputStyle, width: '120px', fontFamily: 'monospace', fontSize: '12px' }}
                                        />
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <input
                                            type="number"
                                            value={editData.display_order ?? city.display_order}
                                            onChange={e => setEditData(d => ({ ...d, display_order: Number(e.target.value) }))}
                                            style={{ ...inputStyle, width: '60px' }}
                                        />
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setEditData(d => ({ ...d, is_active: !(d.is_active ?? city.is_active) }))}
                                            style={{
                                                width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                                                background: (editData.is_active ?? city.is_active) ? '#22C55E' : '#C0C0C8',
                                                cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                                            }}
                                        >
                                            <span style={{
                                                position: 'absolute', top: '3px',
                                                left: (editData.is_active ?? city.is_active) ? '23px' : '3px',
                                                width: '18px', height: '18px', borderRadius: '50%',
                                                background: '#FFFFFF', transition: 'left 0.2s',
                                            }} />
                                        </button>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                placeholder="Image URL"
                                                value={editData.image_url ?? city.image_url ?? ''}
                                                onChange={e => setEditData(d => ({ ...d, image_url: e.target.value }))}
                                                style={{ ...inputStyle, width: '180px', fontSize: '12px' }}
                                            />
                                            <button
                                                onClick={() => handleEditSave(city.id)}
                                                disabled={saving}
                                                style={{ padding: '6px 16px', background: '#0A0A0F', color: '#FFFFFF', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                {saving ? '...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={() => { setEditId(null); setEditData({}) }}
                                                style={{ padding: '6px 16px', background: 'transparent', color: '#0A0A0F', border: '1px solid #C0C0C8', fontSize: '13px', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : deleteConfirm === city.id ? (
                                // Delete confirm row
                                <tr key={city.id} style={{ borderBottom: '1px solid #E0E0E0', background: '#FFF5F5' }}>
                                    <td colSpan={6} style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <span style={{ fontSize: '14px', color: '#0A0A0F' }}>
                                                Are you sure you want to delete <strong>{city.name}</strong>?
                                            </span>
                                            <button
                                                onClick={() => handleDelete(city.id)}
                                                style={{ padding: '6px 16px', background: '#E63950', color: '#FFFFFF', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                style={{ padding: '6px 16px', background: 'transparent', color: '#0A0A0F', border: '1px solid #C0C0C8', fontSize: '13px', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                // Normal row
                                <tr key={city.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#E0E0E8' }}>
                                            {city.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={city.image_url} alt={city.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#8888AA', fontFamily: '"Bebas Neue", sans-serif' }}>
                                                    {city.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#0A0A0F' }}>
                                        {city.name}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#8888AA', fontFamily: 'JetBrains Mono, monospace' }}>
                                        {city.slug}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <input
                                            type="number"
                                            defaultValue={city.display_order}
                                            onBlur={e => {
                                                const val = Number(e.target.value)
                                                setCities(prev => prev.map(c => c.id === city.id ? { ...c, display_order: val } : c))
                                                handleOrderBlur(city.id, val)
                                            }}
                                            style={{ width: '60px', border: '1px solid #E0E0E0', padding: '4px 8px', fontSize: '13px', textAlign: 'center', color: '#0A0A0F', outline: 'none' }}
                                        />
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleActive(city)}
                                            style={{
                                                width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                                                background: city.is_active ? '#22C55E' : '#C0C0C8',
                                                cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                                            }}
                                        >
                                            <span style={{
                                                position: 'absolute', top: '3px',
                                                left: city.is_active ? '23px' : '3px',
                                                width: '18px', height: '18px', borderRadius: '50%',
                                                background: '#FFFFFF', transition: 'left 0.2s',
                                            }} />
                                        </button>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => { setEditId(city.id); setEditData({}) }}
                                                style={{ padding: '5px 14px', background: 'transparent', color: '#0A0A0F', border: '1px solid #0A0A0F', fontSize: '13px', cursor: 'pointer' }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(city.id)}
                                                style={{ padding: '5px 14px', background: 'transparent', color: '#E63950', border: '1px solid #E63950', fontSize: '13px', cursor: 'pointer' }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
