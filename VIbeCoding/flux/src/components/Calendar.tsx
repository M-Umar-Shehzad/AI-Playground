"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    transactionDates: Set<string>; // "YYYY-MM-DD" strings
}

function isSameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Calendar({ selectedDate, onDateSelect, transactionDates }: CalendarProps) {
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    // We'll manage the currently viewed month
    const [viewDate, setViewDate] = useState(() => new Date(selectedDate));

    const { daysInMonth, firstDayOfMonth } = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        return { daysInMonth, firstDayOfMonth };
    }, [viewDate]);

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium tracking-widest uppercase text-[var(--foreground)]">
                    {MONTHS_SHORT[viewDate.getMonth()]} <span className="text-[var(--muted)]">{viewDate.getFullYear()}</span>
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-black/5 rounded transition-colors text-[var(--muted)] hover:text-[var(--foreground)]">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-black/5 rounded transition-colors text-[var(--muted)] hover:text-[var(--foreground)]">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] tracking-widest uppercase text-[var(--muted)] ml-3 hidden sm:block">Ledger Date Selection</span>
                </div>
            </div>

            {/* Grid */}
            <div className="flex flex-col gap-2">
                {/* Day Labels */}
                <div className="grid grid-cols-7 gap-1 mb-2 border-b border-black/5 pb-3">
                    {WEEKDAYS.map((day) => (
                        <div key={day} className="text-center text-[9px] uppercase tracking-widest font-medium text-zinc-400">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} className="p-2" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum);
                        const isToday = isSameDay(date, today);
                        const isSelected = isSameDay(date, selectedDate);
                        const hasTransactions = transactionDates.has(toDateKey(date));

                        return (
                            <button
                                key={dayNum}
                                onClick={() => {
                                    onDateSelect(date);
                                }}
                                className={`
                                    relative flex flex-col items-center justify-center p-2 rounded-xl transition-all outline-none aspect-[1/1] group
                                    ${isSelected
                                        ? "bg-[var(--foreground)] text-[var(--surface)] shadow-[0_0_24px_rgba(255,255,255,0.15)] scale-[1.05] z-10"
                                        : "bg-transparent text-[var(--muted)] hover:bg-white/[0.04] hover:text-[var(--foreground)]"
                                    }
                                `}
                            >
                                <span className={`text-sm tabular-nums leading-none ${isSelected ? "font-medium" : (isToday ? "text-[var(--foreground)] font-medium" : "font-light")}`}>
                                    {dayNum}
                                </span>

                                {/* Transaction dots */}
                                {hasTransactions && (
                                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                                        <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-zinc-800" : "bg-black/20 group-hover:bg-white/40"}`} />
                                    </div>
                                )}

                                {/* Today indicator */}
                                {isToday && !isSelected && (
                                    <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-[var(--foreground)] shadow-[0_0_8px_var(--foreground)]" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
