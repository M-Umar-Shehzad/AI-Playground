"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Search, CheckCircle2, X } from "lucide-react";

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
    currentCurrency?: string;
    requireSave?: boolean;
}

export default function CountrySelectModal({ isOpen, onSelect, currentCurrency, requireSave = false }: CountrySelectModalProps) {
    const [search, setSearch] = useState("");

    const filtered = COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.currency.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/70 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-[var(--surface)] border border-black/10 rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 border-b border-black/5 bg-black/[0.02]">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-full bg-black/5 border border-black/10">
                                    <Globe className="w-4 h-4 text-[var(--foreground)]" />
                                </div>
                                <h3 className="text-lg font-medium text-[var(--foreground)] tracking-tight">Select Region</h3>
                            </div>
                            <button onClick={() => onSelect(null as any)} className="absolute top-6 right-6 text-zinc-500 hover:text-[var(--foreground)] transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <p className="text-sm text-[var(--muted)] font-light">
                                Set your local operating currency and timezone.
                            </p>
                        </div>

                        <div className="p-4 border-b border-black/5">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search country or currency..."
                                    className="w-full bg-black/5 border border-black/10 rounded-xl py-3 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-zinc-400 focus:outline-none focus:border-black/30 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                            {filtered.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500 text-sm">
                                    No regions found.
                                </div>
                            ) : (
                                filtered.map((c) => {
                                    const isSelected = currentCurrency === c.currency;
                                    return (
                                        <button
                                            key={c.code}
                                            onClick={() => onSelect(c)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors mb-1
                                                ${isSelected ? "bg-black/10 text-[var(--foreground)]" : "hover:bg-black/5 text-zinc-700"}
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl inline-block w-8 text-center">{getFlagEmoji(c.code)}</span>
                                                <div className="text-left flex flex-col pt-0.5">
                                                    <span className="text-sm font-medium tracking-tight mb-0.5 leading-none">{c.name}</span>
                                                    <span className="text-[10px] text-[var(--muted)] uppercase tracking-widest leading-none">{c.currency}</span>
                                                </div>
                                            </div>
                                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--accent-income)]" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {requireSave && (
                            <div className="p-4 border-t border-black/5 bg-white/40 text-center">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-medium">Action Required</p>
                                <p className="text-xs text-zinc-400 font-light max-w-[250px] mx-auto text-balance">
                                    You must select a region to initialize your financial command center.
                                </p>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// Convert ISO code to flag emoji
function getFlagEmoji(countryCode: string) {
    if (countryCode === 'EU') return '🇪🇺';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
