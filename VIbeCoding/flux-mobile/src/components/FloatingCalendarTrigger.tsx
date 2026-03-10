import React from "react";
import { TouchableOpacity, Text, View } from "react-native";

interface FloatingCalendarTriggerProps {
    date: Date;
    onClick: () => void;
    isActive?: boolean;
}

export default function FloatingCalendarTrigger({ date, onClick, isActive }: FloatingCalendarTriggerProps) {
    const isToday = () => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const dayNumber = date.getDate();

    return (
        <View style={{ zIndex: 9999, elevation: 100 }}>
            <TouchableOpacity
                onPress={onClick}
                activeOpacity={0.8}
                className={`flex-col items-center justify-center w-14 h-14 rounded-full transition-colors border shadow-xl bg-foreground ${isActive ? "border-accent-income" : "border-transparent"}`}
            >
                <Text className="text-[10px] whitespace-nowrap font-medium uppercase tracking-widest leading-none mb-0.5 text-background opacity-80">
                    {date.toLocaleDateString("en-US", { month: "short" })}
                </Text>
                <Text className="text-xl font-bold tabular-nums leading-none tracking-tighter text-background">
                    {dayNumber}
                </Text>
            </TouchableOpacity>
        </View>
    );
}
