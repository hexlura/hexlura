import Link from 'next/link'
import { TM } from '@/components/ui/TM'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <Link href="/">
                        <span className="font-heading text-4xl text-accent tracking-wider">HEXLURA<TM /></span>
                    </Link>
                </div>
                <div className="bg-surface border border-border rounded-none p-8">
                    {children}
                </div>
            </div>
        </div>
    )
}
