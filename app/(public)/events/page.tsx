import React from 'react';
import { createClient } from '@/lib/supabase/server';
import EventCard from '@/components/events/EventCard';
import { Event } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

export const revalidate = 0; // Dynamic page based on search parameters

export default async function BrowseEventsPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const supabase = createClient();

    const query = searchParams.q as string;
    const category = searchParams.category as string;
    const location = (searchParams.location || searchParams.city) as string;
    const sort = (searchParams.sort as string) || 'soonest';
    const minPrice = parseInt((searchParams.minPrice as string) || '0', 10);
    const maxPrice = parseInt((searchParams.maxPrice as string) || '500', 10);

    let eventsQuery = supabase
        .from('events')
        .select('*, organiser:organiser_profiles(*), ticket_types!inner(*)')
        .eq('status', 'published');

    if (query) {
        eventsQuery = eventsQuery.ilike('title', `%${query}%`);
    }

    if (category && category !== 'All') {
        eventsQuery = eventsQuery.eq('category', category);
    }

    // Location filter (mocked based on venue_address for now)
    if (location && location !== 'Any') {
        eventsQuery = eventsQuery.ilike('venue_address', `%${location}%`);
    }

    // Price filter (requires post-filtering or a more complex RPC/join query since price is in ticket_types)
    // For simplicity, we just filter the ticket_types relationship directly.
    eventsQuery = eventsQuery.gte('ticket_types.price_pence', minPrice * 100);
    eventsQuery = eventsQuery.lte('ticket_types.price_pence', maxPrice * 100);

    // Sorting
    switch (sort) {
        case 'soonest':
            eventsQuery = eventsQuery.order('start_at', { ascending: true });
            break;
        case 'price-low':
            // Requires sorting by join table, doing fallback approach
            eventsQuery = eventsQuery.order('start_at', { ascending: true });
            break;
        case 'price-high':
            eventsQuery = eventsQuery.order('start_at', { ascending: true });
            break;
        case 'popular':
            // Requires popularity logic
            eventsQuery = eventsQuery.order('created_at', { ascending: false });
            break;
        default:
            eventsQuery = eventsQuery.order('start_at', { ascending: true });
    }

    const { data: eventsRaw, error } = await eventsQuery;
    const events = (eventsRaw || []) as unknown as Event[];

    // Note: Since Supabase inner joins filter out rows without matching inner conditions, 
    // it automatically handles our price filters correctly if the event has passing ticket_types!

    const categoriesList = ['All', 'Music', 'Sports', 'Comedy', 'Theatre', 'Festival', 'Corporate', 'Family', 'Culture'];
    const cities = ['Any', 'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Edinburgh', 'Bristol', 'Liverpool', 'Cardiff', 'Belfast'];

    return (
        <div className="flex flex-col md:flex-row max-w-7xl mx-auto px-4 py-8 gap-8 min-h-screen">
            {/* Sidebar Filters */}
            <aside className="w-full md:w-64 shrink-0 space-y-8">
                <div>
                    <h3 className="text-lg font-bold mb-4 font-serif">Filters</h3>

                    {/* Search */}
                    <div className="space-y-4 mb-6">
                        <label className="text-sm font-medium">Search</label>
                        <Input
                            type="text"
                            placeholder="Event name..."
                            defaultValue={query}
                            className="bg-muted/50 border-input"
                        />
                    </div>

                    {/* Categories */}
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
                                        defaultChecked={category === cat || (cat === 'All' && !category)}
                                        className="accent-primary"
                                    />
                                    <label htmlFor={`cat-${cat}`} className="text-sm cursor-pointer hover:text-primary transition-colors">{cat}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-3 mb-6">
                        <label className="text-sm font-medium">Location</label>
                        <select
                            name="location"
                            className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            defaultValue={location || 'Any'}
                        >
                            {cities.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-3 mb-6">
                        <label className="text-sm font-medium">Price Range (£)</label>
                        <div className="flex items-center gap-2">
                            <Input type="number" name="minPrice" placeholder="0" defaultValue={minPrice} className="w-full text-center" />
                            <span>-</span>
                            <Input type="number" name="maxPrice" placeholder="500" defaultValue={maxPrice} className="w-full text-center" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Leave empty or 0 to show all.</p>
                    </div>

                    {/* Sort */}
                    <div className="space-y-3 mb-6">
                        <label className="text-sm font-medium">Sort By</label>
                        <select
                            name="sort"
                            className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            defaultValue={sort}
                        >
                            <option value="soonest">Soonest</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="popular">Most Popular</option>
                        </select>
                    </div>

                    <Button className="w-full bg-primary text-primary-foreground font-semibold">Apply Filters</Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 space-y-6">
                <div className="flex items-center justify-between">
                    <h1
                        style={{
                            fontFamily: '"Bebas Neue", sans-serif',
                            fontSize: '22px',
                            color: '#F0F0F8',
                            letterSpacing: '1px',
                        }}
                    >
                        {location && location !== 'Any' ? `EVENTS IN ${location.toUpperCase()}` : 'ALL EVENTS'}
                    </h1>
                    <span className="text-muted-foreground text-sm">{events.length} results</span>
                </div>

                {/* Active Filters */}
                <div className="flex flex-wrap gap-2">
                    {query && <Badge variant="muted" className="px-3 py-1 font-medium bg-muted">&quot;{query}&quot; <span className="ml-2 cursor-pointer text-muted-foreground hover:text-destructive">×</span></Badge>}
                    {category && category !== 'All' && <Badge variant="muted" className="px-3 py-1 font-medium bg-muted">{category} <span className="ml-2 cursor-pointer text-muted-foreground hover:text-destructive">×</span></Badge>}
                    {location && location !== 'Any' && <Badge variant="muted" className="px-3 py-1 font-medium bg-muted">{location} <span className="ml-2 cursor-pointer text-muted-foreground hover:text-destructive">×</span></Badge>}
                    {(minPrice > 0 || maxPrice < 500) && <Badge variant="muted" className="px-3 py-1 font-medium bg-muted">£{minPrice} - £{maxPrice} <span className="ml-2 cursor-pointer text-muted-foreground hover:text-destructive">×</span></Badge>}
                    {(query || (category && category !== 'All') || (location && location !== 'Any') || minPrice > 0 || maxPrice < 500) && (
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0 hover:text-primary">Clear all</Button>
                    )}
                </div>

                {error && (
                    <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                        Error loading events. Please try again later.
                    </div>
                )}

                {/* Results Grid */}
                {events.length > 0 ? (
                    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4 gap-[14px]">
                        {events.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed rounded-xl bg-muted/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search-x text-muted-foreground mb-4"><path d="m13.5 8.5-5 5" /><path d="m8.5 8.5 5 5" /><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        <h3 className="text-xl font-semibold mb-2">No events match your criteria</h3>
                        <p className="text-muted-foreground max-w-sm mb-6">Try adjusting your filters, searching for something else, or removing the location constraint.</p>
                        <Button variant="outline" className="rounded-full">Clear Filters</Button>
                    </div>
                )}

            </main>
        </div>
    );
}
