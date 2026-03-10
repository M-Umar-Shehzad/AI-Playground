import React, { useState, useRef, useEffect, useMemo, memo, startTransition } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Send, Sparkles, Check } from "lucide-react-native";
import { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { CountryOption } from "../CountrySelectModal";
import { useColorScheme } from "nativewind";
import { useNetInfo } from "@react-native-community/netinfo";
import { parseOfflineTransactions } from "../../utils/offlineParser";

import { Platform } from "react-native";

// We now hit the internal Expo API Router (port 8081) instead of the old Next.js backend (port 3000).
const API_BASE = Platform.OS === 'web' && typeof window !== 'undefined'
    ? `http://${window.location.hostname}:8081`
    : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081');

interface ChatInterfaceProps {
    user: User | null;
    userCountry: CountryOption | null;
    onLoginRequest: () => void;
    onTransactionSaved?: () => void;
    onGuestTransaction?: (transaction: TransactionData) => void;
    onOfflineTransaction?: (transaction: any) => void;
    externalInputText?: string;
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

function extractTransactions(text: string): TransactionData[] {
    const results: TransactionData[] = [];
    const regex = /TRANSACTION_DATA:(\{.*?\})/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        try {
            const parsed = JSON.parse(match[1]);
            results.push(parsed);
        } catch { /* skip malformed JSON */ }
    }
    return results;
}

function cleanMessageText(text: string): string {
    // 1. Strip all TRANSACTION_DATA blocks
    let cleaned = text.replace(/\n?TRANSACTION_DATA:\{.*?\}/g, '');

    // 2. Strip any lingering markdown formatting that might have wrapped the blocks
    // If the text ends with ``` or starts with ```json and only had blocks inside
    cleaned = cleaned.replace(/```[a-z]*\s*/ig, '');

    return cleaned.trim();
}

const TypewriterText = ({ text, isStreaming, className }: { text: string, isStreaming: boolean, className: string }) => {
    const [displayedText, setDisplayedText] = useState(text);
    const textRef = useRef(text);
    const indexRef = useRef(isStreaming ? 0 : text.length);

    useEffect(() => {
        textRef.current = text;
        if (!isStreaming) {
            setDisplayedText(text);
            indexRef.current = text.length;
        }
    }, [text, isStreaming]);

    useEffect(() => {
        if (!isStreaming) return;

        const interval = setInterval(() => {
            const fullText = textRef.current;
            if (indexRef.current < fullText.length) {
                const diff = fullText.length - indexRef.current;
                // Dynamically speed up if we fall behind, but keep it smooth
                const advance = Math.max(1, Math.ceil(diff / 4));
                indexRef.current += advance;
                setDisplayedText(fullText.substring(0, indexRef.current));
            }
        }, 30); // ~33fps smooth progression

        return () => clearInterval(interval);
    }, [isStreaming]);

    return <Text className={className}>{displayedText}</Text>;
};

// Full 1-to-1 port of web ChatMessageItem with isSaving prop
const ChatMessageItem = memo(({ msg, isSaved, isSaving, user, onLoginRequest, isLoading, isLastMessage }: {
    msg: UIMessage;
    isSaved: boolean;
    isSaving: boolean;
    user: User | null;
    onLoginRequest: () => void;
    isLoading: boolean;
    isLastMessage: boolean;
}) => {
    const rawText = msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text).join("");
    const displayText = cleanMessageText(rawText);
    const transactions = msg.role === "assistant" ? extractTransactions(rawText) : [];
    const hasTransactions = transactions.length > 0;

    return (
        <View className={`flex-row ${msg.role === "user" ? "justify-end" : "justify-start"} mb-6`}>
            <View className={`max-w-[85%] px-5 py-4 ${msg.role === "user"
                ? "bg-foreground ml-auto rounded-3xl rounded-tr-sm shadow-sm"
                : "bg-surface border border-border rounded-3xl rounded-tl-sm shadow-sm"}`}>

                {msg.role === "assistant" ? (
                    <TypewriterText
                        text={displayText}
                        isStreaming={isLoading && isLastMessage}
                        className="text-base text-foreground font-light tracking-wide leading-6"
                    />
                ) : (
                    <Text className="text-base text-surface font-medium leading-6">
                        {displayText}
                    </Text>
                )}

                {/* Show saving spinner while saving */}
                {hasTransactions && isSaving && (
                    <View className="mt-3 flex-row items-center gap-2">
                        <ActivityIndicator size="small" color="#A1A1AA" />
                        <Text className="text-[10px] tracking-widest font-medium text-muted uppercase">Saving...</Text>
                    </View>
                )}

                {hasTransactions && isSaved && (
                    <View className="mt-4 flex-col gap-3 items-start">
                        <View className="flex-row items-center gap-2 px-3 py-1.5 border border-border bg-border rounded-lg">
                            <Check color="#A1A1AA" size={12} />
                            <Text className="text-[10px] tracking-widest font-medium text-foreground uppercase">
                                {transactions.length > 1 ? `${transactions.length} Records Updated` : 'Updated'}
                            </Text>
                        </View>

                        {/* Sign in prompt for guests */}
                        {!user && msg.role !== "user" && isLastMessage && !isLoading && (
                            <TouchableOpacity onPress={onLoginRequest} className="flex-row items-center gap-2 px-4 py-2 border border-border bg-surface rounded-lg mt-2">
                                <Sparkles color="#FFFFFF" size={12} />
                                <Text className="text-[10px] tracking-widest font-medium text-foreground uppercase">Sign in to save to cloud</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}, (prev, next) => {
    // Exact port of web memo comparator
    return prev.msg === next.msg &&
        prev.isSaved === next.isSaved &&
        prev.isSaving === next.isSaving &&
        prev.user === next.user &&
        prev.isLoading === next.isLoading &&
        prev.isLastMessage === next.isLastMessage;
});

export default function ChatInterface({ user, userCountry, onLoginRequest, onTransactionSaved, onGuestTransaction, onOfflineTransaction, externalInputText }: ChatInterfaceProps) {
    const { colorScheme } = useColorScheme();
    const { isConnected } = useNetInfo();
    const isOffline = isConnected === false;

    // Transport recreated when currency changes (key prop in parent handles remount)
    const transport = useMemo(() => new DefaultChatTransport({
        api: `${API_BASE}/api/chat`,
        body: {
            country: userCountry?.name || "Pakistan",
            currency: userCountry?.currency || "PKR",
            timezone: userCountry?.timezone || "Asia/Karachi"
        },
    }), [userCountry]);

    const { messages, setMessages, sendMessage, status } = useChat({
        transport,
        messages: [{
            id: "1",
            role: "assistant",
            parts: [{ type: "text", text: "I am Flux — your financial command center. Input transaction or query." }]
        }] as UIMessage[]
    });

    const [input, setInput] = useState("");
    const [savedTransactions, setSavedTransactions] = useState<Set<string>>(new Set());
    const [savingTransactions, setSavingTransactions] = useState<Set<string>>(new Set());
    const scrollViewRef = useRef<ScrollView>(null);
    const isLoading = status === "submitted" || status === "streaming";

    // Synchronous ref to prevent double-saves from React state batching
    const processedMsgIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Initial load lock or passive scroll when completely finished interacting
        if (scrollViewRef.current && !isLoading) {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }
    }, [messages, isLoading]);

    const handleSubmit = () => {
        if (!input.trim() || isLoading) return;
        const text = input.trim();
        setInput("");

        // 1. Immediately show user's message
        const userMsgId = Date.now().toString();
        setMessages((prev: any) => [...prev, { id: userMsgId, role: "user", parts: [{ type: "text", text }] }]);

        // 2. Network Interception (Phase 19)
        if (isOffline) {
            const parsed = parseOfflineTransactions(text);
            const astMsgId = (Date.now() + 1).toString();

            if (parsed.length === 0) {
                // Graceful Degradation Bubble
                setMessages((prev: any) => [...prev, {
                    id: astMsgId,
                    role: "assistant",
                    parts: [{ type: "text", text: "Offline Mode Active. Please use simple English commands, or connect to the internet for full multi-language AI support." }]
                }]);
            } else {
                // Successful Offline Parse
                const dummyText = `Captured offline.\n` + parsed.map(t => `TRANSACTION_DATA:${JSON.stringify(t)}`).join('\n');
                setMessages((prev: any) => [...prev, {
                    id: astMsgId,
                    role: "assistant",
                    parts: [{ type: "text", text: dummyText }]
                }]);
            }
            return;
        }

        sendMessage({ text });
    };

    // Effect to catch incoming voice commands
    useEffect(() => {
        if (externalInputText && externalInputText.trim().length > 0 && !isLoading) {
            sendMessage({ text: externalInputText });
        }
    }, [externalInputText]);

    // Auto-save effect — exact port of web
    useEffect(() => {
        if (isLoading) return;
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg || lastMsg.role !== "assistant") return;

        if (savedTransactions.has(lastMsg.id) || savingTransactions.has(lastMsg.id) || processedMsgIds.current.has(lastMsg.id)) return;

        const rawText = lastMsg.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text).join("");
        const transactions = extractTransactions(rawText);

        if (transactions.length > 0) {
            processedMsgIds.current.add(lastMsg.id);
            handleSaveAllTransactions(lastMsg.id, transactions);
        }
    }, [messages, isLoading, savedTransactions, savingTransactions, user]);

    const handleSaveAllTransactions = async (msgId: string, transactions: TransactionData[]) => {
        // Stamp each transaction with a slightly staggered date so they appear
        // in the sequence the user entered them. We give the first item the OLDEST timestamp
        // and the last item the NEWEST (now). This makes the last item appear at the top
        // of the activity log, exactly as if the user entered them one by one sequentially.
        const now = Date.now();
        const stamped = transactions.map((t, i) => ({
            ...t,
            date: new Date(now - (transactions.length - 1 - i) * 1000).toISOString(),
        }));
        await Promise.all(stamped.map(transaction => handleSaveTransaction(msgId, transaction)));
    };

    const handleSaveTransaction = async (msgId: string, transaction: TransactionData) => {
        if (isOffline && onOfflineTransaction) {
            setSavedTransactions(prev => new Set(prev).add(msgId));
            startTransition(() => {
                onOfflineTransaction(transaction);
            });
            return;
        }

        if (!user) {
            setSavedTransactions(prev => new Set(prev).add(msgId));
            // startTransition prevents UI freeze during re-render — exact port of web
            startTransition(() => {
                onGuestTransaction?.(transaction);
            });
            return;
        }

        setSavingTransactions(prev => new Set(prev).add(msgId));

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                onLoginRequest();
                return;
            }

            const res = await fetch(`${API_BASE}/api/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(transaction),
            });

            if (res.ok) {
                setSavedTransactions(prev => new Set(prev).add(msgId));
                startTransition(() => {
                    onTransactionSaved?.();
                });
            } else {
                const err = await res.json().catch(() => ({}));
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

    return (
        <View className="flex-1 bg-surface border border-border rounded-3xl overflow-hidden relative shadow-xl">

            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-border p-5 bg-background-top/30 backdrop-blur-md">
                <View className="flex-row items-center gap-3">
                    <Sparkles color="#A1A1AA" size={18} />
                    <Text className="text-lg font-medium tracking-tight text-foreground">Flux Command</Text>
                </View>
            </View>

            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
                className="flex-1 p-6"
                contentContainerStyle={{ paddingBottom: 20 }}
                onContentSizeChange={() => {
                    // Force hard lock to bottom when new content streams to prevent jumping/shaking
                    if (isLoading) {
                        scrollViewRef.current?.scrollToEnd({ animated: false });
                    } else {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                    }
                }}
            >
                {messages.map((msg, idx) => (
                    <ChatMessageItem
                        key={msg.id}
                        msg={msg}
                        isSaved={savedTransactions.has(msg.id)}
                        isSaving={savingTransactions.has(msg.id)}
                        isLoading={isLoading}
                        isLastMessage={idx === messages.length - 1}
                        user={user}
                        onLoginRequest={onLoginRequest}
                    />
                ))}

                {/* Loading indicator — matches web's 3-bar animation style */}
                {isLoading && (
                    <View className="flex-row justify-start pl-6 mb-4">
                        <View className="flex-row items-center gap-1.5 opacity-60">
                            <View className="w-1.5 h-4 bg-foreground opacity-40" />
                            <View className="w-1.5 h-4 bg-foreground opacity-60" />
                            <View className="w-1.5 h-4 bg-foreground opacity-80" />
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Input Area */}
            <View className="p-4 border-t border-border bg-background-top/30 backdrop-blur-md">
                <View className="flex-row items-center bg-transparent border border-border rounded-2xl px-4 py-2 hover:border-foreground/30 transition-colors">
                    <Sparkles color="#A1A1AA" size={14} className="mr-3" />
                    <TextInput
                        value={input}
                        onChangeText={setInput}
                        placeholder={user ? "Command AI..." : "Chat with Flux AI..."}
                        placeholderTextColor="#A1A1AA"
                        className="flex-1 text-base font-medium text-foreground py-3 tracking-wide outline-none"
                        style={{ outlineStyle: 'none' } as any}
                        onSubmitEditing={handleSubmit}
                        editable={!isLoading}
                        returnKeyType="send"
                    />
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={!input?.trim() || isLoading}
                        className="p-2.5 rounded-xl bg-foreground"
                        style={(!input?.trim() || isLoading) ? { opacity: 0.3 } : {}}
                    >
                        <Send color={colorScheme === 'dark' ? '#111111' : '#FFFFFF'} size={16} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
