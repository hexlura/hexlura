"use client";

import Image from "next/image";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PartnerLogo {
  image_url: string;
  name?: string;
}

interface TrustedPartnersProps {
  partners: PartnerLogo[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TrustedPartners({ partners }: TrustedPartnersProps) {
  // Need at least one logo; guard against empty list
  if (!partners || partners.length === 0) return null;

  // Duplicate the list so the marquee loops seamlessly
  const doubled = [...partners, ...partners];

  return (
    <section
      className="trusted-partners-section full-bleed"
      aria-label="Trusted by our Partners"
      style={{
        background: "#FFFFFF",
        position: "relative",
        padding: "80px 0 90px",
        overflow: "hidden",
      }}
    >
      {/* Subtle ambient radial glows */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          // background: 'radial-gradient(ellipse 70% 40% at 20% 50%, rgba(230,57,80,0.04), transparent),' +
          //     'radial-gradient(ellipse 60% 40% at 80% 50%, rgba(251,146,60,0.04), transparent)',
        }}
      />

      {/* ── Header ── */}
      <div
        style={{
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          padding: "0 24px 48px",
        }}
      >
        {/* Pill badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            marginBottom: "20px",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "#0A0A0F",
              background: "rgba(255,255,255,0.80)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(10,10,15,0.10)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {/* Building / business icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="#E63950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="#E63950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Trusted By
          </span>
        </div>

        {/* Main heading */}
        <h2
          style={{
            margin: 0,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            fontSize: "clamp(32px, 5vw, 52px)",
            color: "#0A0A0F",
          }}
        >
          Our{" "}
          <span
            style={{
              background: "#E63950",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Partners
          </span>
        </h2>
      </div>

      {/* ── Marquee wrapper with edge fades ── */}
      <div
        className="marquee-outer"
        style={{
          position: "relative",
          width: "100%",
          overflow: "hidden",
          /* Edge-fade masks */
          maskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        {/* Marquee track — pause on hover via CSS */}
        <div className="marquee-track">
          {doubled.map((partner, i) => (
            <div
              key={i}
              className="partner-logo-item"
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 40px",
              }}
            >
              <Image
                src={partner.image_url}
                alt={
                  partner.name
                    ? `${partner.name} logo`
                    : `Partner logo ${i + 1}`
                }
                width={160}
                height={48}
                style={{
                  width: "auto",
                  maxHeight: "48px",
                  objectFit: "contain",
                  // filter: 'grayscale(100%) opacity(0.55)',
                  transition: "filter 0.3s ease, transform 0.3s ease",
                }}
                className="partner-logo-img"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Inline styles + keyframes ── */}
      <style>{`
                /* Marquee track */
                .marquee-track {
                    display: flex;
                    align-items: center;
                    width: max-content;
                    animation: marquee-scroll 30s linear infinite;
                    will-change: transform;
                    height: 80px;
                }

                /* Pause on hover */
                .marquee-outer:hover .marquee-track {
                    animation-play-state: paused;
                }

                /* Logo hover — scale + full colour */
                .partner-logo-item:hover .partner-logo-img {
                    filter: grayscale(0%) opacity(1) !important;
                    transform: scale(1.05) !important;
                }

                /* Keyframe — scrolls exactly one copy width */
                @keyframes marquee-scroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }

                /* Mobile */
                @media (max-width: 768px) {
                    .trusted-partners-section {
                        padding: 48px 0 56px !important;
                    }
                    .marquee-track {
                        height: 48px !important;
                    }
                    .partner-logo-item {
                        padding: 0 24px !important;
                    }
                    .partner-logo-img {
                        max-height: 28px !important;
                    }
                }

                /* Respect prefers-reduced-motion */
                @media (prefers-reduced-motion: reduce) {
                    .marquee-track {
                        animation: none !important;
                        width: 100% !important;
                        flex-wrap: wrap;
                        justify-content: center;
                        overflow-x: auto;
                        scrollbar-width: none;
                    }
                    .marquee-track::-webkit-scrollbar { display: none; }
                }
            `}</style>
    </section>
  );
}
