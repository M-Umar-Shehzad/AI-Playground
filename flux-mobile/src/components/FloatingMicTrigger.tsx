import React, { useState, useEffect } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import Animated, { FadeInDown, FadeOutDown, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { Mic } from "lucide-react-native";
import { useColorScheme } from "nativewind";

interface FloatingMicTriggerProps {
    onClick: () => void;
    isActive?: boolean;
    isOffline?: boolean;
}

export default function FloatingMicTrigger({ onClick, isActive, isOffline }: FloatingMicTriggerProps) {
    const { colorScheme } = useColorScheme();
    const [showToast, setShowToast] = useState(false);

    const handlePress = () => {
        if (isOffline) {
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } else {
            onClick();
        }
    };

    return (
        <View style={{ zIndex: 9999, elevation: 100 }}>
            {showToast && (
                <Animated.View
                    entering={SlideInDown.springify().damping(15)}
                    exiting={SlideOutDown.duration(200)}
                    style={{ position: 'absolute', bottom: 80, right: 0, width: 280 }}
                    className="bg-surface border border-border/50 rounded-2xl p-4 shadow-2xl items-center"
                >
                    <Text className="text-foreground text-sm font-medium text-center leading-tight">
                        Offline Mode Active: Please connect to the internet to use voice features.
                    </Text>
                </Animated.View>
            )}

            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.8}
                className={`flex-col items-center justify-center w-14 h-14 rounded-full transition-colors border shadow-xl ${isOffline ? "bg-surface/80 border-border/50 opacity-60" :
                        "bg-foreground border-transparent"
                    } ${isActive ? "border-accent-income" : ""}`}
            >
                <Mic color={isOffline ? "#A1A1AA" : (colorScheme === 'dark' ? '#111111' : '#FFFFFF')} size={26} strokeWidth={2.5} />
            </TouchableOpacity>
        </View>
    );
}
