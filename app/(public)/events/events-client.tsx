'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import EventCard from '@/components/events/EventCard'
import { Event } from '@/types'
import { ThemedSelect } from '@/components/ui/ThemedSelect'
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

  const applyFilters = (closeFilters = false, sortOverride?: string) => {
    const params = new URLSearchParams()
    if (localQuery) params.set('q', localQuery)
    if (localCategory && localCategory !== 'All') params.set('category', localCategory)
    if (localLocation && localLocation !== 'Any') params.set('location', localLocation)
    const sortToUse = sortOverride ?? localSort
    if (sortToUse && sortToUse !== 'soonest') params.set('sort', sortToUse)
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

  const field = 'w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-warm-red/25'
  const sectionLabel = 'text-xs font-bold text-muted tracking-widest mb-2.5'
  const hasFilters = !!(query || (category && category !== 'All') || (location && location !== 'Any') || minPrice > 0 || maxPrice < 500 || postcodeParam)
  const chip = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium'
  const chipX = 'text-muted hover:text-accent cursor-pointer'

  const radiusSelect = (
    <ThemedSelect value={localRadius} onChange={e => setLocalRadius(parseInt(e.target.value, 10))} className="w-full">
      <option value={1}>Within 1 mile</option>
      <option value={5}>Within 5 miles</option>
      <option value={10}>Within 10 miles</option>
      <option value={25}>Within 25 miles</option>
    </ThemedSelect>
  )

  return (
    <div className="flex flex-col lg:flex-row max-w-7xl mx-auto px-6 lg:px-10 py-8 gap-8 min-h-screen">

      {/* ============ Filter sidebar — desktop ============ */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="bg-card rounded-2xl border border-border shadow-soft p-5 sticky top-24">
          <div className="flex items-center justify-between mb-5">
            <p className="font-heading text-lg tracking-wide">FILTERS</p>
            {hasFilters && (
              <button className="text-xs text-accent font-semibold hover:underline" onClick={() => clearFilters()}>Clear all</button>
            )}
          </div>

          <div className="mb-6">
            <p className={sectionLabel}>SEARCH</p>
            <input
              type="text"
              placeholder="Event name…"
              value={localQuery}
              onChange={e => setLocalQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyFilters() }}
              className={field}
            />
          </div>

          <div className="mb-6">
            <p className={sectionLabel}>CATEGORY</p>
            <div className="flex flex-col gap-2 text-sm">
              {categoriesList.map(cat => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors">
                  <input
                    type="radio"
                    name="category"
                    value={cat}
                    checked={localCategory === cat}
                    onChange={() => setLocalCategory(cat)}
                    className="accent-[#E63950]"
                  />
                  {cat === 'All' ? 'All Categories' : cat}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className={sectionLabel}>CITY</p>
            <input
              type="text"
              list="browse-cities"
              placeholder="Any city…"
              value={localLocation === 'Any' ? '' : localLocation}
              onChange={e => setLocalLocation(e.target.value || 'Any')}
              className={field}
            />
            <datalist id="browse-cities">
              {CITIES.filter(c => c !== 'Any').map(city => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>

          <div className="mb-6">
            <p className={sectionLabel}>PRICE RANGE (£)</p>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="Min" value={localMinPrice || ''} onChange={e => setLocalMinPrice(parseInt(e.target.value) || 0)} className={field} />
              <span className="text-muted">—</span>
              <input type="number" placeholder="Max" value={localMaxPrice === 500 ? '' : localMaxPrice} onChange={e => setLocalMaxPrice(parseInt(e.target.value) || 500)} className={field} />
            </div>
            <p className="text-xs text-muted mt-1.5">Leave empty to show all.</p>
          </div>

          <div className="mb-6">
            <p className={sectionLabel}>NEAR POSTCODE</p>
            <input
              type="text"
              placeholder="e.g. SW1A 1AA"
              value={localPostcode}
              onChange={e => setLocalPostcode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') applyFilters() }}
              className={`${field} mb-2`}
            />
            {localPostcode.trim() && radiusSelect}
            {postcodeGeoStatus === 'error' && (
              <p className="text-xs font-semibold text-accent mt-1.5">Postcode not found — check and try again.</p>
            )}
          </div>

          <button
            className="w-full py-2.5 rounded-full bg-[#1A0E0C] text-white text-sm font-semibold hover:bg-black transition"
            onClick={() => applyFilters()}
          >
            Apply Filters
          </button>
        </div>
      </aside>

      {/* ============ Results ============ */}
      <main className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-3xl tracking-wide">
              {location && location !== 'Any' ? `EVENTS IN ${location.toUpperCase()}` : 'BROWSE EVENTS'}
            </h1>
            <p className="text-sm text-muted mt-1">{loading ? 'Loading…' : `${events.length} event${events.length === 1 ? '' : 's'} found`}</p>
          </div>
          <ThemedSelect
            value={sort}
            onChange={e => { setLocalSort(e.target.value); applyFilters(false, e.target.value) }}
            aria-label="Sort events"
          >
            <option value="soonest">Sort: Soonest</option>
            <option value="price-low">Sort: Price (Low to High)</option>
            <option value="price-high">Sort: Price (High to Low)</option>
            <option value="popular">Sort: Most Popular</option>
          </ThemedSelect>
        </div>

        {/* Mobile filter toggle — hidden on desktop */}
        <div className="block lg:hidden mb-5">
          <button
            onClick={() => setFiltersOpen(prev => !prev)}
            className={`w-full bg-card border border-border shadow-soft px-4 py-3 flex items-center gap-2 ${filtersOpen ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <FilterIcon />
            <span className="flex-1 text-left text-sm font-semibold">Filters &amp; Search</span>
            {activeFilterCount > 0 && (
              <span className="bg-accent text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{activeFilterCount}</span>
            )}
            <ChevronIcon open={filtersOpen} />
          </button>

          <div style={{ overflow: 'hidden', maxHeight: filtersOpen ? '900px' : '0px', transition: 'max-height 0.3s ease' }}>
            <div className="bg-card border border-border border-t-0 rounded-b-2xl p-4 flex flex-col gap-4">
              <input
                type="text"
                placeholder="Event name…"
                value={localQuery}
                onChange={e => setLocalQuery(e.target.value)}
                className={field}
              />

              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {categoriesList.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setLocalCategory(cat)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] whitespace-nowrap border transition ${localCategory === cat ? 'bg-[#1A0E0C] border-[#1A0E0C] text-white' : 'bg-card border-border'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div>
                <input
                  type="text"
                  list="browse-cities-mobile"
                  placeholder="Any city…"
                  value={localLocation === 'Any' ? '' : localLocation}
                  onChange={e => setLocalLocation(e.target.value || 'Any')}
                  className={field}
                />
                <datalist id="browse-cities-mobile">
                  {CITIES.filter(c => c !== 'Any').map(city => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Near postcode (e.g. SW1A 1AA)"
                  value={localPostcode}
                  onChange={e => setLocalPostcode(e.target.value.toUpperCase())}
                  className={field}
                />
                {localPostcode.trim() && radiusSelect}
                {postcodeGeoStatus === 'error' && (
                  <p className="text-xs font-semibold text-accent">Postcode not found — check and try again.</p>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => applyFilters(true)} className="flex-1 py-2.5 rounded-full bg-[#1A0E0C] text-white text-sm font-semibold">Apply</button>
                <button onClick={() => clearFilters(true)} className="flex-1 py-2.5 rounded-full border border-border bg-card text-sm font-semibold">Clear</button>
              </div>
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {query && <span className={chip}>&quot;{query}&quot; <button className={chipX} onClick={() => removeFilter('q')} aria-label="Remove search">✕</button></span>}
            {category && category !== 'All' && <span className={chip}>{category} <button className={chipX} onClick={() => removeFilter('category')} aria-label="Remove category">✕</button></span>}
            {location && location !== 'Any' && <span className={chip}>{location} <button className={chipX} onClick={() => removeFilter('location')} aria-label="Remove city">✕</button></span>}
            {(minPrice > 0 || maxPrice < 500) && <span className={chip}>£{minPrice} - £{maxPrice} <button className={chipX} onClick={() => removeFilter('price')} aria-label="Remove price">✕</button></span>}
            {postcodeParam && <span className={chip}>Within {radiusParam}mi of {postcodeParam} <button className={chipX} onClick={() => removeFilter('postcode')} aria-label="Remove postcode">✕</button></span>}
            <button className="text-xs text-accent font-semibold hover:underline" onClick={() => clearFilters()}>Clear all</button>
          </div>
        )}

        {fetchError && (
          <div className="p-4 mb-5 rounded-xl bg-warm-red/10 text-warm-red text-sm font-semibold">
            Error loading events. Please try again later.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted">Loading events…</div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card rounded-2xl border border-dashed border-border">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted mb-4"><path d="m13.5 8.5-5 5" /><path d="m8.5 8.5 5 5" /><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <h3 className="text-xl font-semibold mb-2">No events match your criteria</h3>
            <p className="text-muted max-w-sm mb-6">Try adjusting your filters, searching for something else, or removing the location constraint.</p>
            <button className="px-6 py-2.5 rounded-full border border-border bg-card text-sm font-semibold hover:bg-background transition" onClick={() => clearFilters()}>Clear Filters</button>
          </div>
        )}
      </main>
    </div>
  )
}
