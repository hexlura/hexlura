'use client'

import { useState } from 'react'
import SectionHeader from './SectionHeader'

type FAQItem = { id: string; question: string; answer: string }

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-commission',
    question: 'Do you really take 0% commission?',
    answer:
      'Yes. We don\u2019t add a service fee on top of your ticket price, and we don\u2019t take a cut of your sales. Standard Stripe payment processing still applies, same as any online payment.',
  },
  {
    id: 'faq-payout',
    question: 'When do I get paid?',
    answer:
      'Payouts land in your connected bank account 2 business days after your event ends. You can track everything from your dashboard in real time before then.',
  },
  {
    id: 'faq-fee',
    question: 'Is there a monthly or setup fee?',
    answer:
      'No. Every feature is unlocked from day one, with no subscription and no card required to sign up.',
  },
  {
    id: 'faq-cancel',
    question: 'Can I cancel or pause an event?',
    answer: 'Yes, anytime, directly from your dashboard. There\u2019s no contract locking you in.',
  },
  {
    id: 'faq-refund',
    question: 'What if my attendees need a refund?',
    answer:
      'You control refund policy per event. Issuing one takes a couple of clicks from your order list.',
  },
]

function FAQItemComponent({ item, isOpen, onToggle }: {
  item: FAQItem
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
      style={{
        borderBottom: '1px dashed var(--border)',
      }}
    >
      <button
        id={`${item.id}-btn`}
        aria-expanded={isOpen}
        aria-controls={`${item.id}-panel`}
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '22px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text)',
          textAlign: 'left',
          transition: 'color 0.15s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--accent)')}
        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text)')}
      >
        <span>{item.question}</span>
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 20,
            color: 'var(--accent)',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
            marginLeft: 16,
          }}
        >
          +
        </span>
      </button>

      <div
        id={`${item.id}-panel`}
        role="region"
        aria-labelledby={`${item.id}-btn`}
        hidden={!isOpen}
        style={{
          fontSize: 14.5,
          color: 'var(--muted)',
          lineHeight: 1.6,
          paddingBottom: isOpen ? 22 : 0,
        }}
      >
        {item.answer}
      </div>
    </div>
  )
}

export default function FAQSection() {
  const [openId, setOpenId] = useState<string>(FAQ_ITEMS[0].id)

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? '' : id))

  return (
    <section id="faq" style={{ padding: '88px 0' }}>
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        <SectionHeader
          tag="Answers, no fluff"
          heading={
            <>
              Questions,{' '}
              <span style={{ color: 'var(--accent)' }}>answered plainly.</span>
            </>
          }
        />

        <div>
          {FAQ_ITEMS.map((item) => (
            <FAQItemComponent
              key={item.id}
              item={item}
              isOpen={openId === item.id}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [aria-expanded] span[aria-hidden] {
            transition: none !important;
          }
        }
      `}</style>
    </section>
  )
}
