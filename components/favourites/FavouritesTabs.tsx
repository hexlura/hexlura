'use client';

import { useState } from 'react';

interface FavouritesTabsProps {
    eventsContent: React.ReactNode;
    organisersContent: React.ReactNode;
    eventCount: number;
    organiserCount: number;
}

export default function FavouritesTabs({ eventsContent, organisersContent, eventCount, organiserCount }: FavouritesTabsProps) {
    const [activeTab, setActiveTab] = useState<'events' | 'organisers'>('events');

    const tabClass = (active: boolean) =>
        `pb-3 border-b-2 transition ${active ? 'text-text border-accent' : 'text-muted border-transparent hover:text-text'}`;

    return (
        <div>
            {/* Tab bar */}
            <div className="flex items-center gap-6 border-b border-border mb-6 text-sm font-semibold">
                <button onClick={() => setActiveTab('events')} className={tabClass(activeTab === 'events')}>
                    Events ({eventCount})
                </button>
                <button onClick={() => setActiveTab('organisers')} className={tabClass(activeTab === 'organisers')}>
                    Organisers ({organiserCount})
                </button>
            </div>

            {/* Tab content */}
            {activeTab === 'events' ? eventsContent : organisersContent}
        </div>
    );
}
