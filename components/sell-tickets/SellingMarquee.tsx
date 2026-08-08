import styles from './selling.module.css'

const MESSAGE = (
    <span className="flex items-center gap-3 px-6">
        0% commission <span className="w-1 h-1 rounded-full bg-hexred" /> 100% face value{' '}
        <span className="w-1 h-1 rounded-full bg-hexred" /> payouts in 2 days{' '}
        <span className="w-1 h-1 rounded-full bg-hexred" /> no monthly fee <span className="w-1 h-1 rounded-full bg-hexred" />
    </span>
)

export default function SellingMarquee() {
    return (
        <div className="bg-white border-y border-gray-200 py-4 overflow-hidden relative z-20">
            <div className={`${styles.marqueeTrack} font-mono text-xs uppercase tracking-widest text-gray-400`}>
                {MESSAGE}
                {MESSAGE}
                {MESSAGE}
            </div>
        </div>
    )
}
