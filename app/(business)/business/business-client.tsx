'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import styles from '@/components/sell-tickets/selling.module.css'
import SellingNavbar from '@/components/sell-tickets/SellingNavbar'
import HeroSection from '@/components/sell-tickets/HeroSection'
import SellingMarquee from '@/components/sell-tickets/SellingMarquee'
import StatsSection from '@/components/sell-tickets/StatsSection'
import HexluraTableCanvas from '@/components/sell-tickets/HexluraTableCanvas'
import ProductShowcase from '@/components/sell-tickets/ProductShowcase'
import StickyStackCards from '@/components/sell-tickets/StickyStackCards'
import ComparisonSection from '@/components/sell-tickets/ComparisonSection'
import MidBanner from '@/components/sell-tickets/MidBanner'
import CalculatorSection from '@/components/sell-tickets/CalculatorSection'
import ProcessSection from '@/components/sell-tickets/ProcessSection'
import FeaturesSection from '@/components/sell-tickets/FeaturesSection'
import PricingSection from '@/components/sell-tickets/PricingSection'
import FAQSection from '@/components/sell-tickets/FAQSection'
import SellingFooter from '@/components/sell-tickets/SellingFooter'

import TrustedPartners from '@/components/home/TrustedPartners';
import { GooeyText } from '@/components/animations/MorphingText'

type OrderedText = { order: number; text: string }

function toOrderedStrings(items: OrderedText[]): string[] {
  return [...items].sort((a, b) => a.order - b.order).map((t) => t.text)
}

const WELCOME_TEXTS_ORDERED: OrderedText[] = [
  { order: 1, text: 'Hey there!' },
  { order: 2, text: 'Welcome to ' },
  { order: 3, text: 'Hexlura Business' },
  // { order: 4, text: 'List it' },
  // { order: 5, text: 'Sell it' },
  // { order: 6, text: 'Grow it' },
  // { order: 7, text: 'Optimizing your experience...' },
  // { order: 8, text: 'Hang tight!' },
]

const TIP_TEXTS_ORDERED: OrderedText[] = [
  // { order: 1, text: 'Connecting to secure servers...' },
  // { order: 2, text: 'Almost there!' },
  // { order: 3, text: 'Pro-tip: Events with early-bird discounts sell tickets 30% faster.' },
  // { order: 4, text: 'Did you know? Adding a countdown timer on your checkout page can boost urgency and cut cart abandonment by 15%.' },
  // { order: 5, text: 'Pro-tip: QR-based contactless scanning handles up to 600 attendee check-ins per hour per gate.' },
  // { order: 6, text: 'Pro-tip: Selling add-ons like merchandise, parking, or drink vouchers during ticket checkout increases average order value.' },
  // { order: 7, text: 'Preparing your event dashboard...' },
  // { order: 8, text: 'Polishing up the final details...' },
  // { order: 9, text: 'Fetching the latest event trends...' },
  // { order: 10, text: 'Syncing your dashboard...' },
  // { order: 11, text: 'Pro-tip: Organisers keep 100% of their ticket price — our fee is added on top for the buyer.' },
  // { order: 12, text: 'Did you know? You can assign door staff per event, scoped to check-in only.' },
  // { order: 13, text: 'Pro-tip: Promo codes can be scoped per event or platform-wide.' },
  // { order: 14, text: 'Loading your analytics...' },
  // { order: 15, text: 'Did you know? Payouts land via Stripe Connect straight to your bank account.' },
  // { order: 16, text: 'Pro-tip: Waitlists let you capture demand even after an event sells out.' },
  // { order: 17, text: 'Warming up the ticket engine...' },
  // { order: 18, text: 'Did you know? Every ticket gets its own unique QR code, scanned in seconds at the door.' },
  // { order: 19, text: 'Pro-tip: Promoters can run referral links with their own commission rate per event.' },
  // { order: 20, text: 'Fine-tuning your setup...' },
  // { order: 21, text: 'Did you know? You can invite co-organisers and door staff straight from your team page.' },
  // { order: 22, text: 'Pro-tip: Reviews and ratings help build trust with future ticket buyers.' },
  // { order: 23, text: 'Just a moment more...' },
]

const FINAL_WORDS_ORDERED: OrderedText[] = [
  // { order: 1, text: 'Get ready!' },
  { order: 2, text: "Let's go!" },
]

const WELCOME_TEXTS = toOrderedStrings(WELCOME_TEXTS_ORDERED)
const TIP_TEXTS = toOrderedStrings(TIP_TEXTS_ORDERED)
const FINAL_WORDS = toOrderedStrings(FINAL_WORDS_ORDERED)

// Order is strict and deterministic: the `order` field above defines display
// order. The first two tips always show; the rest cycle in that exact order
// (no shuffling) only while the browser is still actually loading (see
// BusinessLoadingScreen's readiness check).
const TOP_TIPS = TIP_TEXTS.slice(0, 2)
const EXTRA_TIPS = TIP_TEXTS.slice(2)

// Short welcome phrases get room to be read; tips are full sentences so they get
// the most reading time; final words morph a little quicker for a snappy handoff.
const WELCOME_MORPH = 0.4
const WELCOME_COOLDOWN = 0.8
const TIP_MORPH = 0.6
const TIP_COOLDOWN = 2.6
const FINAL_MORPH = 0.3
const FINAL_COOLDOWN = 1.0

// GooeyText holds texts[0] for cooldownTime alone (no preceding morph), then
// morphs+holds each subsequent text — so a full pass through `count` texts
// takes cooldownTime*count + morphTime*(count-1), not count*(morph+cooldown).
// Using the naive count*(morph+cooldown) formula leaves one extra morphTime
// of slack, which is exactly enough time for GooeyText's internal loop to
// start morphing back into texts[0] before the phase timer swaps it out.
function phaseDurationMs(count: number, morphTime: number, cooldownTime: number) {
  return (count * cooldownTime + Math.max(count - 1, 0) * morphTime) * 1000
}

const WELCOME_DURATION_MS = phaseDurationMs(WELCOME_TEXTS.length, WELCOME_MORPH, WELCOME_COOLDOWN)
const TOP_TIPS_DURATION_MS = phaseDurationMs(TOP_TIPS.length, TIP_MORPH, TIP_COOLDOWN)
const EXTRA_TIPS_DURATION_MS = phaseDurationMs(EXTRA_TIPS.length, TIP_MORPH, TIP_COOLDOWN)
const FINAL_DURATION_MS = phaseDurationMs(FINAL_WORDS.length, FINAL_MORPH, FINAL_COOLDOWN)

type LoadingPhase = 'welcome' | 'tips-top' | 'tips-extra' | 'final'

function BusinessLoadingScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<LoadingPhase>('welcome')
  const [fadeOut, setFadeOut] = useState(false)
  // EXTRA_TIPS is a fixed, ordered array; GooeyText loops through it
  // internally. extraTipsTick just re-runs the phase-timer effect below to
  // periodically re-check page readiness, without remounting GooeyText.
  const [extraTipsTick, setExtraTipsTick] = useState(0)
  const pageReadyRef = useRef(false)

  // Track real page load state so extra/random tips only appear while the
  // browser is genuinely still loading.
  useEffect(() => {
    if (document.readyState === 'complete') {
      pageReadyRef.current = true
      return
    }
    const onLoad = () => {
      pageReadyRef.current = true
    }
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [pageReadyRef])

  // Advance welcome -> tips-top -> (tips-extra loop while still loading) -> final.
  useEffect(() => {
    if (phase === 'welcome') {
      const t = setTimeout(() => setPhase('tips-top'), WELCOME_DURATION_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'tips-top') {
      const t = setTimeout(() => {
        setPhase(pageReadyRef.current ? 'final' : 'tips-extra')
      }, TOP_TIPS_DURATION_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'tips-extra') {
      const t = setTimeout(() => {
        if (pageReadyRef.current) {
          setPhase('final')
          return
        }
        // Same fixed EXTRA_TIPS order loops again; only re-check readiness.
        setExtraTipsTick((tick) => tick + 1)
      }, EXTRA_TIPS_DURATION_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'final') {
      const t = setTimeout(() => setFadeOut(true), FINAL_DURATION_MS)
      return () => clearTimeout(t)
    }
  }, [phase, extraTipsTick, pageReadyRef])

  useEffect(() => {
    if (!fadeOut) return
    const removeTimer = setTimeout(onDone, 500)
    return () => clearTimeout(removeTimer)
  }, [fadeOut, onDone])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-12 bg-[#f6f5f3] px-6 transition-opacity duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
      style={{ opacity: fadeOut ? 0 : 1, pointerEvents: fadeOut ? 'none' : 'auto' }}
      aria-hidden={fadeOut}
    >
      {/* Single, quiet announcement instead of screen readers re-announcing the
          constantly-mutating GooeyText spans. */}
      <span className="sr-only" role="status" aria-live="polite">
        Loading Hexlura Business…
      </span>

      <div className="flex w-full max-w-3xl items-center justify-center px-4 py-6 min-h-[6rem] md:min-h-[7rem]">
        <AnimatePresence mode="wait">
          {phase === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
              transition={{ duration: 0.6 }}
              className="flex w-full items-center justify-center"
            >
              <GooeyText
                texts={WELCOME_TEXTS}
                morphTime={WELCOME_MORPH}
                cooldownTime={WELCOME_COOLDOWN}
                highlightWord="Hexlura"
                highlightClassName="text-hexred"
                className="h-16 w-full md:h-24"
                textClassName="w-full text-[clamp(1.5rem,6vw,4.5rem)] font-bold tracking-[-0.03em] text-hexdark text-center whitespace-nowrap"
              />
            </motion.div>
          )}

          {phase === 'tips-top' && (
            <motion.div
              key="tips-top"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
              transition={{ duration: 0.6 }}
              className="flex w-full items-center justify-center"
            >
              <GooeyText
                texts={TOP_TIPS}
                morphTime={TIP_MORPH}
                cooldownTime={TIP_COOLDOWN}
                className="h-24 w-full md:h-28"
                textClassName="w-full text-xl md:text-3xl font-bold tracking-[-0.02em] text-hexdark/80 text-center whitespace-normal"
              />
            </motion.div>
          )}

          {phase === 'tips-extra' && (
            <motion.div
              key="tips-extra"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
              transition={{ duration: 0.6 }}
              className="flex w-full items-center justify-center"
            >
              <GooeyText
                texts={EXTRA_TIPS}
                morphTime={TIP_MORPH}
                cooldownTime={TIP_COOLDOWN}
                className="h-24 w-full md:h-28"
                textClassName="w-full text-xl md:text-3xl font-bold tracking-[-0.02em] text-hexdark/80 text-center whitespace-normal"
              />
            </motion.div>
          )}

          {phase === 'final' && (
            <motion.div
              key="final"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
              transition={{ duration: 0.6 }}
              className="flex w-full items-center justify-center"
            >
              <GooeyText
                texts={FINAL_WORDS}
                morphTime={FINAL_MORPH}
                cooldownTime={FINAL_COOLDOWN}
                className="h-16 w-full md:h-24"
                textClassName="w-full text-[clamp(1.5rem,6vw,4.5rem)] font-bold tracking-[-0.03em] text-hexdark text-center whitespace-nowrap"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function OrgGuideDownload({
  bucketName,
  storagePath,
}: {
  bucketName: string
  storagePath: string
}) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsDownloading(true)
    setDownloadError(null)

    try {
      const supabase = createClient()
      const prefix = bucketName + '/'
      const pathInsideBucket = storagePath.startsWith(prefix)
        ? storagePath.substring(prefix.length)
        : storagePath

      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(pathInsideBucket)

      if (error || !data) {
        throw new Error(error?.message || 'File not found')
      }

      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hexlura-organiser-guide.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: unknown) {
      console.error('Download error:', err)
      setDownloadError(
        'The organiser guide is currently unavailable. Please try again later.'
      )
      setTimeout(() => setDownloadError(null), 4000)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div>
      <p className="font-mono text-xs text-gray-400 mb-4 uppercase tracking-widest">
        Hexlura Event Organiser Guidelines
      </p>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={isDownloading ? 'Downloading organiser guide…' : 'Download organiser guide PDF'}
        className={`${styles.btnGhost} inline-flex items-center space-x-2 border-2 border-hexdark rounded-full px-6 py-3 font-bold hover:bg-hexdark hover:text-white transition-colors disabled:opacity-70`}
        style={{ cursor: isDownloading ? 'wait' : 'pointer' }}
      >
        {isDownloading ? <SpinnerIcon /> : <DownloadIcon />}
        <span>{isDownloading ? 'Downloading…' : 'Download'}</span>
      </button>

      {downloadError && (
        <p role="alert" className="text-hexred text-sm font-medium mt-3">
          {downloadError}
        </p>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BusinessClient({
  ctaHref,
  bucketName,
  storagePath,
  partners = [],
}: {
  ctaHref: string
  bucketName: string
  storagePath: string
  partners?: Array<{ name: string; image_url: string }>
}) {
  // This page renders outside the shared (public) layout, so it does not
  // inherit the global MobileBottomNav's reserved bottom padding on <body>.
  useEffect(() => {
    const prev = document.body.style.paddingBottom
    document.body.style.paddingBottom = '0px'
    return () => {
      document.body.style.paddingBottom = prev
    }
  }, [])

  const [showLoading, setShowLoading] = useState(true)

  useEffect(() => {
    if (!showLoading) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [showLoading])

  return (
    <div className="bg-[#f6f5f3] text-hexdark antialiased selection:bg-hexred selection:text-white overflow-x-clip">
      {showLoading && <BusinessLoadingScreen onDone={() => setShowLoading(false)} />}

      {/* <IntroSequence> */}
      <SellingNavbar ctaHref={ctaHref} />

      <HeroSection ctaHref={ctaHref} />

      <SellingMarquee />

      <StatsSection />

      <ProductShowcase />

      <StickyStackCards />

      <ComparisonSection />

      <MidBanner ctaHref={ctaHref} />

      <CalculatorSection ctaHref={ctaHref} />

      <ProcessSection
        downloadSlot={<OrgGuideDownload bucketName={bucketName} storagePath={storagePath} />}
      />

      <FeaturesSection />

      <PricingSection ctaHref={ctaHref} />

      <HexluraTableCanvas />

      <FAQSection />

      <TrustedPartners partners={partners} />

      <SellingFooter ctaHref={ctaHref} />
      {/* </IntroSequence> */}
    </div >
  )
}
