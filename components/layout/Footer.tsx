export function Footer() {
    return (
        <footer className="border-t border-border bg-surface mt-16">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-muted text-sm flex gap-2 items-center">
                        <span className="font-heading text-lg text-accent tracking-wider">HEXLURA</span>
                        © {new Date().getFullYear()}
                    </p>
                    <div className="flex gap-4">
                        <a href="#" className="text-sm text-muted hover:text-text transition">Terms</a>
                        <a href="#" className="text-sm text-muted hover:text-text transition">Privacy</a>
                        <a href="#" className="text-sm text-muted hover:text-text transition">Contact</a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
