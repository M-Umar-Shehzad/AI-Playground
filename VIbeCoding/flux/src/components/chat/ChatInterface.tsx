"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Check, Loader2 } from "lucide-react";

import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { CountryOption } from "../CountrySelectModal";

interface ChatInterfaceProps {
    user: User | null;
    userCountry: CountryOption | null;
    onLoginRequest: () => void;
    onTransactionSaved?: () => void;
}

interface TransactionData {
    type: string;
    amount_usd: number;
    platform_fee_usd: number;
    withdrawal_fee_usd: number;
    exchange_rate: number;
    category: string;
    raw_transcript: string;
    [key: string]: any;
}

function extractTransaction(text: string): TransactionData | null {
    const match = text.match(/TRANSACTION_DATA:(\{.*\})/);
    if (match) {
        try {
            return JSON.parse(match[1]);
        } catch {
            return null;
        }
    }
    return null;
}

function cleanMessageText(text: string): string {
    return text.replace(/\n?TRANSACTION_DATA:\{.*\}/, '').trim();
}

export default function ChatInterface({ user, userCountry, onLoginRequest, onTransactionSaved }: ChatInterfaceProps) {
    // Create transport with the current currency baked in.
    // The key prop on this component (in page.tsx) forces remount on currency change,
    // so this transport is recreated with the correct currency each time.
    const transport = useMemo(() => new DefaultChatTransport({
        api: '/api/chat',
        body: {
            country: userCountry?.name || "Pakistan",
            currency: userCountry?.currency || "PKR",
            timezone: userCountry?.timezone || "Asia/Karachi"
        },
    }), [userCountry]);

    const { messages, sendMessage, status, setMessages } = useChat({
        transport,
        initialMessages: [
            {
                id: "1",
                role: "assistant",
                parts: [{ type: "text", text: "SYSTEM ACTIVE. I am Flux — your financial command center. Input transaction or query." }]
            }
        ]
    });

    const [input, setInput] = useState("");
    const [savedTransactions, setSavedTransactions] = useState<Set<string>>(new Set());
    const [savingTransactions, setSavingTransactions] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isLoading = status === "submitted" || status === "streaming";

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const text = input;
        setInput("");

        sendMessage({ text });
    };

    // Auto-save effect
    useEffect(() => {
        if (isLoading) return; // Wait until stream is finished

        const lastMsg = messages[messages.length - 1];
        if (!lastMsg || lastMsg.role !== "assistant") return;
        if (savedTransactions.has(lastMsg.id) || savingTransactions.has(lastMsg.id)) return;

        const rawText = getMessageText(lastMsg);
        const transaction = extractTransaction(rawText);

        if (transaction && user) {
            handleSaveTransaction(lastMsg.id, transaction);
        }
    }, [messages, isLoading, savedTransactions, savingTransactions, user]);

    const handleSaveTransaction = async (msgId: string, transaction: TransactionData) => {
        if (!user) {
            onLoginRequest();
            return;
        }

        setSavingTransactions(prev => new Set(prev).add(msgId));

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                onLoginRequest();
                return;
            }

            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(transaction),
            });

            if (res.ok) {
                setSavedTransactions(prev => new Set(prev).add(msgId));
                onTransactionSaved?.();
            } else {
                const err = await res.json();
                console.warn('Save failed (likely missing DB column):', err);
            }
        } catch (e) {
            console.warn('Save error:', e);
        } finally {
            setSavingTransactions(prev => {
                const next = new Set(prev);
                next.delete(msgId);
                return next;
            });
        }
    };

    const getMessageText = (msg: typeof messages[number]) => {
        return msg.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("");
    };

    return (
        <div className="flex flex-col h-full max-h-full border border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-2xl overflow-hidden shadow-2xl relative rounded-[2rem]">

            {/* Orb Animation Background (Subtle) */}
            <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center overflow-hidden">
                <motion.div
                    animate={{
                        scale: isLoading ? [1, 1.2, 1] : [1, 1.05, 1],
                        opacity: isLoading ? [0.15, 0.3, 0.15] : [0.05, 0.1, 0.05],
                    }}
                    transition={{
                        duration: isLoading ? 2 : 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="w-[120%] h-[120%] rounded-full bg-gradient-radial from-white via-transparent to-transparent blur-3xl absolute -bottom-1/2"
                />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] p-5 z-10">
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-[var(--foreground)] shadow-[0_0_10px_rgba(0,0,0,0.3)] animate-pulse" />
                    <h3 className="text-xs font-medium tracking-widest uppercase text-[var(--foreground)]">Flux AI</h3>
                </div>
                <div className="flex items-center gap-4 text-xs uppercase tracking-widest font-medium text-[var(--muted)]">
                    {isLoading && <span className="text-[var(--foreground)] animate-pulse">Processing...</span>}
                </div>
            </div>

            {/* Messages Window */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8 z-10 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => {
                        const rawText = getMessageText(msg);
                        const displayText = cleanMessageText(rawText);
                        const transaction = msg.role === "assistant" ? extractTransaction(rawText) : null;
                        const isSaved = savedTransactions.has(msg.id);
                        const isSaving = savingTransactions.has(msg.id);

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[90%] px-5 py-4 ${msg.role === "user"
                                        ? "bg-[var(--foreground)] text-[var(--surface)] ml-auto rounded-3xl rounded-tr-md shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
                                        : "bg-transparent text-[var(--foreground)] border-l px-6 border-[var(--border)]"
                                        }`}
                                >

                                    <p className={`text-base leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'font-medium' : 'font-light tracking-wide'}`}>
                                        {displayText}
                                    </p>

                                    {/* Saved confirmation */}
                                    {transaction && isSaved && (
                                        <div className="mt-4 flex items-center gap-2 text-xs tracking-widest font-medium px-4 py-2 border border-[var(--border)] text-[var(--foreground)] uppercase w-max bg-[var(--border)] backdrop-blur-sm">
                                            <Check className="w-3 h-3" /> Updated
                                        </div>
                                    )}

                                    {/* Sign in prompt for non-authed users */}
                                    {!user && msg.role !== "user" && msg.id === messages[messages.length - 1]?.id && !isLoading && transaction && (
                                        <button
                                            onClick={onLoginRequest}
                                            className="mt-5 flex items-center gap-2 text-xs tracking-widest font-medium px-5 py-2.5 border border-[var(--border)] text-[var(--foreground)] uppercase hover:bg-[var(--surface)] transition-colors"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Authenticate to Save
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start pl-6"
                        >
                            <div className="flex items-center gap-1.5 opacity-60">
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-4 bg-[var(--foreground)]" />
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-4 bg-[var(--foreground)]" />
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-4 bg-[var(--foreground)]" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area (Command Prompt Style) */}
            <div className="p-4 border-t border-[var(--border)] z-10">
                <form onSubmit={handleSubmit} className="relative flex items-center bg-transparent border border-[var(--border)] rounded-2xl overflow-hidden focus-within:border-[var(--foreground)]/30 transition-colors shadow-inner">
                    <div className="pl-5 text-[var(--muted)] text-sm font-mono">&gt;</div>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        placeholder={user ? "Type..." : "Ask Flux a question..."}
                        className="w-full bg-transparent py-4 pl-3 pr-14 text-sm font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-0 transition-all disabled:opacity-50 tracking-wide"
                    />
                    <button
                        type="submit"
                        disabled={!input?.trim() || isLoading}
                        className="absolute right-2 p-2.5 rounded-xl bg-[var(--foreground)] text-[var(--surface)] disabled:opacity-30 hover:bg-zinc-200 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
