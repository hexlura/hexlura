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

    return (
        <div>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #E0E0E8', marginBottom: '24px' }}>
                <button
                    onClick={() => setActiveTab('events')}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        paddingBottom: '10px',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: activeTab === 'events' ? '#E63950' : '#666677',
                        borderBottom: activeTab === 'events' ? '2px solid #E63950' : '2px solid transparent',
                        marginBottom: '-1px',
                        transition: 'color 0.15s, border-color 0.15s',
                    }}
                >
                    Events ({eventCount})
                </button>
                <button
                    onClick={() => setActiveTab('organisers')}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        paddingBottom: '10px',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: activeTab === 'organisers' ? '#E63950' : '#666677',
                        borderBottom: activeTab === 'organisers' ? '2px solid #E63950' : '2px solid transparent',
                        marginBottom: '-1px',
                        transition: 'color 0.15s, border-color 0.15s',
                    }}
                >
                    Organisers ({organiserCount})
                </button>
            </div>

            {/* Tab content */}
            {activeTab === 'events' ? eventsContent : organisersContent}
        </div>
    );
}
