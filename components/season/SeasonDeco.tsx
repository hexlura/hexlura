import type { SeasonConfig } from '@/lib/home-theme-config'

const LIGHT_COLOURS = ['#ff4d5e', '#ffd25a', '#3ddc84', '#6ec1ff']

function Web({ flip }: { flip?: boolean }) {
    return (
        <svg
            className="season-web"
            style={flip ? { right: 0, transform: 'scaleX(-1)' } : { left: 0 }}
            viewBox="0 0 200 200"
            fill="none"
            stroke="#fff"
            strokeWidth="1"
        >
            <path d="M0 0 L200 0 M0 0 L0 200 M0 0 L170 110 M0 0 L110 170 M0 0 L200 40 M0 0 L40 200" />
            <path d="M40 0 Q35 35 0 40 M80 0 Q70 70 0 80 M120 0 Q105 105 0 120 M160 0 Q140 140 0 160" />
        </svg>
    )
}

// Static hero decoration (cobwebs / blinking lights / snow line). Pure CSS, no client JS.
export function SeasonDeco({ kind }: { kind: SeasonConfig['deco'] }) {
    if (kind === 'none') return null
    return (
        <div aria-hidden className="absolute inset-0 z-[2] pointer-events-none">
            {kind === 'web' && (<><Web /><Web flip /></>)}
            {kind === 'lights' && (
                <div className="season-lights">
                    {Array.from({ length: 26 }, (_, i) => (
                        <i key={i} style={{ color: LIGHT_COLOURS[i % 4], animationDelay: `${(i % 5) * 0.3}s` }} />
                    ))}
                </div>
            )}
            {kind === 'snow' && <div className="season-snowline" />}
        </div>
    )
}
