"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import React from "react";

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

  const SlideInText = ({
    text = "Our partners powering Hexlura.",
    highlight,
    highlightColor = "#E63950",
    splitWord,
  }: {
    text?: string;
    /** Substring within `text` that should be rendered in `highlightColor` */
    highlight?: string;
    /** Color applied to the `highlight` substring */
    highlightColor?: string;
    /** Split the text by this word */
    splitWord?: string;
  }) => {
    const highlightStart = highlight ? text.indexOf(highlight) : -1;
    const highlightEnd =
      highlightStart >= 0 ? highlightStart + (highlight as string).length : -1;

    const container = {
      hidden: {},
      visible: {
        transition: { staggerChildren: 0.03 },
      },
    };

    const charVariant = {
      hidden: { transform: "translateX(-50px)", opacity: 0 },
      visible: {
        transform: "translateX(0px)",
        opacity: 1,
        transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
      },
    };

    return (
      <motion.h2
        className="text-left font-bold"
        style={{
          fontSize: "clamp(22px, 5.5vw, 90px)",
          lineHeight: 1.08,
          letterSpacing: "-0.03em",
        }}
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.6 }}
      >
        {text.split("").map((char, i) => {
          const isHighlighted =
            highlightStart >= 0 && i >= highlightStart && i < highlightEnd;
          const isSplit =
            splitWord && i > 0 && text.slice(i, i + splitWord.length) === splitWord;

          return (
            <React.Fragment key={i}>
              {isSplit && <br />}
              <motion.span
                variants={charVariant}
                className="inline-block"
                style={isHighlighted ? { color: highlightColor } : undefined}
                whileHover={{ scale: 1.1, color: highlightColor }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            </React.Fragment>
          );
        })}
      </motion.h2>
    );
  };


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
        className="trusted-partners-header"
        style={{
          textAlign: "left",
          position: "relative",
          zIndex: 1,
          padding: "0 24px 48px",
          marginBottom: "60px",
        }}
      >

        {/* Main heading */}
        <div style={{ color: "#0A0A0F", fontFamily: "DM Sans, sans-serif" }}>
          <SlideInText text="Our partners powering Hexlura."
            highlight="Hexlura"
            highlightColor="#E63950"
            splitWord="Hexlura"
          />
        </div>
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
                    .trusted-partners-header {
                        padding: 0 16px 20px !important;
                        margin-bottom: 24px !important;
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
