"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface GooeyTextProps {
    texts: string[];
    morphTime?: number;
    cooldownTime?: number;
    className?: string;
    textClassName?: string;
    highlightWord?: string;
    highlightClassName?: string;
}

function setSpanText(
    el: HTMLSpanElement,
    text: string,
    highlightWord?: string,
    highlightClassName?: string
) {
    el.textContent = "";
    if (!highlightWord || !text.includes(highlightWord)) {
        el.textContent = text;
        return;
    }
    const idx = text.indexOf(highlightWord);
    if (idx > 0) el.appendChild(document.createTextNode(text.slice(0, idx)));
    const span = document.createElement("span");
    if (highlightClassName) span.className = highlightClassName;
    span.textContent = highlightWord;
    el.appendChild(span);
    const rest = text.slice(idx + highlightWord.length);
    if (rest) el.appendChild(document.createTextNode(rest));
}

export function GooeyText({
    texts,
    morphTime = 1,
    cooldownTime = 0.25,
    className,
    textClassName,
    highlightWord,
    highlightClassName
}: GooeyTextProps) {
    const text1Ref = React.useRef<HTMLSpanElement>(null);
    const text2Ref = React.useRef<HTMLSpanElement>(null);
    // useId() output contains colons, which are awkward inside url(#...), so strip them.
    const filterId = `gooey-threshold-${React.useId().replace(/:/g, "")}`;

    React.useEffect(() => {
        // The very first doCooldown() pass (before any increment) fully displays
        // text2, so text2 must start as texts[0] — not texts[1] — or texts[0] is
        // skipped entirely. text1 starts as the last item (invisible at opacity
        // 0% until the first increment swaps it in as texts[0]'s permanent home).
        if (text1Ref.current && text2Ref.current) {
            setSpanText(text1Ref.current, texts[texts.length - 1], highlightWord, highlightClassName);
            setSpanText(text2Ref.current, texts[0], highlightWord, highlightClassName);
        }

        // Start at -1 so the first increment (textIndex + 1) lands on 0,
        // reassigning text1 = texts[0] (content-identical to what text2 was
        // already showing — no visual jump) and text2 = texts[1].
        let textIndex = -1;
        let time = new Date();
        let morph = 0;
        let cooldown = cooldownTime;

        const setMorph = (fraction: number) => {
            if (text1Ref.current && text2Ref.current) {
                text2Ref.current.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
                text2Ref.current.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

                fraction = 1 - fraction;
                text1Ref.current.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
                text1Ref.current.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;
            }
        };

        const doCooldown = () => {
            morph = 0;
            if (text1Ref.current && text2Ref.current) {
                text2Ref.current.style.filter = "";
                text2Ref.current.style.opacity = "100%";
                text1Ref.current.style.filter = "";
                text1Ref.current.style.opacity = "0%";
            }
        };

        const doMorph = () => {
            morph -= cooldown;
            cooldown = 0;
            let fraction = morph / morphTime;

            if (fraction > 1) {
                cooldown = cooldownTime;
                fraction = 1;
            }

            setMorph(fraction);
        };

        let animationFrameId: number;

        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            const newTime = new Date();
            const shouldIncrementIndex = cooldown > 0;
            const dt = (newTime.getTime() - time.getTime()) / 1000;
            time = newTime;

            cooldown -= dt;

            if (cooldown <= 0) {
                if (shouldIncrementIndex) {
                    textIndex = (textIndex + 1) % texts.length;
                    if (text1Ref.current && text2Ref.current) {
                        setSpanText(text1Ref.current, texts[textIndex % texts.length], highlightWord, highlightClassName);
                        setSpanText(text2Ref.current, texts[(textIndex + 1) % texts.length], highlightWord, highlightClassName);
                    }
                }
                doMorph();
            } else {
                doCooldown();
            }
        }

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [texts, morphTime, cooldownTime, highlightWord, highlightClassName]);

    return (
        <div className={cn("relative", className)}>
            <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
                <defs>
                    <filter id={filterId}>
                        <feColorMatrix
                            in="SourceGraphic"
                            type="matrix"
                            values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
                        />
                    </filter>
                </defs>
            </svg>

            <div
                className="flex items-center justify-start"
                style={{ filter: `url(#${filterId})` }}
            >
                <span
                    ref={text1Ref}
                    className={cn(
                        "absolute flex justify-center select-none text-left",
                        textClassName
                    )}
                    style={{
                        letterSpacing: "-0.02em",
                        fontWeight: 600,
                        lineHeight: 1
                    }}
                />
                <span
                    ref={text2Ref}
                    className={cn(
                        "absolute flex justify-center select-none text-left",
                        textClassName
                    )}
                    style={{
                        letterSpacing: "-0.02em",
                        fontWeight: 600,
                        lineHeight: 1
                    }}
                />
            </div>
        </div>
    );
}