"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

interface MagneticCalendarTriggerProps {
    date: Date;
    onClick: () => void;
    isActive?: boolean;
}

export default function MagneticCalendarTrigger({ date, onClick, isActive }: MagneticCalendarTriggerProps) {
    const ref = useRef<HTMLButtonElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
    const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!ref.current) return;
        const { clientX, clientY } = e;
        const { height, width, left, top } = ref.current.getBoundingClientRect();
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);

        x.set(middleX * 0.4); // Magnetic pull strength
        y.set(middleY * 0.4);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const isToday = () => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const dayNumber = date.getDate();

    return (
        <motion.button
            ref={ref}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ x: mouseXSpring, y: mouseYSpring }}
            className={`
                relative flex flex-col items-center justify-center 
                w-14 h-14 rounded-full transition-colors duration-500
                border backdrop-blur-md shadow-2xl overflow-hidden
                group z-50
                ${isActive || isToday()
                    ? "bg-black/10 border-black/30 text-[var(--foreground)]"
                    : "bg-white/70 border-black/10 text-zinc-400 hover:text-[var(--foreground)]"
                }
            `}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
        >
            {/* Core Glow */}
            <div className={`
                absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none
                ${isActive || isToday() ? "bg-[var(--accent-income)]/40" : "bg-black/20"}
            `} />

            {/* Active Indication Ring */}
            {(isActive || isToday()) && (
                <div className="absolute inset-0 rounded-full border border-[var(--accent-income)]/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] pointer-events-none" />
            )}

            <span className="text-[10px] font-medium uppercase tracking-widest leading-none mb-0.5 opacity-60">
                {date.toLocaleDateString("en-US", { month: "short" })}
            </span>
            <span className="text-xl font-bold tabular-nums leading-none tracking-tighter">
                {dayNumber}
            </span>
        </motion.button>
    );
}
