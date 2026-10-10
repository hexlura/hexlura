import Link from 'next/link'
import { SEASONS, type SeasonKey } from '@/lib/home-theme-config'
import { SeasonFx } from './SeasonFx'

// Rendered at the top of the homepage while a theme is active. The hidden marker is what the
// stylesheet keys on (`.warm-theme:has([data-season="…"])`), so the navbar and footer in the shared
// layout pick up the palette too — without the layout itself needing to know about the theme
// (reading it there would make every public page dynamic).
export function SeasonTop({ season, particles }: { season: SeasonKey; particles: boolean }) {
    const cfg = SEASONS[season]
    return (
        <>
            <span hidden data-season={season} />
            <div className="season-bar relative z-50 flex items-center justify-center gap-3 px-4 text-xs sm:text-sm font-semibold text-white">
                <span className="truncate">{cfg.bar.text}</span>
                <Link href={`/events?q=${encodeURIComponent(cfg.bar.q)}`} className="shrink-0 underline underline-offset-2 hover:no-underline">
                    {cfg.bar.cta}
                </Link>
            </div>
            {particles && <SeasonFx fx={cfg.fx} />}
        </>
    )
}
