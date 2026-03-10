import React, { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Globe, Search, CheckCircle2, X } from "lucide-react-native";

export interface CountryOption {
    code: string;
    name: string;
    currency: string;
    timezone: string;
}

export const COUNTRIES: CountryOption[] = [
    { code: "PK", name: "Pakistan", currency: "PKR", timezone: "Asia/Karachi" },
    { code: "US", name: "United States", currency: "USD", timezone: "America/New_York" },
    { code: "IN", name: "India", currency: "INR", timezone: "Asia/Kolkata" },
    { code: "GB", name: "United Kingdom", currency: "GBP", timezone: "Europe/London" },
    { code: "AE", name: "United Arab Emirates", currency: "AED", timezone: "Asia/Dubai" },
    { code: "EU", name: "European Union", currency: "EUR", timezone: "Europe/Berlin" },
    { code: "CA", name: "Canada", currency: "CAD", timezone: "America/Toronto" },
    { code: "AU", name: "Australia", currency: "AUD", timezone: "Australia/Sydney" },
];

interface CountrySelectModalProps {
    isOpen: boolean;
    onSelect: (country: CountryOption) => void;
    onClose?: () => void;
    currentCurrency?: string;
    requireSave?: boolean;
}

export default function CountrySelectModal({ isOpen, onSelect, onClose, currentCurrency, requireSave = false }: CountrySelectModalProps) {
    const [search, setSearch] = useState("");

    const filtered = COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.currency.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Modal visible={isOpen} transparent animationType="slide">
            <View className="flex-1 justify-center items-center bg-black/60 px-4">
                <View className="w-full max-w-md bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl mt-12">
                    <View className="p-6 border-b border-border bg-black/10">
                        <View className="flex-row items-center gap-3 mb-2">
                            <View className="p-2 rounded-full bg-black/5 border border-black/10 text-foreground">
                                <Globe color="#FFFFFF" size={20} />
                            </View>
                            <Text className="text-lg font-medium text-foreground tracking-tight">Select Region</Text>
                        </View>
                        {!requireSave && onClose && (
                            <TouchableOpacity onPress={onClose} className="absolute top-6 right-6" style={{ outlineStyle: 'none' } as any}>
                                <X color="#A1A1AA" size={20} />
                            </TouchableOpacity>
                        )}
                        <Text className="text-sm text-muted font-light mt-1">
                            Set your local operating currency and timezone.
                        </Text>
                    </View>

                    <View className="p-4 border-b border-border bg-black/5">
                        <View className="relative flex-row items-center bg-black/20 border border-border rounded-xl px-4 py-3">
                            <Search color="#A1A1AA" size={16} />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Search country or currency..."
                                placeholderTextColor="#A1A1AA"
                                className="flex-1 ml-3 text-sm text-foreground focus:outline-none transition-colors"
                            />
                        </View>
                    </View>

                    <ScrollView className="max-h-[300px] p-2">
                        {filtered.length === 0 ? (
                            <View className="p-8 items-center">
                                <Text className="text-muted text-sm font-medium">No regions found.</Text>
                            </View>
                        ) : (
                            filtered.map((c) => {
                                const isSelected = !requireSave && currentCurrency === c.currency;
                                return (
                                    <TouchableOpacity
                                        key={c.code}
                                        onPress={() => onSelect(c)}
                                        className={`w-full flex-row items-center justify-between p-4 rounded-xl mb-1 ${isSelected ? 'bg-black/80' : 'bg-transparent'
                                            }`}
                                    >
                                        <View className="flex-row items-center gap-4">
                                            <Text className="text-2xl">{getFlagEmoji(c.code)}</Text>
                                            <View className="flex-col">
                                                <Text className="text-sm font-medium tracking-tight text-foreground">{c.name}</Text>
                                                <Text className="text-[10px] text-muted uppercase tracking-widest leading-none mt-1">{c.currency}</Text>
                                            </View>
                                        </View>
                                        {isSelected && <CheckCircle2 color="#34D399" size={18} />}
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>

                    {requireSave && (
                        <View className="p-4 border-t border-border bg-white/5 text-center items-center">
                            <Text className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-medium">Action Required</Text>
                            <Text className="text-xs text-zinc-400 font-light text-center px-4">
                                You must select a region to initialize your financial command center.
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

function getFlagEmoji(countryCode: string) {
    if (countryCode === 'EU') return '🇪🇺';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
