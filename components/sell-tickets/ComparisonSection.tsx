import styles from './selling.module.css'
import { Reveal } from './Reveal'

const rows = [
    { label: 'Booking / service fee', typical: '5-12% per ticket', hexlura: '£0' },
    { label: 'Monthly or listing fee', typical: '£20-£99 / month', hexlura: '£0' },
    { label: 'Payout delay', typical: '7-30 days', hexlura: '2 days' },
    { label: 'Attendee data access', typical: 'Paid tier only', hexlura: 'Always included' },
]

export default function ComparisonSection() {
    return (
        <section className="py-24 bg-white relative">
            <Reveal className="max-w-5xl mx-auto px-6">
                <>
                    <div className="mb-12">
                        <div className="inline-block border border-hexred text-hexred px-3 py-1 rounded-full font-mono text-xs mb-4">
                            THE REAL COST
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
                            SEE WHAT YOU&apos;D ACTUALLY <span className={styles.gradText}>KEEP.</span>
                        </h2>
                        <p className="text-gray-500 max-w-2xl text-lg">
                            Most platforms quote a small booking fee and let the deductions pile up elsewhere —
                            payment processing, payout delays, &quot;premium&quot; analytics. Here&apos;s the same £50
                            ticket, laid out honestly.
                        </p>
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-gray-200 shadow-sm">
                        <table className="w-full text-left border-collapse min-w-[560px]">
                            <thead>
                                <tr className="font-mono text-xs tracking-wider text-gray-400 border-b border-gray-200 bg-gray-50/60">
                                    <th className="p-6 font-normal uppercase">What you&apos;re charged</th>
                                    <th className="p-6 font-normal uppercase border-l border-gray-200">Typical Platform</th>
                                    <th className="p-6 font-bold uppercase border-l border-gray-200 text-hexred bg-hexred/5">Hexlura</th>
                                </tr>
                            </thead>
                            <tbody className="font-medium">
                                {rows.map((row, i) => (
                                    <tr
                                        key={row.label}
                                        className={`${i !== rows.length - 1 ? 'border-b border-gray-200' : ''} hover:bg-gray-50 transition-colors duration-300`}
                                    >
                                        <td className="p-6">{row.label}</td>
                                        <td className="p-6 border-l border-gray-200 text-gray-500">{row.typical}</td>
                                        <td
                                            className={`p-6 border-l border-gray-200 text-hexred font-bold bg-hexred/5 ${i === rows.length - 1 ? 'rounded-br-3xl' : ''}`}
                                        >
                                            {row.hexlura}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            </Reveal>
        </section>
    )
}
