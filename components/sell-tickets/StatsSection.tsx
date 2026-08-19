'use client'

import { useEffect, useState } from 'react'
import styles from './selling.module.css'
import { Reveal, useInView } from './Reveal'
import { tweenValue } from './tween'
import AmbientParticles from './AmbientParticles'

function Counter({
    target,
    prefix = '',
    suffix = '',
}: {
    target: number
    prefix?: string
    suffix?: string
}) {
    const { ref, active } = useInView<HTMLSpanElement>(0.6)
    const [value, setValue] = useState(0)

    useEffect(() => {
        if (!active) return
        const cancel = tweenValue(0, target, setValue, 1200)
        return cancel
    }, [active, target])

    return (
        <span ref={ref} className={styles.countUp}>
            {prefix}
            {Math.round(value)}
            {suffix}
        </span>
    )
}

export default function StatsSection() {
    return (
        <section id="why-hexlura" className="bg-hexdark text-white py-14 relative z-20 border-t-4 border-hexred overflow-hidden scroll-mt-16">
            <div className={`${styles.meshBg} opacity-60`}>
                <div className={`${styles.blob} ${styles.blobDrift} w-96 h-96 bg-hexviolet/40 top-0 left-0`} />
                <div className={`${styles.blob} ${styles.blobDriftSlow} w-96 h-96 bg-hexred/30 bottom-0 right-0`} />
            </div>
            <AmbientParticles density={26} className="opacity-40" />
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" as="div">
                    <>
                        <div>
                            <p className="text-hexyellow text-3xl md:text-4xl font-black mb-1">
                                <Counter target={0} prefix="£" />
                            </p>
                            <p className="font-mono text-xs tracking-widest text-gray-400 uppercase">Monthly Fee</p>
                        </div>
                        <div>
                            <p className="text-hexyellow text-3xl md:text-4xl font-black mb-1">
                                <Counter target={100} suffix="%" />
                            </p>
                            <p className="font-mono text-xs tracking-widest text-gray-400 uppercase">Face Value Yours</p>
                        </div>
                        <div>
                            <p className="text-hexyellow text-3xl md:text-4xl font-black mb-1">
                                <Counter target={2} suffix=" DAYS" />
                            </p>
                            <p className="font-mono text-xs tracking-widest text-gray-400 uppercase">Payout After Event</p>
                        </div>
                        <div>
                            <p className="text-hexyellow text-3xl md:text-4xl font-black mb-1">
                                <Counter target={24} />/7
                            </p>
                            <p className="font-mono text-xs tracking-widest text-gray-400 uppercase">Platform Access</p>
                        </div>
                    </>
                </Reveal>
            </div>
        </section>
    )
}
