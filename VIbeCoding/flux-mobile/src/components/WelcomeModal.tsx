import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { ArrowRight, Wallet, BarChart3 } from "lucide-react-native";

interface WelcomeModalProps {
    isOpen: boolean;
    onNext: () => void;
}

export default function WelcomeModal({ isOpen, onNext }: WelcomeModalProps) {
    return (
        <Modal visible={isOpen} transparent animationType="fade">
            <View className="flex-1 justify-center items-center bg-black/60 px-4">
                <View className="w-full max-w-lg bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl">
                    {/* Header Area */}
                    <View className="relative p-8 pb-6 overflow-hidden">
                        <View className="absolute top-0 right-0 w-64 h-64 bg-zinc-500/10 rounded-full blur-3xl -translate-y-12 translate-x-1/3" />
                        <View className="relative z-10">
                            <Text className="text-2xl font-medium text-foreground tracking-tight mb-4">Initialization</Text>
                            <Text className="text-muted text-base leading-6 tracking-tight font-light pr-4">
                                Welcome to Flux. Your financial command center is ready. Here is how to command your ledger:
                            </Text>
                        </View>
                    </View>

                    {/* Standard Operations / Manual */}
                    <View className="px-8 pb-8 flex-col gap-6">

                        {/* Step 1 */}
                        <View className="flex-row gap-4 items-start pr-4">
                            <View className="p-2 rounded-xl bg-black/5 border border-black/5 mt-1">
                                <Wallet color="#FFFFFF" size={16} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-foreground tracking-tight mb-1">1. Fluid Input</Text>
                                <Text className="text-sm text-muted leading-5 font-light">
                                    Do not fill out forms. Just tell Flux what happened in native language. Example: <Text className="font-medium text-foreground">"I bought 2 coffees for 15 GBP."</Text>
                                </Text>
                            </View>
                        </View>

                        {/* Step 2 */}
                        <View className="flex-row gap-4 items-start pr-4">
                            <View className="p-2 rounded-xl bg-black/5 border border-black/5 mt-1">
                                <BarChart3 color="#FFFFFF" size={16} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-foreground tracking-tight mb-1">2. Absolute Conversion</Text>
                                <Text className="text-sm text-muted leading-5 font-light">
                                    Flux uses real-time exchange rates to instantly convert foreign expenses into your home currency and precise categories.
                                </Text>
                            </View>
                        </View>

                    </View>

                    {/* Footer Action */}
                    <View className="p-6 border-t border-border bg-black/20">
                        <TouchableOpacity
                            onPress={onNext}
                            activeOpacity={0.8}
                            className="w-full flex-row items-center justify-center gap-3 bg-foreground py-4 rounded-xl"
                            style={{ outlineStyle: 'none' } as any}
                        >
                            <Text className="text-surface font-medium text-base">Acknowledge & Proceed</Text>
                            <ArrowRight color="#111111" size={16} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
