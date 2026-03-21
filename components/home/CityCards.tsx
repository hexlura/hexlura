import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const CITIES = [
    { name: 'London',     photo: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80' },
    { name: 'Manchester', photo: 'https://images.unsplash.com/photo-1588436706487-9d55d73a39e3?w=600&q=80' },
    { name: 'Birmingham', photo: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80' },
    { name: 'Edinburgh',  photo: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&q=80' },
    { name: 'Liverpool',  photo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
    { name: 'Bristol',    photo: 'https://images.unsplash.com/photo-1603059748268-a6f48c74b46a?w=600&q=80' },
]

export default async function CityCards() {
    const supabase = createClient()
    const now = new Date().toISOString()

    const counts = await Promise.all(
        CITIES.map(async ({ name }) => {
            const { count } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'published')
                .gt('start_at', now)
                .ilike('venue_address', `%${name}%`)
            return count ?? 0
        })
    )

    return (
        <section className="bg-background py-12 px-4">
            <div className="max-w-7xl mx-auto">
                <h2 className="font-heading text-3xl text-text tracking-wide mb-8">EXPLORE BY CITY</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {CITIES.map(({ name, photo }, i) => {
                        const count = counts[i]
                        return (
                            <Link
                                key={name}
                                href={`/events?city=${encodeURIComponent(name)}`}
                                className="group block relative overflow-hidden rounded-2xl"
                            >
                                <div className="relative h-[160px] md:h-[200px] overflow-hidden rounded-2xl">
                                    <Image
                                        src={photo}
                                        alt={`${name} events`}
                                        fill
                                        sizes="(max-width: 768px) 50vw, 33vw"
                                        className="object-cover transition-transform duration-[400ms] ease-out group-hover:scale-105"
                                    />
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)',
                                        }}
                                    />
                                    <div className="absolute bottom-0 left-0 p-4">
                                        <p
                                            className="text-white leading-none"
                                            style={{
                                                fontFamily: '"Bebas Neue", sans-serif',
                                                fontSize: '32px',
                                                letterSpacing: '3px',
                                            }}
                                        >
                                            {name}
                                        </p>
                                        <p
                                            className="text-[13px] mt-1"
                                            style={{ color: count > 0 ? '#E63950' : '#8888AA' }}
                                        >
                                            {count > 0 ? `${count} event${count !== 1 ? 's' : ''}` : 'Coming soon'}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
