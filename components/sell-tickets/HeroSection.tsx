import Link from 'next/link'
import styles from './selling.module.css'
import HeroTicket from './HeroTicket'
import { Reveal } from './Reveal'

export default function HeroSection({ ctaHref }: { ctaHref: string }) {
  return (
    <header className="relative pt-40 pb-24 lg:pt-44 lg:pb-32 overflow-hidden bg-grid-pattern">
      <div className={styles.meshBg}>
        <div className={`${styles.blob} ${styles.blobDrift} w-[32rem] h-[32rem] bg-hexred/30 -top-40 -left-40`} />
        <div className={`${styles.blob} ${styles.blobDriftSlow} w-[28rem] h-[28rem] bg-hexviolet/25 top-10 right-0`} />
        <div className={`${styles.blob} ${styles.blobDrift} w-72 h-72 bg-hexyellow/20 bottom-0 left-1/3`} />
      </div>

      <Reveal className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center" delayMs={0}>
        <>
          <div>
            <div className="inline-flex items-center space-x-2 border border-gray-300/70 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1 mb-6">
              <span className="w-2 h-2 rounded-full bg-hexred animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-widest text-gray-500 uppercase">For Event Organisers</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter mb-6">
              SELL TICKETS.
              <br />
              KEEP THE <span className="text-hexred">FACE
                <br />VALUE.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-lg leading-relaxed">
              Zero monthly fees, zero commission, zero fine print. Every pound your fans pay for a
              ticket lands in your account — we just help you sell it.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                href={ctaHref}
                className={`${styles.btnPrimary} bg-hexred text-white font-bold py-4 px-8 rounded-full text-center uppercase tracking-wider text-sm shadow-[0_10px_30px_-8px_rgba(234,40,69,0.55)]`}
              >
                Start selling — free
              </Link>
              <a
                href="#calculator"
                className={`${styles.btnGhost} bg-white text-hexdark font-bold py-4 px-8 rounded-full border-2 border-gray-200 hover:border-hexdark transition-colors text-center uppercase tracking-wider text-sm`}
              >
                See the real numbers
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-hexyellow" />NO SETUP FEE
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-hexyellow" />NO MONTHLY FEE
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-hexyellow" />APPROVED IN MINUTES
              </span>
            </div>
          </div>

          <HeroTicket />
        </>
      </Reveal>
    </header>
  )
}
