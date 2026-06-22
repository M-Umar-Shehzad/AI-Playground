import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Camera, Zap, FileText } from 'lucide-react-native';

export default function ScannerTab() {
    return (
        <View className="flex-1 bg-background">
            {/* Header */}
            <View className="px-6 pt-16 pb-6 border-b border-border">
                <View className="flex-row items-center gap-3 mb-1">
                    <View className="h-3 w-3 rounded-full bg-foreground" />
                    <Text className="text-xl font-medium tracking-tighter text-foreground">Scanner</Text>
                </View>
                <Text className="text-sm text-muted font-light tracking-tight">AI Receipt Intelligence</Text>
            </View>

            {/* Content */}
            <View className="flex-1 items-center justify-center px-8">
                <View className="w-32 h-32 rounded-full border-2 border-border items-center justify-center mb-8 bg-surface">
                    <Camera color="#A1A1AA" size={48} />
                </View>

                <Text className="text-foreground text-xl font-medium tracking-tight text-center mb-3">
                    Receipt Scanner
                </Text>
                <Text className="text-muted text-sm text-center font-light leading-6 mb-10">
                    Photograph any receipt and Flux will automatically extract and log the transaction using AI.
                </Text>

                {/* Feature list */}
                <View className="w-full gap-4 mb-10">
                    <View className="flex-row items-center gap-4 bg-surface border border-border rounded-2xl px-5 py-4">
                        <Zap color="#a5b4fc" size={18} />
                        <View className="flex-1">
                            <Text className="text-sm font-medium text-foreground">Instant Extraction</Text>
                            <Text className="text-xs text-muted mt-0.5">Amount, merchant & category detected automatically</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-4 bg-surface border border-border rounded-2xl px-5 py-4">
                        <FileText color="#34D399" size={18} />
                        <View className="flex-1">
                            <Text className="text-sm font-medium text-foreground">Multi-Currency</Text>
                            <Text className="text-xs text-muted mt-0.5">Converts foreign receipts to your native currency</Text>
                        </View>
                    </View>
                </View>

                <View className="bg-surface border border-border rounded-2xl px-6 py-3">
                    <Text className="text-[10px] uppercase tracking-widest font-semibold text-muted text-center">Coming in Flux+ · Next Update</Text>
                </View>
            </View>
        </View>
    );
}
