'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './selling.module.css'
import { Reveal } from './Reveal'
import { tweenValue, gbpFormatter } from './tween'

function useTweenedText(value: number, format: (v: number) => string, duration = 500) {
  const [display, setDisplay] = useState(format(value))
  const prev = useRef(value)

  useEffect(() => {
    const cancel = tweenValue(prev.current, value, (v) => setDisplay(format(v)), duration)
    prev.current = value
    return cancel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return display
}

export default function CalculatorSection({ ctaHref }: { ctaHref: string }) {
  const [qty, setQty] = useState(1000)
  const [price, setPrice] = useState(20)

  const baseRevenue = qty * price
  const bonus = baseRevenue * 0.05
  const total = baseRevenue + bonus

  const stdDisplay = useTweenedText(baseRevenue, gbpFormatter.format)
  const totalDisplay = useTweenedText(total, gbpFormatter.format)
  const bonusDisplay = useTweenedText(bonus, (v) => '+' + gbpFormatter.format(v))

  return (
    <section id="calculator" className="py-24 bg-hexlight relative overflow-hidden scroll-mt-28">
      <div className={`${styles.meshBg} opacity-40`}>
        <div className={`${styles.blob} ${styles.blobDriftSlow} w-80 h-80 bg-hexviolet/30 top-10 right-10`} />
      </div>
      <Reveal className="max-w-5xl mx-auto px-6 relative z-10">
        <>
          <div className="mb-12">
            <div className="inline-block border border-hexred text-hexred px-3 py-1 rounded-full font-mono text-xs mb-4">
              REVENUE CALCULATOR
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
              RUN YOUR OWN <span className={styles.gradText}>NUMBERS.</span>
            </h2>
            <p className="text-gray-500 text-lg">
              See how much extra revenue you could earn by selling tickets through{' '}
              <span className="font-bold text-hexred">Hexlura</span>.
            </p>
          </div>

          <div
            className="bg-white rounded-[28px] p-8 relative overflow-hidden shadow-2xl transition-shadow duration-500 hover:shadow-[0_30px_60px_-20px_rgba(234,40,69,0.35)]"
          >
            <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-8">
              <div>
                <p className="font-mono text-xs text-gray-400 mb-1">REVENUE CALCULATOR — ORGANISER COPY</p>
                <h3 className="text-3xl font-black uppercase tracking-tight">YOUR EVENT</h3>
                <p className="font-mono text-xs text-gray-500 mt-1">SERIAL HXL-CALC-01 • LIVE ESTIMATE</p>
              </div>
              <div
                className={`${styles.spinStamp} w-16 h-16 rounded-full border-2 border-dashed border-hexyellow text-hexyellow flex flex-col items-center justify-center`}
              >
                <span className="font-black text-sm leading-none">LIVE</span>
                <span className="font-mono text-[0.6rem]">DATA</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12">

              {/* Input Section */}
              <div className="space-y-6">
                <div>
                  <label htmlFor="calc-qty" className="block font-mono text-xs text-gray-500 mb-2 uppercase tracking-wider">
                    Number of Tickets
                  </label>
                  <div className="flex items-center border-2 border-hexdark rounded-xl overflow-hidden bg-gray-50 focus-within:border-hexred transition-colors duration-300">
                    <span className="p-4 font-mono text-gray-400 border-r-2 border-hexdark bg-white">#</span>
                    <input
                      id="calc-qty"
                      type="number"
                      min={0}
                      value={qty}
                      onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-transparent p-4 font-mono text-xl focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="calc-price" className="block font-mono text-xs text-gray-500 mb-2 uppercase tracking-wider">
                    Ticket Price
                  </label>
                  <div className="flex items-center border-2 border-hexdark rounded-xl overflow-hidden bg-gray-50 focus-within:border-hexred transition-colors duration-300">
                    <span className="p-4 font-mono text-gray-400 border-r-2 border-hexdark bg-white">£</span>
                    <input
                      id="calc-price"
                      type="number"
                      min={0}
                      step={0.01}
                      value={price}
                      onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-transparent p-4 font-mono text-xl focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Output Section */}
              <div
                className={`${styles.glowHover} bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-center gap-5 sm:gap-6 font-mono relative`}
              >
                <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 border-b border-gray-200 pb-3 sm:pb-2">
                  <span className="text-xs sm:text-sm text-gray-500">Standard Revenue</span>
                  <span className={`text-lg sm:text-xl font-bold ${styles.countUp}`}>{stdDisplay}</span>
                </div>
                <div className="flex flex-row justify-between items-center gap-1">
                  <span className="text-xs sm:text-sm text-hexdark font-bold">Total Revenue</span>
                  <span className={`text-2xl md:text-3xl lg:text-4xl font-black text-hexdark leading-tight break-words ${styles.countUp}`}>{totalDisplay}</span>
                </div>
                <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 text-hexred">
                  <span className="text-[0.65rem] sm:text-xs">Extra 5% Bonus Earnings</span>
                  <span className={`text-sm sm:text-base font-bold ${styles.countUp}`}>{bonusDisplay}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center font-mono text-xs text-gray-400">
              <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Transparent pricing. No hidden fees. Built for organizers.
            </div>

            <div className="absolute bottom-0 left-0 w-full h-8 bg-barcode opacity-20" />
          </div>

          <div className="mt-8">
            <Link
              href={ctaHref}
              className={`${styles.btnPrimary} inline-block bg-hexred text-white font-bold py-4 px-8 rounded-full text-center uppercase tracking-wider text-sm shadow-lg`}
            >
              Start selling — free
            </Link>
          </div>
        </>
      </Reveal>
    </section>
  )
}
