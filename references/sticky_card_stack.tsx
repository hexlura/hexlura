import React from 'react';

const CalendarSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[8px_8px_0_rgba(0,0,0,1)] transition-transform duration-500 hover:scale-110">
        <path d="M80 20H20C14.477 20 10 24.477 10 30V80C10 85.523 14.477 90 20 90H80C85.523 90 90 85.523 90 80V30C90 24.477 85.523 20 80 20Z" fill="#FFF" stroke="#000" strokeWidth="8" strokeLinejoin="round" />
        <path d="M30 10V30M70 10V30M10 45H90" stroke="#000" strokeWidth="8" strokeLinecap="round" />
        <circle cx="35" cy="65" r="6" fill="#000" />
        <circle cx="50" cy="65" r="6" fill="#000" />
        <circle cx="65" cy="65" r="6" fill="#000" />
    </svg>
);

const TicketSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[8px_8px_0_rgba(0,0,0,1)] transition-transform duration-500 hover:scale-110">
        <path d="M20 20 H80 A10 10 0 0 1 90 30 V40 A10 10 0 0 0 90 60 V70 A10 10 0 0 1 80 80 H20 A10 10 0 0 1 10 70 V60 A10 10 0 0 0 10 40 V30 A10 10 0 0 1 20 20 Z" fill="#FFF" stroke="#000" strokeWidth="8" strokeLinejoin="round" />
        <path d="M70 25 V75" stroke="#000" strokeWidth="6" strokeDasharray="8 8" strokeLinecap="round" />
        <circle cx="40" cy="50" r="8" fill="#000" />
    </svg>
);

const LockSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[8px_8px_0_rgba(0,0,0,1)] transition-transform duration-500 hover:scale-110">
        <rect x="20" y="45" width="60" height="45" rx="8" fill="#FFF" stroke="#000" strokeWidth="8" strokeLinejoin="round" />
        <path d="M30 45 V30 C30 18.954 38.954 10 50 10 C61.046 10 70 18.954 70 30 V45" fill="none" stroke="#000" strokeWidth="8" strokeLinecap="round" />
        <circle cx="50" cy="65" r="6" fill="#000" />
        <path d="M50 65 V75" stroke="#000" strokeWidth="6" strokeLinecap="round" />
    </svg>
);

const ChartSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[8px_8px_0_rgba(0,0,0,1)] transition-transform duration-500 hover:scale-110">
        <path d="M10 90 H90" stroke="#000" strokeWidth="8" strokeLinecap="round" />
        <rect x="20" y="60" width="16" height="30" fill="#FFF" stroke="#000" strokeWidth="8" strokeLinejoin="round" />
        <rect x="45" y="40" width="16" height="50" fill="#FFF" stroke="#000" strokeWidth="8" strokeLinejoin="round" />
        <rect x="70" y="15" width="16" height="75" fill="#FFF" stroke="#000" strokeWidth="8" strokeLinejoin="round" />
        <path d="M30 60 L55 40 L80 15" stroke="#000" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const cards = [
    {
        id: 1,
        title: "Event Creation",
        subtitle: "Host, customize, and launch events effortlessly.",
        bg: "bg-[#FFA6C9]", // Light Pink
        textColor: "text-black",
        icon: CalendarSVG,
        rotation: "-rotate-6",
    },
    {
        id: 2,
        title: "Ticket Management",
        subtitle: "Issue, track, and tier tickets in real time.",
        bg: "bg-[#7BD3EA]", // Light Blue
        textColor: "text-black",
        icon: TicketSVG,
        rotation: "rotate-6",
    },
    {
        id: 3,
        title: "Secure Booking",
        subtitle: "Encrypted, lightning-fast checkout for attendees.",
        bg: "bg-[#E02424]", // Vibrant Red
        textColor: "text-black",
        icon: LockSVG,
        rotation: "-rotate-12",
    },
    {
        id: 4,
        title: "Real-Time Insights",
        subtitle: "Live analytics tracking revenue, sales, and attendance.",
        bg: "bg-[#C4A4F9]", // Soft Purple
        textColor: "text-black",
        icon: ChartSVG,
        rotation: "rotate-12",
    }
];

export default function StackingCards() {
    return (
        <div className="bg-[#0a0a0a] min-h-[300vh] font-sans selection:bg-white selection:text-black">

            {/* Introduction Spacer to allow scrolling to the effect */}
            <header className="h-[80vh] flex flex-col items-center justify-center text-center px-6">
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6">
                    Platform Features
                </h1>
                <p className="text-xl text-gray-400 font-medium max-w-lg">
                    Scroll down to explore the dynamic card stack animation built with pure CSS.
                </p>
                <div className="mt-12 animate-bounce">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </header>

            { }
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative pb-32">
                {cards.map((card, index) => {
                    const IconComponent = card.icon;

                    return (
                        <div
                            key={card.id}
                            className={`
                sticky w-full rounded-[2.5rem] md:rounded-[3rem] 
                p-10 sm:p-12 md:p-16 lg:p-20 
                flex flex-col md:flex-row items-center justify-between 
                shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-transparent
                mb-10 lg:mb-16
                transition-all duration-300 origin-top
                ${card.bg} ${card.textColor}
              `}
                            // Dynamic top spacing creates the exact "stacking" appearance.
                            // Each successive card sticks slightly lower than the previous one.
                            style={{ top: `calc(10vh + ${index * 30}px)` }}
                        >

                            {/* Card Text Content */}
                            <div className="md:w-3/5 space-y-6 md:space-y-8 z-10">
                                <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none">
                                    {card.title}
                                </h2>
                                <p className="text-xl sm:text-2xl md:text-3xl font-medium opacity-90 max-w-xl leading-snug">
                                    {card.subtitle}
                                </p>
                            </div>

                            {/* Card Illustration */}
                            <div className="md:w-2/5 flex justify-center md:justify-end mt-12 md:mt-0 z-10 w-full">
                                <div className={`w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 ${card.rotation}`}>
                                    <IconComponent />
                                </div>
                            </div>

                        </div>
                    );
                })}
            </main>

            { }
            <footer className="h-screen flex items-center justify-center bg-black border-t border-gray-800">
                <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
                    Ready to dive in?
                </h2>
            </footer>

        </div>
    );
}