import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { X, BookOpen, Check } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { saveDailyNote, loadDailyNote } from "../utils/dailyNotesSync";

interface DailyNotesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    isReadOnly: boolean;
    userId?: string;
}

export default function DailyNotesPanel({ isOpen, onClose, date, isReadOnly, userId }: DailyNotesPanelProps) {
    const [note, setNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const { colorScheme } = useColorScheme();
    const insets = useSafeAreaInsets();

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    useEffect(() => {
        if (isOpen) {
            loadNote();
            setIsSaved(false);
        }
    }, [isOpen, dateStr]);

    const loadNote = async () => {
        try {
            const savedNote = await loadDailyNote(dateStr, userId);
            setNote(savedNote || "");
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async () => {
        if (isReadOnly) return;
        setIsSaving(true);
        try {
            await saveDailyNote(dateStr, note, userId);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const formattedDate = date.toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' });

    if (!isOpen) return null;

    return (
        <View className="absolute inset-0" style={{ ...StyleSheet.absoluteFillObject, zIndex: 999, elevation: 10 }} pointerEvents="box-none">
            {/* Premium Gesture Dismissal Backdrop */}
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                className="absolute inset-0 bg-black/60"
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1 justify-end"
                pointerEvents="box-none"
            >
                <Animated.View
                    entering={SlideInDown.springify().damping(18).stiffness(150)}
                    exiting={SlideOutDown}
                    className="border-t border-border rounded-t-[32px] pt-4 pb-6 shadow-2xl h-[70%]"
                    style={{ backgroundColor: colorScheme === 'dark' ? '#0A0A0A' : '#FAFAFA' }}
                >
                    {/* Minimalist Drag Handle */}
                    <View className="items-center mb-6">
                        <View className="w-12 h-1.5 bg-border rounded-full" />
                    </View>

                    <View className="px-6 flex-1">
                        <View className="flex-row items-center justify-between mb-6">
                            <View>
                                <View className="flex-row items-center gap-2 mb-1.5">
                                    <BookOpen color="#A1A1AA" size={14} strokeWidth={2.5} />
                                    <Text className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold">Notes</Text>
                                </View>
                                <Text className="text-2xl font-medium tracking-tight text-foreground">{formattedDate}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} className="w-10 h-10 bg-foreground rounded-full items-center justify-center shadow-md">
                                <X color={colorScheme === 'dark' ? '#111111' : '#FFFFFF'} size={18} strokeWidth={2.5} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                            {isReadOnly && !note ? (
                                <View className="py-12 items-center justify-center">
                                    <View className="w-16 h-16 rounded-full bg-black/5 border border-border items-center justify-center mb-4">
                                        <BookOpen color="#A1A1AA" size={24} opacity={0.4} />
                                    </View>
                                    <Text className="text-muted text-center font-medium text-base tracking-tight">No contextual notes recorded.</Text>
                                    <Text className="text-muted/60 text-center text-xs mt-2 tracking-wide font-light">Historical entries are immutable.</Text>
                                </View>
                            ) : (
                                <TextInput
                                    value={note}
                                    onChangeText={setNote}
                                    multiline
                                    editable={!isReadOnly}
                                    placeholder="Add notes..."
                                    placeholderTextColor="#A1A1AA"
                                    className={`text-base font-light tracking-wide leading-relaxed min-h-[200px] text-foreground ${isReadOnly ? 'opacity-70' : ''}`}
                                    style={{ textAlignVertical: 'top', outlineStyle: 'none' } as any}
                                />
                            )}
                        </ScrollView>

                        {!isReadOnly && (
                            <View
                                className="pt-4 border-t border-border/50 mt-4 flex-row justify-end items-center"
                                style={{ paddingBottom: Math.max(insets.bottom, 16) }}
                            >
                                <TouchableOpacity
                                    onPress={handleSave}
                                    className={`flex-row items-center justify-center px-8 py-3 rounded-xl transition-colors min-w-[120px] ${isSaved ? 'bg-[#10B981]' : 'bg-foreground'
                                        }`}
                                >
                                    {isSaved ? (
                                        <>
                                            <Check color="#FFFFFF" size={16} className="mr-2" />
                                            <Text className="text-[#FFFFFF] text-sm font-medium tracking-wide">Saved</Text>
                                        </>
                                    ) : (
                                        <Text className="text-surface text-sm font-medium tracking-wide">Save</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}
