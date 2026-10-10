/**
 * Seasonal homepage themes.
 *
 * Admin controls (`/admin/settings` → Homepage Theme), stored in `platform_settings`:
 *   home_theme_mode       'auto' | 'off' | one of SEASON_KEYS   (default 'auto')
 *   home_theme_particles  'true' | 'false'                     (default 'true')
 *
 * In 'auto' mode the theme follows the date windows in AUTO_WINDOWS (UK time).
 * Everything season-specific lives in SEASONS below — adding Easter / Diwali = one more entry
 * here, one more CSS block in globals.css, and one more key in SEASON_KEYS.
 */

export const SEASON_KEYS = ['halloween', 'christmas', 'winter', 'newyear'] as const
export type SeasonKey = typeof SEASON_KEYS[number]

export const HOME_THEME_MODES = ['auto', 'off', ...SEASON_KEYS] as const
export type HomeThemeMode = typeof HOME_THEME_MODES[number]

export const HOME_THEME_SETTING_KEYS = ['home_theme_mode', 'home_theme_particles'] as const

/** Inclusive date windows as MMDD numbers (e.g. 1010 = 10 Oct). Earlier entries win on overlap. */
const AUTO_WINDOWS: { key: SeasonKey; ranges: [number, number][] }[] = [
    { key: 'newyear', ranges: [[1226, 1231], [101, 102]] },
    { key: 'christmas', ranges: [[1201, 1225]] },
    { key: 'halloween', ranges: [[1010, 1101]] },
    { key: 'winter', ranges: [[103, 229]] },
]

export interface SeasonLink { label: string; q: string }
export interface SeasonTile { emoji: string; label: string; sub: string; q: string }

export interface SeasonConfig {
    label: string
    bar: { text: string; cta: string; q: string }
    badge: string
    headline: string
    chips: SeasonLink[]
    titles: { city: string; upcoming: string }
    sticker: string
    divider: string
    greeting: string
    deco: 'web' | 'lights' | 'snow' | 'none'
    fx: { type: 'fall' | 'rise' | 'float'; items: string[]; count: number }
    collection: { kicker: string; title: string; sub: string; cta: string; q: string; deco: string; tiles: SeasonTile[] }
}

export const SEASONS: Record<SeasonKey, SeasonConfig> = {
    halloween: {
        label: 'Halloween',
        bar: { text: '🎃 Halloween weekend is here — costume parties, club nights & haunted events', cta: 'Spooky events →', q: 'halloween' },
        badge: '🎃 HALLOWEEN NIGHTS · 31 OCT',
        headline: 'SPOOKIEST NIGHT OUT',
        chips: [
            { label: '🎃 Halloween Parties', q: 'halloween' },
            { label: '🦇 Club Nights', q: 'halloween club' },
            { label: '👻 Haunted Events', q: 'haunted' },
            { label: '🧛 Costume Contests', q: 'costume' },
            { label: '🍸 Cocktail Nights', q: 'cocktail' },
        ],
        titles: { city: 'SPOOKY CITIES', upcoming: 'HALLOWEEN & UPCOMING EVENTS' },
        sticker: '🎃',
        divider: '🦇 🎃 🕸️ 👻 🦇 🎃 🕸️ 👻 🦇 🎃 🕸️ 👻 🦇 🎃 🕸️ 👻 🦇 🎃 🕸️ 👻',
        greeting: '🎃 Happy Halloween from all of us at Hexlura — stay spooky, stay safe 👻',
        deco: 'web',
        fx: { type: 'float', items: ['🦇', '🦇', '👻', '🎃', '🕸️'], count: 14 },
        collection: {
            kicker: '🎃 HALLOWEEN COLLECTION', title: 'DARE TO GO OUT TONIGHT',
            sub: 'Costume parties, haunted venues and the biggest club nights of the spooky season.',
            cta: 'See all Halloween events →', q: 'halloween', deco: '🕸️',
            tiles: [
                { emoji: '🧛', label: 'Costume Parties', sub: 'Dress to scare', q: 'costume' },
                { emoji: '🏚️', label: 'Haunted Venues', sub: 'Not for the faint-hearted', q: 'haunted' },
                { emoji: '🦇', label: 'Spooky Club Nights', sub: 'Dance till dawn', q: 'halloween club' },
                { emoji: '🍬', label: 'Family Trick-or-Treat', sub: 'Fun for the little monsters', q: 'trick or treat' },
            ],
        },
    },
    christmas: {
        label: 'Christmas',
        bar: { text: '🎄 Christmas parties are selling fast — book your festive night out', cta: 'Festive events →', q: 'christmas' },
        badge: '🎄 FESTIVE SEASON · DEC',
        headline: 'MERRIEST NIGHT OUT',
        chips: [
            { label: '🎄 Christmas Parties', q: 'christmas' },
            { label: '🎅 Santa Specials', q: 'santa' },
            { label: '🎶 Carol & Choir', q: 'carol' },
            { label: '🍷 Mulled Wine Nights', q: 'mulled wine' },
            { label: '🎁 Gift an Event', q: 'christmas gift' },
        ],
        titles: { city: 'FESTIVE CITIES', upcoming: 'CHRISTMAS & UPCOMING EVENTS' },
        sticker: '🎁',
        divider: '🎄 ⭐ 🎁 ❄️ 🎅 🎄 ⭐ 🎁 ❄️ 🎅 🎄 ⭐ 🎁 ❄️ 🎅 🎄 ⭐ 🎁 ❄️ 🎅',
        greeting: '🎄 Merry Christmas from Hexlura — thank you for a brilliant year 🎁',
        deco: 'lights',
        fx: { type: 'fall', items: ['❄️', '✨', '❄️', '⭐'], count: 30 },
        collection: {
            kicker: '🎄 FESTIVE COLLECTION', title: 'THE MOST WONDERFUL NIGHTS',
            sub: 'Office parties, carol nights and festive club events — sorted before the rush.',
            cta: 'See all festive events →', q: 'christmas', deco: '❄️',
            tiles: [
                { emoji: '🎉', label: 'Christmas Parties', sub: 'Work do or friends', q: 'christmas party' },
                { emoji: '🎅', label: 'Santa Specials', sub: 'Family favourites', q: 'santa' },
                { emoji: '🎶', label: 'Carol & Choir', sub: 'Feel the spirit', q: 'carol' },
                { emoji: '🎁', label: 'Gift an Event', sub: 'The perfect present', q: 'christmas' },
            ],
        },
    },
    winter: {
        label: 'Winter',
        bar: { text: '❄️ Cosy up this winter — gigs, comedy & warm-up nights near you', cta: 'Winter events →', q: 'winter' },
        badge: '❄️ WINTER LINE-UP',
        headline: 'COOLEST NIGHT OUT',
        chips: [
            { label: '🎤 Live Gigs', q: 'live' },
            { label: '😂 Comedy', q: 'comedy' },
            { label: '🔥 Warm-up Nights', q: 'winter' },
            { label: '☕ Winter Markets', q: 'market' },
            { label: '🎭 Theatre', q: 'theatre' },
        ],
        titles: { city: 'WARM-UP CITIES', upcoming: 'WINTER & UPCOMING EVENTS' },
        sticker: '❄️',
        divider: '❄️ ❅ ❆ ❄️ ❅ ❆ ❄️ ❅ ❆ ❄️ ❅ ❆ ❄️ ❅ ❆ ❄️ ❅ ❆ ❄️ ❅ ❆',
        greeting: '❄️ Wrap up warm and get out there — see you at the next event ☕',
        deco: 'snow',
        fx: { type: 'fall', items: ['❄️', '❅', '❆', '•'], count: 38 },
        collection: {
            kicker: '❄️ WINTER COLLECTION', title: 'BEAT THE WINTER BLUES',
            sub: 'Live gigs, stand-up and warm-up nights — the best reasons to leave the sofa.',
            cta: 'See all winter events →', q: 'winter', deco: '❄️',
            tiles: [
                { emoji: '🎤', label: 'Live Gigs', sub: 'Loud and warm', q: 'live' },
                { emoji: '😂', label: 'Comedy Nights', sub: 'Laugh the cold away', q: 'comedy' },
                { emoji: '☕', label: 'Winter Markets', sub: 'Mulled & cosy', q: 'market' },
                { emoji: '🎭', label: 'Theatre', sub: 'Curtain up', q: 'theatre' },
            ],
        },
    },
    newyear: {
        label: 'New Year',
        bar: { text: "🎆 New Year's Eve is coming — grab tickets before they're gone", cta: 'NYE events →', q: 'new year' },
        badge: "🎆 NEW YEAR'S EVE · 31 DEC",
        headline: 'BIGGEST NIGHT OUT',
        chips: [
            { label: '🎆 NYE Parties', q: 'new year' },
            { label: '🥂 Countdown Nights', q: 'countdown' },
            { label: '🪩 Club Takeovers', q: 'nye club' },
            { label: '🍾 VIP Tables', q: 'vip' },
            { label: '🎶 Live Music', q: 'live' },
        ],
        titles: { city: 'COUNTDOWN CITIES', upcoming: 'NYE & UPCOMING EVENTS' },
        sticker: '🥂',
        divider: '✨ 🎆 🥂 🎉 ✨ 🎆 🥂 🎉 ✨ 🎆 🥂 🎉 ✨ 🎆 🥂 🎉 ✨ 🎆 🥂 🎉',
        greeting: "🥂 Happy New Year from Hexlura — here's to even bigger nights ahead 🎆",
        deco: 'none',
        fx: { type: 'rise', items: ['✨', '🎉', '⭐', '🎊', '✨'], count: 24 },
        collection: {
            kicker: '🎆 NEW YEAR COLLECTION', title: 'COUNT IT DOWN IN STYLE',
            sub: 'The biggest countdown parties, club takeovers and VIP tables across the UK.',
            cta: 'See all NYE events →', q: 'new year', deco: '✨',
            tiles: [
                { emoji: '🥂', label: 'Countdown Parties', sub: 'Ring it in', q: 'countdown' },
                { emoji: '🪩', label: 'Club Takeovers', sub: 'All-night sets', q: 'nye club' },
                { emoji: '🍾', label: 'VIP Tables', sub: 'Do it properly', q: 'vip' },
                { emoji: '🎶', label: 'Live Music', sub: 'Midnight encore', q: 'live' },
            ],
        },
    },
}

export function isHomeThemeMode(v: unknown): v is HomeThemeMode {
    return typeof v === 'string' && (HOME_THEME_MODES as readonly string[]).includes(v)
}

/** MMDD in UK time, e.g. 10 Oct → 1010. */
function ukMonthDay(now: Date): number {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', month: 'numeric', day: 'numeric' }).formatToParts(now)
    const month = Number(parts.find(p => p.type === 'month')?.value)
    const day = Number(parts.find(p => p.type === 'day')?.value)
    return month * 100 + day
}

/** The season the date windows pick for `now`, ignoring any admin override. */
export function seasonForDate(now: Date = new Date()): SeasonKey | null {
    const md = ukMonthDay(now)
    for (const w of AUTO_WINDOWS) {
        if (w.ranges.some(([from, to]) => md >= from && md <= to)) return w.key
    }
    return null
}

export function resolveSeason(mode: HomeThemeMode, now: Date = new Date()): SeasonKey | null {
    if (mode === 'off') return null
    if (mode === 'auto') return seasonForDate(now)
    return mode
}
