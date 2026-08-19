'use client'

import Link from 'next/link'
import styles from './selling.module.css'
import HeroTicket from './HeroTicket'
import BackgroundVideo from './BackgroundVideo'
import { Reveal } from './Reveal'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function HeroSection({ ctaHref }: { ctaHref: string }) {
  const handleScrollDown = () => {
    const hero = document.getElementById('hero-section')
    if (hero) {
      window.scrollTo({
        top: hero.offsetTop + hero.offsetHeight,
        behavior: 'smooth',
      })
    } else {
      const nextSection = document.getElementById('why-hexlura')
      if (nextSection) {
        nextSection.scrollIntoView({ behavior: 'smooth' })
      } else {
        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
      }
    }
  }

  return (
    <header
      id="hero-section"
      className="relative min-h-screen flex flex-col justify-between pt-28 pb-6 lg:pt-32 lg:pb-8 overflow-hidden bg-grid-pattern"
    >

      {/* <div className={styles.meshBg}>
        <div className={`${styles.blob} ${styles.blobDrift} w-[32rem] h-[32rem] bg-hexred/30 -top-40 -left-40`} />
        <div className={`${styles.blob} ${styles.blobDriftSlow} w-[28rem] h-[28rem] bg-hexviolet/25 top-10 right-0`} />
        <div className={`${styles.blob} ${styles.blobDrift} w-72 h-72 bg-hexyellow/20 bottom-0 left-1/3`} />
      </div> */}

      {/* BACKGROUND VIDEO */}
      <div>
        <BackgroundVideo
          webmSrc="/assets/videos/hero_card.webm"
          mp4Src="/assets/videos/hero_card.mp4"
          poster="/assets/videos/hero_card-poster.jpg"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      <div className="flex-1 flex items-center max-w-7xl mx-auto px-6 w-full relative z-10 pt-4">
        <Reveal className="w-full grid lg:grid-cols-2 gap-12 items-center" delayMs={0}>
          <div>
            <div className="inline-flex items-center space-x-2 border border-gray-300/70 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1 mb-6">
              <span className="w-2 h-2 rounded-full bg-hexred animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-widest text-gray-500 uppercase">For Event Organisers</span>
            </div>
            <p className='text-sm font-bold uppercase text-hexred mb-2'>GOT AN EVENT COMING UP?</p>
            <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-6">
              LIST IT.
              <br />
              SELL IT. <span className="text-hexred">GROW IT.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-lg leading-relaxed">
              FROM PLANNING TO FINAL CHECK-IN, MANAGE YOUR EVENTS WITH CONFIDENCE.
              Zero monthly fees, zero setup costs, and 100% of your ticket face value stays yours.
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
        </Reveal>
      </div>

      <AnimatePresence>
        <motion.button
          type="button"
          onClick={handleScrollDown}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="relative z-10 mx-auto flex flex-col items-center gap-2 text-hexred hover:text-white transition-colors font-mono cursor-pointer group focus:outline-none pb-2"
          aria-label="Scroll to explore"
        >
          <span className="text-xs tracking-[0.3em] uppercase opacity-80 group-hover:opacity-100 transition-opacity">
            Scroll to Explore
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <ChevronDown size={28} className="drop-shadow-[0_0_8px_rgba(234,40,69,0.8)]" />
          </motion.div>
        </motion.button>
      </AnimatePresence>
    </header>
  )
}
