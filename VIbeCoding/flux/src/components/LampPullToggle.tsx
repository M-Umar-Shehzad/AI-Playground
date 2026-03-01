"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface LampPullToggleProps {
    isDark: boolean;
    onToggle: () => void;
}

const WIRE_HEIGHT = 130;
const TRIGGER_THRESHOLD = 40;
const MAX_PULL = 70;

export default function LampPullToggle({ isDark, onToggle }: LampPullToggleProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isGrabbing, setIsGrabbing] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const hasTriggeredRef = useRef(false);
    const startYRef = useRef(0);
    const bobRef = useRef<HTMLDivElement>(null);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsGrabbing(true);
        hasTriggeredRef.current = false;
        startYRef.current = e.clientY;
        bobRef.current?.setPointerCapture(e.pointerId);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isGrabbing) return;
        e.preventDefault();

        const delta = Math.max(0, Math.min(e.clientY - startYRef.current, MAX_PULL));
        setPullDistance(delta);

        if (delta > TRIGGER_THRESHOLD && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            onToggle();
        }
    }, [isGrabbing, onToggle]);

    const handlePointerUp = useCallback(() => {
        setIsGrabbing(false);
        setPullDistance(0);
    }, []);

    useEffect(() => {
        if (!isGrabbing) return;
        const prevent = (e: Event) => e.preventDefault();
        document.addEventListener('selectstart', prevent);
        return () => document.removeEventListener('selectstart', prevent);
    }, [isGrabbing]);

    const totalWireLen = WIRE_HEIGHT + pullDistance;
    const bobY = totalWireLen + 12; // 12px for chain link

    return (
        <>
            {/* Wire - rendered as a thin div */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 2,
                    height: totalWireLen,
                    background: isDark
                        ? 'linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.3))'
                        : 'linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.2))',
                    borderRadius: 1,
                    transition: isGrabbing ? 'none' : 'height 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                    willChange: 'height',
                    pointerEvents: 'none' as const,
                }}
            />

            {/* Chain link connector */}
            <div
                style={{
                    position: 'absolute',
                    top: totalWireLen,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 12,
                    background: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                    borderRadius: 2,
                    transition: isGrabbing ? 'none' : 'top 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                    willChange: 'top',
                    pointerEvents: 'none' as const,
                }}
            />

            {/* Bob - the interactive pull element */}
            <div
                ref={bobRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                style={{
                    position: 'absolute',
                    top: bobY,
                    left: '50%',
                    transform: `translateX(-50%) scale(${isGrabbing ? 0.9 : isHovering ? 1.15 : 1})`,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    cursor: isGrabbing ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    userSelect: 'none',
                    transition: isGrabbing ? 'none' : 'top 0.4s cubic-bezier(0.22, 1, 0.36, 1), transform 0.15s ease',
                    willChange: 'top, transform',
                    background: isDark
                        ? 'radial-gradient(circle at 40% 30%, #fef3c7, #92400e)'
                        : 'radial-gradient(circle at 40% 30%, #d4d4d8, #3f3f46)',
                    boxShadow: isDark
                        ? '0 0 14px rgba(217,119,6,0.5), 0 2px 6px rgba(0,0,0,0.3)'
                        : '0 0 8px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.15)',
                    border: isDark ? '1.5px solid rgba(251,191,36,0.3)' : '1.5px solid rgba(0,0,0,0.15)',
                    zIndex: 10,
                }}
            />
        </>
    );
}
