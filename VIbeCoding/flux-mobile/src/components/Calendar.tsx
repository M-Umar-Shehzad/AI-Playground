import React, { useState, useMemo, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react-native";

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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Calendar({ selectedDate, onDateSelect, transactionDates }: CalendarProps) {
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const [viewDate, setViewDate] = useState(() => new Date(selectedDate));
    // View modes: 'calendar' | 'month' | 'year'
    const [viewMode, setViewMode] = useState<'calendar' | 'month' | 'year'>('calendar');

    // Year generation (e.g., 2015 to 2035)
    const years = useMemo(() => {
        const currentYear = today.getFullYear();
        return Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
    }, [today]);

    const scrollViewRef = useRef<ScrollView>(null);

    // Auto-scroll to selected year when year view opens
    useEffect(() => {
        if (viewMode === 'year' && scrollViewRef.current) {
            const index = years.indexOf(viewDate.getFullYear());
            if (index !== -1) {
                // Approximate item height is ~48px. 
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({
                        y: Math.max(0, index * 48 - 100),
                        animated: false
                    });
                }, 50);
            }
        }
    }, [viewMode, viewDate.getFullYear(), years]);

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

    const handleMonthSelect = (monthIndex: number) => {
        setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1));
        setViewMode('calendar');
    };

    const handleYearSelect = (year: number) => {
        setViewDate(new Date(year, viewDate.getMonth(), 1));
        setViewMode('calendar');
    };

    return (
        <View className="flex-col gap-6 w-full min-h-[320px]">
            {/* Header */}
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                        onPress={() => setViewMode(viewMode === 'month' ? 'calendar' : 'month')}
                        className="flex-row items-center gap-1 bg-black/5 px-2 py-1 rounded-md"
                    >
                        <Text className="text-sm font-medium tracking-widest uppercase text-foreground">
                            {MONTHS_SHORT[viewDate.getMonth()]}
                        </Text>
                        <ChevronDown color="#A1A1AA" size={12} style={{ transform: [{ rotate: viewMode === 'month' ? '180deg' : '0deg' }] }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setViewMode(viewMode === 'year' ? 'calendar' : 'year')}
                        className="flex-row items-center gap-1 bg-black/5 px-2 py-1 rounded-md"
                    >
                        <Text className="text-sm font-medium tracking-widest uppercase text-muted">
                            {viewDate.getFullYear()}
                        </Text>
                        <ChevronDown color="#A1A1AA" size={12} style={{ transform: [{ rotate: viewMode === 'year' ? '180deg' : '0deg' }] }} />
                    </TouchableOpacity>
                </View>

                {viewMode === 'calendar' && (
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity onPress={handlePrevMonth} className="p-1.5 rounded bg-black/5 flex-row items-center justify-center">
                            <ChevronLeft color="#A1A1AA" size={16} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleNextMonth} className="p-1.5 rounded bg-black/5 flex-row items-center justify-center">
                            <ChevronRight color="#A1A1AA" size={16} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Content Area */}
            <View className="flex-1">
                {viewMode === 'month' && (
                    <View className="flex-row flex-wrap justify-between gap-y-4 mt-2">
                        {MONTHS_SHORT.map((month, index) => {
                            const isCurrent = index === viewDate.getMonth();
                            return (
                                <TouchableOpacity
                                    key={month}
                                    onPress={() => handleMonthSelect(index)}
                                    className={`w-[30%] py-4 rounded-2xl items-center justify-center border ${isCurrent ? 'bg-foreground border-foreground' : 'bg-transparent border-border'
                                        }`}
                                >
                                    <Text className={`text-sm font-medium tracking-widest uppercase ${isCurrent ? 'text-surface' : 'text-muted'
                                        }`}>
                                        {month}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {viewMode === 'year' && (
                    <ScrollView
                        ref={scrollViewRef}
                        className="h-[280px]"
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="flex-row flex-wrap justify-between gap-y-3 pb-8">
                            {years.map((year) => {
                                const isCurrent = year === viewDate.getFullYear();
                                return (
                                    <TouchableOpacity
                                        key={year}
                                        onPress={() => handleYearSelect(year)}
                                        className={`w-[30%] py-3 rounded-2xl items-center justify-center border ${isCurrent ? 'bg-foreground border-foreground' : 'bg-transparent border-border'
                                            }`}
                                    >
                                        <Text className={`text-sm font-medium tracking-widest ${isCurrent ? 'text-surface' : 'text-muted'
                                            }`}>
                                            {year}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                )}

                {viewMode === 'calendar' && (
                    <View className="flex-col gap-2">
                        {/* Day Labels */}
                        <View className="flex-row items-center justify-between mb-2 border-b border-border pb-3">
                            {WEEKDAYS.map((day) => (
                                <View key={day} className="flex-1 items-center">
                                    <Text className="text-[9px] uppercase tracking-widest font-medium text-zinc-400">
                                        {day}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Days Setup for FlatList equivalent via row wrapping */}
                        <View className="flex-row flex-wrap">
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                <View key={`empty-${i}`} className="w-[14.28%] aspect-square p-1" />
                            ))}

                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const dayNum = i + 1;
                                const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum);
                                const isCurrentToday = isSameDay(date, today);
                                const isSelected = isSameDay(date, selectedDate);
                                const hasTransactions = transactionDates.has(toDateKey(date));

                                return (
                                    <TouchableOpacity
                                        key={dayNum}
                                        onPress={() => onDateSelect(date)}
                                        className="w-[14.28%] aspect-square p-1"
                                    >
                                        <View className={`flex-1 items-center justify-center rounded-xl relative ${isSelected ? 'bg-foreground' : 'bg-transparent'
                                            }`}>
                                            <Text className={`tabular-nums flex items-center justify-center ${isSelected ? 'text-surface font-medium text-base' :
                                                    (isCurrentToday ? 'text-foreground font-medium text-base' : 'text-muted font-light text-base')
                                                }`}>
                                                {dayNum}
                                            </Text>

                                            {/* Transaction dots */}
                                            {hasTransactions && (
                                                <View className="absolute bottom-1 right-1 flex gap-0.5">
                                                    <View className={`w-1 h-1 rounded-full ${isSelected ? "bg-zinc-800" : "bg-muted"}`} />
                                                </View>
                                            )}

                                            {/* Today indicator */}
                                            {isCurrentToday && !isSelected && (
                                                <View className="absolute top-1 right-1 w-1 h-1 rounded-full bg-foreground shadow-sm" />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}
