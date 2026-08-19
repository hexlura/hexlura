'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '@/components/sell-tickets/selling.module.css'
import SellingNavbar from '@/components/sell-tickets/SellingNavbar'
import HeroSection from '@/components/sell-tickets/HeroSection'
import SellingMarquee from '@/components/sell-tickets/SellingMarquee'
import StatsSection from '@/components/sell-tickets/StatsSection'
import SponsorsSection from '@/components/sell-tickets/SponsorsSection'
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

  return (
    <div className="bg-[#f6f5f3] text-hexdark antialiased selection:bg-hexred selection:text-white overflow-x-clip">
      {/* <IntroSequence> */}
      <SellingNavbar ctaHref={ctaHref} />

      <HeroSection ctaHref={ctaHref} />

      <SellingMarquee />

      <StatsSection />

      <ProductShowcase />

      <StickyStackCards />

      <ComparisonSection />

      <SponsorsSection />

      <MidBanner ctaHref={ctaHref} />

      <CalculatorSection ctaHref={ctaHref} />

      <ProcessSection
        downloadSlot={<OrgGuideDownload bucketName={bucketName} storagePath={storagePath} />}
      />

      <FeaturesSection />

      <PricingSection ctaHref={ctaHref} />

      <FAQSection />

      <TrustedPartners partners={partners} />

      <SellingFooter ctaHref={ctaHref} />
      {/* </IntroSequence> */}
    </div >
  )
}
