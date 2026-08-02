'use client'

import { useEffect, useRef } from 'react'
import SectionHeader from './SectionHeader'

type Step = {
  num: string
  label: string
  heading: string
  body: string
  glyph: string
  doodlePath: string
  reverse: boolean
}

const STEPS: Step[] = [
  {
    num: '01',
    label: 'STEP 01 · SIGN UP',
    heading: 'Create your account',
    body: 'Sign up free in seconds. No credit card, no waiting on approval.',
    glyph: '◎',
    doodlePath: 'M2 14 Q10 2 18 12 T34 8',
    reverse: false,
  },
  {
    num: '02',
    label: 'STEP 02 · PAYOUTS',
    heading: 'Connect your payouts',
    body: 'Link your bank via Stripe. Secure, and it only takes about two minutes.',
    glyph: '£',
    doodlePath: 'M2 8 Q10 18 18 8 T34 12',
    reverse: true,
  },
  {
    num: '03',
    label: 'STEP 03 · BUILD',
    heading: 'Build your event',
    body: 'Add details, ticket types, prices and a banner. Go live the instant you hit publish.',
    glyph: '▤',
    doodlePath: 'M2 14 Q10 2 18 12 T34 8',
    reverse: false,
  },
  {
    num: '04',
    label: 'STEP 04 · GET PAID',
    heading: 'Get paid in full',
    body: 'We handle the sales and the fans. You receive 100% of face value, 2 days after doors close.',
    glyph: '✓',
    doodlePath: 'M2 8 Q10 18 18 8 T34 12',
    reverse: true,
  },
]

function TrailStep({ step }: { step: Step }) {
  return (
    <div
      className={`st-trail-step${step.reverse ? ' st-trail-step--reverse' : ''}`}
    >
      {/* Visual card */}
      <div
        className="st-trail-visual"
        data-step-visual
      >
        <span className="st-trail-ghost" aria-hidden="true">
          {step.num}
        </span>
        <svg
          className={`st-trail-doodle${step.reverse ? ' st-trail-doodle--reverse' : ''}`}
          viewBox="0 0 40 20"
          fill="none"
          stroke="var(--text)"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d={step.doodlePath} />
        </svg>
        <div className="st-trail-glyph" aria-hidden="true">
          {step.glyph}
        </div>
      </div>

      {/* Content */}
      <div className={`st-trail-content${step.reverse ? ' st-trail-content--reverse' : ''}`}>
        <span
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 13,
            color: 'var(--muted)',
            marginBottom: 8,
            letterSpacing: '0.04em',
          }}
        >
          {step.label}
        </span>
        <h3
          style={{
            fontSize: 'clamp(22px, 2.6vw, 30px)',
            lineHeight: 1.16,
            marginBottom: 14,
            color: 'var(--text)',
            fontFamily: 'var(--font-heading), sans-serif',
            textTransform: 'uppercase',
          }}
        >
          {step.heading}
        </h3>
        <p
          style={{
            fontSize: 15,
            color: 'var(--muted)',
            lineHeight: 1.65,
            maxWidth: 420,
          }}
        >
          {step.body}
        </p>
      </div>
    </div>
  )
}

export default function ProcessSection() {
  const trailRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    function drawTrail() {
      const trail = trailRef.current
      const svg = svgRef.current
      if (!trail || !svg) return

      const cards = Array.from(trail.querySelectorAll('[data-step-visual]'))
      if (cards.length < 2) return

      const trailRect = trail.getBoundingClientRect()
      svg.setAttribute('viewBox', `0 0 ${trailRect.width} ${trailRect.height}`)

      let markup = ''
      for (let i = 0; i < cards.length - 1; i++) {
        const a = cards[i].getBoundingClientRect()
        const b = cards[i + 1].getBoundingClientRect()
        const start = { x: a.left + a.width / 2 - trailRect.left, y: a.bottom - trailRect.top }
        const end = { x: b.left + b.width / 2 - trailRect.left, y: b.top - trailRect.top }
        const midY = (start.y + end.y) / 2
        const d = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`
        const dotColor = i % 2 === 0 ? 'var(--accent)' : 'var(--gold)'
        markup += `<path d="${d}" fill="none" stroke="var(--border)" stroke-width="2.5" stroke-dasharray="2 12" stroke-linecap="round"/>`
        markup += `<circle cx="${start.x}" cy="${start.y}" r="6" fill="${dotColor}"/>`
        markup += `<circle cx="${end.x}" cy="${end.y}" r="6" fill="${dotColor}"/>`
      }
      svg.innerHTML = markup
    }

    drawTrail()
    window.addEventListener('load', drawTrail)
    let resizeTimer: ReturnType<typeof setTimeout>
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(drawTrail, 120)
    }
    window.addEventListener('resize', onResize)
    if (document.fonts?.ready) document.fonts.ready.then(drawTrail)
    const t = setTimeout(drawTrail, 250)

    return () => {
      window.removeEventListener('load', drawTrail)
      window.removeEventListener('resize', onResize)
      clearTimeout(t)
      clearTimeout(resizeTimer)
    }
  }, [])

  return (
    <section id="how-it-works" style={{ padding: '88px 0' }}>
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        <SectionHeader
          tag="Four steps"
          heading={
            <>
              Up and running before{' '}
              <span style={{ color: 'var(--accent)' }}>the kettle boils.</span>
            </>
          }
          subheading="No approval queue. No sales call. Create your account and start selling the same day."
        />

        <div
          ref={trailRef}
          style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}
        >
          <svg
            ref={svgRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 0,
              overflow: 'visible',
            }}
            aria-hidden="true"
          />

          {STEPS.map((step) => (
            <TrailStep key={step.num} step={step} />
          ))}
        </div>
      </div>

      <style>{`
        .st-trail-step {
          display: flex;
          align-items: center;
          gap: 56px;
          position: relative;
          z-index: 2;
          margin-bottom: 110px;
        }
        .st-trail-step:last-child {
          margin-bottom: 0;
        }
        .st-trail-step--reverse {
          flex-direction: row-reverse;
          text-align: right;
        }
        .st-trail-visual {
          flex: 0 0 320px;
          width: 320px;
          height: 230px;
          border: 2px solid var(--text);
          border-radius: 10px;
          background: linear-gradient(135deg, var(--card), var(--surface));
          position: relative;
          overflow: hidden;
          box-shadow: 7px 7px 0 var(--border);
        }
        .st-trail-ghost {
          position: absolute;
          right: -16px;
          bottom: -46px;
          font-family: var(--font-heading), sans-serif;
          font-size: 170px;
          line-height: 1;
          color: transparent;
          -webkit-text-stroke: 2px var(--border);
          z-index: 0;
        }
        .st-trail-glyph {
          position: relative;
          z-index: 1;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 60px;
          color: var(--accent);
        }
        .st-trail-doodle {
          position: absolute;
          top: 12px;
          right: 14px;
          width: 38px;
          z-index: 2;
          opacity: 0.75;
        }
        .st-trail-doodle--reverse {
          right: auto;
          left: 14px;
        }
        .st-trail-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .st-trail-content--reverse {
          align-items: flex-end;
        }
        @media (max-width: 820px) {
          .st-trail-step,
          .st-trail-step--reverse {
            flex-direction: column !important;
            align-items: flex-start !important;
            text-align: left !important;
            gap: 22px;
            margin-bottom: 80px;
          }
          .st-trail-content--reverse {
            align-items: flex-start !important;
          }
          .st-trail-visual {
            width: 100% !important;
            flex: none !important;
          }
          .st-trail-content h3,
          .st-trail-content p {
            max-width: 100% !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .st-trail-step { transition: none !important; }
        }
      `}</style>
    </section>
  )
}
