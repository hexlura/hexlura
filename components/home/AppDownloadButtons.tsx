// Store badges for the homepage. Set the URLs once the apps are live; until then they render as inert links.
const APP_STORE_URL = '';
const PLAY_STORE_URL = '';

const badge = 'inline-flex items-center gap-3 h-14 pl-4 pr-5 rounded-xl bg-black text-white border border-white/25 hover:border-white/60 transition';

export default function AppDownloadButtons() {
    return (
        <section aria-label="Download the app" className="max-w-7xl mx-auto px-6 lg:px-10 mt-14">
            <div className="flex flex-wrap items-center justify-center gap-4">
                <a
                    href={APP_STORE_URL || '#'}
                    aria-label="Download on the App Store"
                    {...(APP_STORE_URL ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={badge}
                >
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                    </svg>
                    <span className="leading-none text-left">
                        <span className="block text-[10px] tracking-wide">Download on the</span>
                        <span className="block text-xl font-semibold mt-1">App Store</span>
                    </span>
                </a>

                <a
                    href={PLAY_STORE_URL || '#'}
                    aria-label="Get it on Google Play"
                    {...(PLAY_STORE_URL ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={badge}
                >
                    <svg viewBox="0 0 20 22" width="26" height="28" aria-hidden="true">
                        <polygon points="1,0 11,11 1,22" fill="#00A0FF" />
                        <polygon points="1,0 15.5,8.86 11,11" fill="#00E676" />
                        <polygon points="15.5,8.86 19,11 15.5,13.14 11,11" fill="#FFD600" />
                        <polygon points="1,22 15.5,13.14 11,11" fill="#FF3D00" />
                    </svg>
                    <span className="leading-none text-left">
                        <span className="block text-[10px] tracking-wide uppercase">Get it on</span>
                        <span className="block text-xl font-semibold mt-1">Google Play</span>
                    </span>
                </a>
            </div>
        </section>
    );
}
