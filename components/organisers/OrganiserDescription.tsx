'use client';

import { useEffect, useRef, useState } from 'react';

interface OrganiserDescriptionProps {
    description: string | null;
}

export default function OrganiserDescription({ description }: OrganiserDescriptionProps) {
    const descriptionRef = useRef<HTMLParagraphElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        const element = descriptionRef.current;

        if (!element || isExpanded) return;

        const checkOverflow = () => {
            setIsOverflowing(element.scrollHeight > element.clientHeight + 1);
        };

        checkOverflow();

        const resizeObserver = new ResizeObserver(checkOverflow);
        resizeObserver.observe(element);

        return () => resizeObserver.disconnect();
    }, [description, isExpanded]);

    return (
        <div className="md:mx-0" style={{ maxWidth: "full" }}>
            <p
                ref={descriptionRef}
                className={
                    isExpanded
                        ? 'whitespace-pre-line'
                        : 'line-clamp-3 whitespace-pre-line md:line-clamp-2'
                }
                style={{
                    fontSize: 14,
                    color: '#333344',
                    lineHeight: 1.7,
                }}
            >
                {description}
            </p>

            {(isOverflowing || isExpanded) && (
                <button
                    type="button"
                    onClick={() => setIsExpanded((current) => !current)}
                    className="mt-1 text-sm font-medium underline"
                    style={{ color: '#333344' }}
                >
                    {isExpanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    );
}