'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import EventCard from '@/components/events/EventCard'
import { Event } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { CATEGORIES } from '@/lib/config/categories'

const CITIES = ['Any', 'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Edinburgh', 'Bristol', 'Liverpool', 'Cardiff', 'Belfast']

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function BrowseEventsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const location = (searchParams.get('location') || searchParams.get('city')) ?? ''
  const sort = searchParams.get('sort') || 'soonest'
  const minPrice = parseInt(searchParams.get('minPrice') || '0', 10)
  const maxPrice = parseInt(searchParams.get('maxPrice') || '500', 10)
  const postcodeParam = searchParams.get('postcode') || ''
  const radiusParam = parseInt(searchParams.get('radius') || '10', 10)

  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  // Mobile filter state
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [localQuery, setLocalQuery] = useState(query)
  const [localCategory, setLocalCategory] = useState(category || 'All')
  const [localLocation, setLocalLocation] = useState(location || 'Any')
  const [localSort, setLocalSort] = useState(sort)
  const [localMinPrice, setLocalMinPrice] = useState(minPrice)
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice)
  const [localPostcode, setLocalPostcode] = useState(postcodeParam)
  const [localRadius, setLocalRadius] = useState(radiusParam)
  const [postcodeGeoStatus, setPostcodeGeoStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  // Sync local state when URL params change
  useEffect(() => {
    setLocalQuery(query)
    setLocalCategory(category || 'All')
    setLocalLocation(location || 'Any')
    setLocalSort(sort)
    setLocalMinPrice(minPrice)
    setLocalMaxPrice(maxPrice)
    setLocalPostcode(postcodeParam)
    setLocalRadius(radiusParam)
  }, [query, category, location, sort, minPrice, maxPrice, postcodeParam, radiusParam])

  // Haversine distance in km between two lat/lng points
  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  // Fetch events whenever URL params change
  useEffect(() => {
    setLoading(true)
    setFetchError(false)

    async function fetchEvents() {
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('events')
        .select('*, organiser:organiser_profiles(*), ticket_types(*), venue_lat, venue_lng')
        .eq('status', 'published')
        .or(`end_at.gte.${new Date().toISOString()},end_at.is.null`)

      if (query) q = q.ilike('title', `%${query}%`)
      if (category && category !== 'All') q = q.eq('category', category)
      if (location && location !== 'Any') q = q.ilike('venue_city', `%${location}%`)

      if (minPrice > 0) q = q.gte('ticket_types.price_pence', minPrice * 100)
      if (maxPrice < 500) q = q.lte('ticket_types.price_pence', maxPrice * 100)

      if (sort === 'popular') {
        q = q.order('created_at', { ascending: false })
      } else {
        q = q.order('start_at', { ascending: true })
      }

      const { data, error } = await q
      let results = (data || []) as (Event & { venue_lat?: number; venue_lng?: number })[]

      // Postcode radius filter — geocode then filter client-side
      if (postcodeParam) {
        setPostcodeGeoStatus('loading')
        try {
          const pc = postcodeParam.trim().replace(/\s+/g, '')
          const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`)
          const json = await res.json()
          if (json.status === 200 && json.result?.latitude) {
            const { latitude, longitude } = json.result
            const radiusKm = radiusParam * 1.60934 // miles to km
            results = results.filter(e =>
              e.venue_lat != null && e.venue_lng != null &&
              haversineKm(latitude, longitude, e.venue_lat!, e.venue_lng!) <= radiusKm
            )
            setPostcodeGeoStatus('idle')
          } else {
            setPostcodeGeoStatus('error')
          }
        } catch {
          setPostcodeGeoStatus('error')
        }
      } else {
        setPostcodeGeoStatus('idle')
      }

      setEvents(results as unknown as Event[])
      setFetchError(!!error)
      setLoading(false)
    }

    fetchEvents()
  }, [query, category, location, sort, minPrice, maxPrice, postcodeParam, radiusParam])

  const activeFilterCount =
    (query ? 1 : 0) +
    (category && category !== 'All' ? 1 : 0) +
    (location && location !== 'Any' ? 1 : 0) +
    (minPrice > 0 || maxPrice < 500 ? 1 : 0) +
    (postcodeParam ? 1 : 0)

  const applyFilters = (closeFilters = false) => {
    const params = new URLSearchParams()
    if (localQuery) params.set('q', localQuery)
    if (localCategory && localCategory !== 'All') params.set('category', localCategory)
    if (localLocation && localLocation !== 'Any') params.set('location', localLocation)
    if (localSort && localSort !== 'soonest') params.set('sort', localSort)
    if (localMinPrice > 0) params.set('minPrice', String(localMinPrice))
    if (localMaxPrice < 500) params.set('maxPrice', String(localMaxPrice))
    if (localPostcode.trim()) {
      params.set('postcode', localPostcode.trim().toUpperCase())
      params.set('radius', String(localRadius))
    }
    const qs = params.toString()
    router.push(`/events${qs ? '?' + qs : ''}`)
    if (closeFilters) setFiltersOpen(false)
  }

  const clearFilters = (closeFilters = false) => {
    setLocalQuery('')
    setLocalCategory('All')
    setLocalLocation('Any')
    setLocalSort('soonest')
    setLocalMinPrice(0)
    setLocalMaxPrice(500)
    setLocalPostcode('')
    setLocalRadius(10)
    setPostcodeGeoStatus('idle')
    router.push('/events')
    if (closeFilters) setFiltersOpen(false)
  }

  const removeFilter = (key: 'q' | 'category' | 'location' | 'price' | 'postcode') => {
    const params = new URLSearchParams()
    if (key !== 'q' && query) params.set('q', query)
    if (key !== 'category' && category && category !== 'All') params.set('category', category)
    if (key !== 'location' && location && location !== 'Any') params.set('location', location)
    if (key !== 'price') {
      if (minPrice > 0) params.set('minPrice', String(minPrice))
      if (maxPrice < 500) params.set('maxPrice', String(maxPrice))
    }
    if (key !== 'postcode' && postcodeParam) {
      params.set('postcode', postcodeParam)
      params.set('radius', String(radiusParam))
    }
    if (sort && sort !== 'soonest') params.set('sort', sort)
    const qs = params.toString()
    router.push(`/events${qs ? '?' + qs : ''}`)
  }

  const categoriesList = ['All', ...CATEGORIES]

  return (
    <div className="flex flex-col md:flex-row max-w-7xl mx-auto px-4 py-8 gap-8 min-h-screen">

      {/* Sidebar Filters — desktop only */}
      <aside className="hidden md:block w-full md:w-64 shrink-0 space-y-8">
        <div>
          <h3 className="text-lg font-bold mb-4 font-serif">Filters</h3>

          <div className="space-y-4 mb-6">
            <label className="text-sm font-medium">Search</label>
            <Input
              type="text"
              placeholder="Event name..."
              value={localQuery}
              onChange={e => setLocalQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyFilters() }}
              className="bg-muted/50 border-input"
            />
          </div>

          <div className="space-y-3 mb-6">
            <label className="text-sm font-medium">Categories</label>
            <div className="space-y-2">
              {categoriesList.map(cat => (
                <div key={cat} className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={`cat-${cat}`}
                    name="category"
                    value={cat}
                    checked={localCategory === cat}
                    onChange={() => setLocalCategory(cat)}
                    className="accent-primary"
                  />
                  <label htmlFor={`cat-${cat}`} className="text-sm cursor-pointer hover:text-primary transition-colors">{cat}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <label className="text-sm font-medium">Location</label>
            <input
              type="text"
              list="browse-cities"
              placeholder="Any city..."
              value={localLocation === 'Any' ? '' : localLocation}
              onChange={e => setLocalLocation(e.target.value || 'Any')}
              className="w-full h-10 px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <datalist id="browse-cities">
              {CITIES.filter(c => c !== 'Any').map(city => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>

          <div className="space-y-3 mb-6">
            <label className="text-sm font-medium">Price Range (£)</label>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="0" value={localMinPrice} onChange={e => setLocalMinPrice(parseInt(e.target.value) || 0)} className="w-full text-center" />
              <span>-</span>
              <Input type="number" placeholder="500" value={localMaxPrice} onChange={e => setLocalMaxPrice(parseInt(e.target.value) || 500)} className="w-full text-center" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Leave empty or 0 to show all.</p>
          </div>

          <div className="space-y-3 mb-6">
            <label className="text-sm font-medium">Sort By</label>
            <select
              className="w-full h-10 px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={localSort}
              onChange={e => setLocalSort(e.target.value)}
            >
              <option value="soonest">Soonest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

          <div className="space-y-3 mb-6">
            <label className="text-sm font-medium">Near Postcode</label>
            <Input
              type="text"
              placeholder="e.g. SW1A 1AA"
              value={localPostcode}
              onChange={e => setLocalPostcode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') applyFilters() }}
              className="bg-muted/50 border-input"
            />
            {localPostcode.trim() && (
              <select
                className="w-full h-10 px-3 py-2 rounded-sm border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={localRadius}
                onChange={e => setLocalRadius(parseInt(e.target.value, 10))}
              >
                <option value={1}>Within 1 mile</option>
                <option value={5}>Within 5 miles</option>
                <option value={10}>Within 10 miles</option>
                <option value={25}>Within 25 miles</option>
              </select>
            )}
            {postcodeGeoStatus === 'error' && (
              <p className="text-xs text-destructive">Postcode not found — check and try again.</p>
            )}
          </div>

          <Button className="w-full bg-primary text-primary-foreground font-semibold" onClick={() => applyFilters()}>Apply Filters</Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h1
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '22px',
              color: '#0A0A0F',
              letterSpacing: '1px',
            }}
          >
            {location && location !== 'Any' ? `EVENTS IN ${location.toUpperCase()}` : 'ALL EVENTS'}
          </h1>
          <span className="text-muted-foreground text-sm">{loading ? '…' : `${events.length} results`}</span>
        </div>

        {/* Mobile filter toggle — hidden on desktop */}
        <div className="block md:hidden">
          <button
            onClick={() => setFiltersOpen(prev => !prev)}
            style={{
              width: '100%',
              background: '#FFFFFF',
              border: '1px solid #C0C0C8',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <span style={{ color: '#0A0A0F' }}><FilterIcon /></span>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600, color: '#0A0A0F' }}>
              Filters &amp; Search
            </span>
            {activeFilterCount > 0 && (
              <span style={{
                background: '#E63950',
                color: '#FFFFFF',
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 600,
              }}>
                {activeFilterCount}
              </span>
            )}
            <span style={{ color: '#0A0A0F' }}><ChevronIcon open={filtersOpen} /></span>
          </button>

          {/* Collapsible filter panel */}
          <div
            style={{
              overflow: 'hidden',
              maxHeight: filtersOpen ? '800px' : '0px',
              transition: 'max-height 0.3s ease',
            }}
          >
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #C0C0C8',
              borderTop: 'none',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              {/* Search */}
              <div>
                <Input
                  type="text"
                  placeholder="Event name..."
                  value={localQuery}
                  onChange={e => setLocalQuery(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Category pills */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    overflowX: 'auto',
                    paddingBottom: 4,
                    scrollbarWidth: 'none',
                  }}
                >
                  {categoriesList.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setLocalCategory(cat)}
                      style={{
                        flexShrink: 0,
                        border: `1px solid ${localCategory === cat ? '#0A0A0F' : '#C0C0C8'}`,
                        background: localCategory === cat ? '#0A0A0F' : 'transparent',
                        color: localCategory === cat ? '#FFFFFF' : '#0A0A0F',
                        padding: '6px 14px',
                        fontSize: 13,
                        cursor: 'pointer',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <input
                  type="text"
                  list="browse-cities-mobile"
                  placeholder="Any city..."
                  value={localLocation === 'Any' ? '' : localLocation}
                  onChange={e => setLocalLocation(e.target.value || 'Any')}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 12px',
                    border: '1px solid #C0C0C8',
                    background: '#FFFFFF',
                    fontSize: 14,
                    color: '#0A0A0F',
                    outline: 'none',
                  }}
                />
                <datalist id="browse-cities-mobile">
                  {CITIES.filter(c => c !== 'Any').map(city => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>

              {/* Near Postcode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Input
                  type="text"
                  placeholder="Near postcode (e.g. SW1A 1AA)"
                  value={localPostcode}
                  onChange={e => setLocalPostcode(e.target.value.toUpperCase())}
                  className="w-full"
                />
                {localPostcode.trim() && (
                  <select
                    value={localRadius}
                    onChange={e => setLocalRadius(parseInt(e.target.value, 10))}
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      border: '1px solid #C0C0C8',
                      background: '#FFFFFF',
                      fontSize: 14,
                      color: '#0A0A0F',
                      outline: 'none',
                    }}
                  >
                    <option value={1}>Within 1 mile</option>
                    <option value={5}>Within 5 miles</option>
                    <option value={10}>Within 10 miles</option>
                    <option value={25}>Within 25 miles</option>
                  </select>
                )}
                {postcodeGeoStatus === 'error' && (
                  <p style={{ fontSize: 12, color: '#E63950' }}>Postcode not found — check and try again.</p>
                )}
              </div>

              {/* Apply / Clear */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => applyFilters(true)}
                  style={{
                    flex: 1,
                    background: '#0A0A0F',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 0',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Apply
                </button>
                <button
                  onClick={() => clearFilters(true)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: '#0A0A0F',
                    border: '1px solid #C0C0C8',
                    padding: '10px 0',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        <div className="flex flex-wrap gap-2">
          {query && <Badge variant="muted" className="px-3 py-1 font-medium bg-muted">&quot;{query}&quot; <span className="ml-2 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => removeFilter('q')}>×</span></Badge>}
          {category && category !== 'All' && <Badge variant="muted" className="px-3 py-1 font-medium bg-muted">{category} <span className="ml-2 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => removeFilter('category')}>×</span></Badge>}
          {location && location !== 'Any' && <Badge variant="muted" className="px-3 py-1 font-medium bg-muted">{location} <span className="ml-2 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => removeFilter('location')}>×</span></Badge>}
          {(minPrice > 0 || maxPrice < 500) && <Badge variant="muted" className="px-3 py-1 font-medium bg-muted">£{minPrice} - £{maxPrice} <span className="ml-2 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => removeFilter('price')}>×</span></Badge>}
          {postcodeParam && <Badge variant="muted" className="px-3 py-1 font-medium bg-muted">Within {radiusParam}mi of {postcodeParam} <span className="ml-2 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => removeFilter('postcode')}>×</span></Badge>}
          {(query || (category && category !== 'All') || (location && location !== 'Any') || minPrice > 0 || maxPrice < 500 || postcodeParam) && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0 hover:text-primary" onClick={() => clearFilters()}>Clear all</Button>
          )}
        </div>

        {fetchError && (
          <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-none">
            Error loading events. Please try again later.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Loading events…
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed rounded-none bg-muted/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search-x text-muted-foreground mb-4"><path d="m13.5 8.5-5 5" /><path d="m8.5 8.5 5 5" /><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <h3 className="text-xl font-semibold mb-2">No events match your criteria</h3>
            <p className="text-muted-foreground max-w-sm mb-6">Try adjusting your filters, searching for something else, or removing the location constraint.</p>
            <Button variant="outline" className="rounded-full" onClick={() => clearFilters()}>Clear Filters</Button>
          </div>
        )}
      </main>
    </div>
  )
}
