"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Wallet, BarChart3 } from "lucide-react";

interface WelcomeModalProps {
    isOpen: boolean;
    onNext: () => void;
}

export default function WelcomeModal({ isOpen, onNext }: WelcomeModalProps) {
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
                        className="relative w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]"
                    >
                        {/* Header Area with Subtle Glow */}
                        <div className="relative p-8 pb-6 overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 rounded-2xl bg-black/5 border border-black/10">
                                        <Sparkles className="w-5 h-5 text-[var(--foreground)]" />
                                    </div>
                                    <h2 className="text-2xl font-medium text-[var(--foreground)] tracking-tight">Initialization Sequence</h2>
                                </div>
                                <p className="text-[var(--muted)] text-base leading-relaxed tracking-tight max-w-[90%] font-light">
                                    Welcome to Flux. Your financial command center is ready. Here is how to command your ledger:
                                </p>
                            </div>
                        </div>

                        {/* Standard Operations / Manual */}
                        <div className="px-8 pb-8 space-y-6">

                            {/* Step 1 */}
                            <div className="flex gap-4 items-start">
                                <div className="p-2 rounded-xl bg-black/5 border border-black/5 mt-1">
                                    <Wallet className="w-4 h-4 text-[var(--foreground)]" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-[var(--foreground)] tracking-tight mb-1">1. Fluid Input</h4>
                                    <p className="text-sm text-[var(--muted)] leading-relaxed font-light">
                                        Do not fill out forms. Just tell Flux what happened in native language. Example: <span className="font-medium text-[var(--foreground)]">"I bought 2 coffees for 15 GBP."</span>
                                    </p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-4 items-start">
                                <div className="p-2 rounded-xl bg-black/5 border border-black/5 mt-1">
                                    <BarChart3 className="w-4 h-4 text-[var(--foreground)]" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-[var(--foreground)] tracking-tight mb-1">2. Absolute Conversion</h4>
                                    <p className="text-sm text-[var(--muted)] leading-relaxed font-light">
                                        Flux uses real-time exchange rates to instantly convert foreign expenses into your home currency and precise categories.
                                    </p>
                                </div>
                            </div>

                        </div>

                        {/* Footer Action */}
                        <div className="p-6 border-t border-[var(--border)] bg-black/[0.02]">
                            <button
                                onClick={onNext}
                                className="group w-full flex items-center justify-between bg-[var(--foreground)] text-[var(--surface)] px-6 py-4 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                                <span>Acknowledge & Proceed</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
