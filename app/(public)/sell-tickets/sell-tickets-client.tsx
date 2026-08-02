'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import HeroSection from '@/components/sell-tickets/HeroSection'
import StatsSection from '@/components/sell-tickets/StatsSection'
import PerforatedDivider from '@/components/sell-tickets/PerforatedDivider'
import ComparisonSection from '@/components/sell-tickets/ComparisonSection'
import CalculatorSection from '@/components/sell-tickets/CalculatorSection'
import ProcessSection from '@/components/sell-tickets/ProcessSection'
import FeaturesSection from '@/components/sell-tickets/FeaturesSection'
import TestimonialsSection from '@/components/sell-tickets/TestimonialsSection'
import FAQSection from '@/components/sell-tickets/FAQSection'
import FinalCTASection from '@/components/sell-tickets/FinalCTASection'

// ─── Download Button ──────────────────────────────────────────────────────────
// Preserved from original: all download logic, state, and event handlers are
// 100% unchanged — only the visual wrapper is updated.

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
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 48,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 12,
          textAlign: 'center',
        }}
      >
        Hexlura Event Organiser Guidelines
      </p>

      <button
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={isDownloading ? 'Downloading organiser guide…' : 'Download organiser guide PDF'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 22px',
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 2,
          border: '2px solid var(--text)',
          background: 'transparent',
          color: 'var(--text)',
          cursor: isDownloading ? 'wait' : 'pointer',
          opacity: isDownloading ? 0.7 : 1,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseOver={(e) => {
          if (isDownloading) return
          e.currentTarget.style.transform = 'translate(-2px,-2px)'
          e.currentTarget.style.boxShadow = '4px 4px 0 var(--accent)'
        }}
        onMouseOut={(e) => {
          if (isDownloading) return
          e.currentTarget.style.transform = 'translate(0,0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {isDownloading ? <SpinnerIcon /> : <DownloadIcon />}
        {isDownloading ? 'Downloading…' : 'Download'}
      </button>

      {downloadError && (
        <p
          role="alert"
          style={{
            color: 'var(--accent)',
            fontSize: 14,
            fontWeight: 500,
            marginTop: 12,
            textAlign: 'center',
          }}
        >
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

export default function SellTicketsClient({
  ctaHref,
  bucketName,
  storagePath,
}: {
  ctaHref: string
  bucketName: string
  storagePath: string
}) {
  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <HeroSection ctaHref={ctaHref} />

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <StatsSection />

      {/* ── Perf divider ──────────────────────────────────────────────────── */}
      <PerforatedDivider variant="on-surface" />

      {/* ── Comparison ────────────────────────────────────────────────────── */}
      <ComparisonSection />

      {/* ── Perf divider ──────────────────────────────────────────────────── */}
      <PerforatedDivider variant="on-white" />

      {/* ── Calculator (existing logic fully preserved) ────────────────────── */}
      <CalculatorSection ctaHref={ctaHref} />

      {/* ── Perf divider ──────────────────────────────────────────────────── */}
      <PerforatedDivider variant="on-surface" />

      {/* ── Process / How it works ────────────────────────────────────────── */}
      <ProcessSection />

      {/* Organiser guide download — preserved from original */}
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
          paddingBottom: 88,
        }}
      >
        <OrgGuideDownload bucketName={bucketName} storagePath={storagePath} />
      </div>

      {/* ── Perf divider ──────────────────────────────────────────────────── */}
      <PerforatedDivider variant="on-white" />

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <FeaturesSection />

      {/* ── Perf divider ──────────────────────────────────────────────────── */}
      <PerforatedDivider variant="on-surface" />

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <TestimonialsSection />

      {/* ── Perf divider ──────────────────────────────────────────────────── */}
      <PerforatedDivider variant="on-white" />

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <FAQSection />

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <FinalCTASection ctaHref={ctaHref} />
    </div>
  )
}
