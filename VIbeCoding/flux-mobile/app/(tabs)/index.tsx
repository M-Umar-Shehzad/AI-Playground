import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from "react-native";
import { supabase } from "../../src/lib/supabase";
import { User } from "@supabase/supabase-js";
import ChatInterface from "../../src/components/chat/ChatInterface";
import { Wallet, Activity, ArrowUpRight, ArrowDownRight, Globe, X, Clock, Trash2, Edit2, CheckCircle2, Sun, Moon, ChevronLeft, ChevronRight, BookOpen } from "lucide-react-native";
import { useRouter, useNavigation } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";
import { useNetInfo } from "@react-native-community/netinfo";
import Animated, { FadeInDown } from "react-native-reanimated";
import CountrySelectModal, { CountryOption, COUNTRIES } from "../../src/components/CountrySelectModal";
import WelcomeModal from "../../src/components/WelcomeModal";
import Calendar from "../../src/components/Calendar";
import FloatingCalendarTrigger from "../../src/components/FloatingCalendarTrigger";
import FloatingMicTrigger from "../../src/components/FloatingMicTrigger";
import VoiceCommandModal from '../../src/components/VoiceCommandModal';
import DailyNotesPanel from "../../src/components/DailyNotesPanel";
import { syncOfflineNotes } from "../../src/utils/dailyNotesSync";

interface Transaction {
    id: string;
    type: string;
    category: string;
    raw_transcript: string;
    date: string;
    amount_usd?: number;
    platform_fee_usd?: number;
    withdrawal_fee_usd?: number;
    [key: string]: any;
}

const HISTORY_PER_PAGE = 12;

export default function HomeTab() {
    const router = useRouter();
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const netInfo = useNetInfo();
    const isOffline = netInfo.isConnected === false;
    const [loading, setLoading] = useState(true);

    // === AUTH STATE (mirrors web: supabase.auth.onAuthStateChange) ===
    const [user, setUser] = useState<User | null>(null);

    // Profile / Country / Welcome State
    const [userCountry, setUserCountry] = useState<CountryOption | null>(() => COUNTRIES.find(c => c.code === "US") || null);
    const [showCountryModal, setShowCountryModal] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
    const [voiceInputText, setVoiceInputText] = useState("");
    const [forcingCountrySetup, setForcingCountrySetup] = useState(false);

    // Calendar & Notes State
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false);
    const [showEmailTooltip, setShowEmailTooltip] = useState(false);
    const navigation = useNavigation();

    // Actively kill Modals if user switches Tabs natively (Executive UX Bug Fix)
    useEffect(() => {
        const unsubscribe = navigation.addListener('blur', () => {
            setIsNotesPanelOpen(false);
        });
        return unsubscribe;
    }, [navigation]);

    // Auto-flush Offline Notes Queue when connection is restored & user is logged in
    useEffect(() => {
        if (user?.id && !isOffline) {
            syncOfflineNotes(user.id);
        }
    }, [user?.id, isOffline]);

    // History Modal State (MISSING from previous port)
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);

    // Edit Transaction State
    const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
    const [editAmountVal, setEditAmountVal] = useState<string>("");
    const [editCategoryVal, setEditCategoryVal] = useState<string>("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isDeletingTxn, setIsDeletingTxn] = useState(false);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [guestTransactions, setGuestTransactions] = useState<Transaction[]>([]);

    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });

    const displayTransactions = useMemo(() => {
        return user ? transactions : guestTransactions;
    }, [user, transactions, guestTransactions]);

    const fetchProfileAndTransactions = useCallback(async (currentUser: User) => {
        // 1. Fetch Profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (profile?.country && profile?.currency) {
            const matched = COUNTRIES.find(c => c.code === profile.country);
            if (matched) {
                setUserCountry(matched);
            } else {
                setUserCountry({ code: profile.country, name: "Unknown", currency: profile.currency, timezone: "UTC" });
            }
        } else {
            // Check AsyncStorage fallback (mirrors localStorage in web)
            const localCode = await AsyncStorage.getItem(`country_${currentUser.id}`);
            if (localCode) {
                const matched = COUNTRIES.find(c => c.code === localCode);
                if (matched) setUserCountry(matched);
                setForcingCountrySetup(false);
            } else {
                // No country saved → this is a new user or mid-onboarding
                // Always show Welcome modal; country select comes after via onNext
                // Guard: don't re-trigger if another auth call already opened it
                if (!showWelcomeModal && !showCountryModal) {
                    setUserCountry(null);
                    setForcingCountrySetup(true);
                    setShowWelcomeModal(true);
                }
            }
        }

        // 2. Fetch Transactions
        const { data: txns, error } = await supabase
            .from("transactions")
            .select("*")
            .order("date", { ascending: false });

        if (txns && !error) {
            setTransactions(txns);
        }
    }, []);

    // === AUTH: mirrors web's supabase.auth.onAuthStateChange ===
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                fetchProfileAndTransactions(currentUser).finally(() => setLoading(false));
            } else {
                // Guest flow: load saved country from AsyncStorage
                AsyncStorage.getItem('guest_country').then(code => {
                    const matched = COUNTRIES.find(c => c.code === code);
                    if (matched) setUserCountry(matched);
                    setLoading(false);
                });
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                fetchProfileAndTransactions(currentUser);
            } else {
                setTransactions([]);
                setUserCountry(COUNTRIES.find(c => c.code === "US") || null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchProfileAndTransactions]);

    const handleCountrySelect = async (country: CountryOption) => {
        if (!country) {
            setShowCountryModal(false);
            return;
        }
        setUserCountry(country);
        setShowCountryModal(false);
        setForcingCountrySetup(false);

        if (user) {
            await AsyncStorage.setItem(`country_${user.id}`, country.code);
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                email: user.email,
                country: country.code,
                currency: country.currency
            }, { onConflict: 'id' });
            if (error) console.warn("Failed to save region to DB, saved locally:", error);
        } else {
            await AsyncStorage.setItem('guest_country', country.code);
        }
    };

    // === CURRENCY LOGIC (exact port from web) ===
    const activeCurrencyKey = userCountry ? userCountry.currency.toLowerCase() : 'pkr';
    const targetCurrencyCode = userCountry ? userCountry.currency.toUpperCase() : 'PKR';
    const netCol = `net_${activeCurrencyKey}`;

    // zeroDecimalCurrencies (MISSING from previous port - fixes formatting)
    const zeroDecimalCurrencies = ['PKR', 'INR', 'JPY', 'KRW', 'IDR', 'VND'];
    const fractionDigits = zeroDecimalCurrencies.includes(targetCurrencyCode) ? 0 : 2;

    const [rates, setRates] = useState<Record<string, number> | null>(null);

    useEffect(() => {
        fetch('https://open.er-api.com/v6/latest/USD')
            .then(res => res.json())
            .then(data => {
                if (data?.rates) setRates(data.rates);
            })
            .catch(console.error);
    }, []);

    const getNetValue = useCallback((t: Transaction) => {
        const directVal = t[netCol];
        if (directVal != null && Number(directVal) !== 0) return Number(directVal);
        if (!rates) return 0;
        let sourceCurr = 'USD';
        let sourceVal = 0;
        const keys = Object.keys(t).filter(k => k.startsWith('net_') && t[k] != null && Number(t[k]) !== 0);
        if (keys.length > 0) {
            sourceCurr = keys[0].split('_')[1].toUpperCase();
            sourceVal = Number(t[keys[0]]);
        }
        if (sourceVal === 0 || !rates[sourceCurr] || !rates[targetCurrencyCode]) return 0;
        const inUsd = sourceVal / rates[sourceCurr];
        return inUsd * rates[targetCurrencyCode];
    }, [netCol, rates, targetCurrencyCode]);

    const getOriginalCurrency = useCallback((t: any): { currency: string; amount: number; rate: string } | null => {
        if (!rates || !targetCurrencyCode || !t) return null;
        let metaOrigin: { c: string; a: number } | null = null;
        if (t?.raw_transcript && typeof t.raw_transcript === 'string' && t.raw_transcript.includes('|META:')) {
            try {
                const jsonStr = t.raw_transcript.split('|META:')[1];
                metaOrigin = JSON.parse(jsonStr);
            } catch (e) { }
        }
        const t_original_currency = t.original_currency || metaOrigin?.c;
        const t_original_amount = Number(t.original_amount) || metaOrigin?.a || 0;

        // Case 1: Explicit original_currency saved
        if (t_original_currency && t_original_currency !== targetCurrencyCode) {
            const origCurr = t_original_currency.toUpperCase();
            const origAmount = t_original_amount;
            let rateVal = Number(t.exchange_rate) > 0 ? Number(t.exchange_rate) : (rates[targetCurrencyCode] || 1) / (rates[origCurr] || 1);
            return { currency: origCurr, amount: origAmount, rate: `1 ${origCurr} = ${rateVal.toFixed(4)} ${targetCurrencyCode}` };
        }

        // Case 2: Legacy - has amount_usd and target is not USD
        if (!t_original_currency && Number(t.amount_usd) > 0 && targetCurrencyCode !== 'USD') {
            const netUsd = Number(t.amount_usd) - Number(t.platform_fee_usd || 0) - Number(t.withdrawal_fee_usd || 0);
            const rateVal = Number(t.exchange_rate) > 0 ? Number(t.exchange_rate) : (rates[targetCurrencyCode] || 1);
            return { currency: 'USD', amount: netUsd, rate: `1 USD = ${rateVal.toFixed(2)} ${targetCurrencyCode}` };
        }

        // Case 3: Legacy cross-dashboard (MISSING from previous port)
        if (!t.original_currency) {
            const keys = Object.keys(t).filter(k => k.startsWith('net_') && t[k] != null && Number(t[k]) !== 0);
            if (keys.length > 0) {
                const origCurr = keys[0].split('_')[1].toUpperCase();
                const origAmount = Number(t[keys[0]]);
                if (origCurr !== targetCurrencyCode) {
                    const rateVal = (rates[targetCurrencyCode] || 1) / (rates[origCurr] || 1);
                    return { currency: origCurr, amount: origAmount, rate: `1 ${origCurr} = ${rateVal.toFixed(4)} ${targetCurrencyCode}` };
                }
            }
        }

        return null;
    }, [rates, targetCurrencyCode]);

    // === FORMATTING (exact port from web) ===
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: targetCurrencyCode,
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        }).format(value);

    const formatNumber = (value: number) =>
        new Intl.NumberFormat('en-US', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        }).format(value);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const dayMonth = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
        const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return { dayMonth, time };
    };

    // === TOTALS ===
    const totalIncomeLocal = displayTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + getNetValue(t), 0);
    const totalExpenseLocal = displayTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + getNetValue(t), 0);
    const netBalance = totalIncomeLocal - totalExpenseLocal;

    const transactionDates = useMemo(() => {
        const dateSet = new Set<string>();
        displayTransactions.forEach((t) => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            dateSet.add(key);
        });
        return dateSet;
    }, [displayTransactions]);

    const filteredTransactions = displayTransactions.filter((t) => {
        const txnDate = new Date(t.date);
        return (txnDate.getDate() === selectedDate.getDate() && txnDate.getMonth() === selectedDate.getMonth() && txnDate.getFullYear() === selectedDate.getFullYear());
    });

    const isToday = selectedDate.getDate() === new Date().getDate() && selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear();

    // === HANDLERS ===
    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        setIsCalendarOpen(false);
    };

    const handleGuestTransaction = (txData: any) => {
        const dummyTx: Transaction = {
            ...txData,
            id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: txData.date || new Date().toISOString()
        };
        setGuestTransactions(prev => [dummyTx, ...prev]);
    };

    const handleOfflineTransaction = async (txData: any) => {
        const dummyTx: Transaction = {
            ...txData,
            id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: txData.date || new Date().toISOString()
        };

        if (user) {
            setTransactions(prev => [dummyTx, ...prev]);
            try {
                const existing = await AsyncStorage.getItem('offline_queue');
                const queue = existing ? JSON.parse(existing) : [];
                queue.push(dummyTx);
                await AsyncStorage.setItem('offline_queue', JSON.stringify(queue));
            } catch (e) {
                console.error("Failed to save to offline queue", e);
            }
        } else {
            setGuestTransactions(prev => [dummyTx, ...prev]);
        }
    };

    const handleOpenEditModal = (t: Transaction) => {
        setEditingTxn(t);
        setEditCategoryVal(t.category || "");
        const orig = getOriginalCurrency(t);
        if (orig && orig.amount) {
            setEditAmountVal(orig.amount.toString());
        } else {
            setEditAmountVal(getNetValue(t).toString());
        }
    };

    const closeEditModal = () => {
        setEditingTxn(null);
        setEditAmountVal("");
        setEditCategoryVal("");
    };

    const handleSaveEdit = async () => {
        if (!editingTxn) return;
        const newAmount = parseFloat(editAmountVal);
        if (isNaN(newAmount) || newAmount <= 0) return;

        setIsSavingEdit(true);
        try {
            const updates: any = {};
            const orig = getOriginalCurrency(editingTxn);

            if (orig) {
                updates.original_amount = newAmount;
                const rateUsed = rates?.[orig.currency] || 1;
                const targetRate = rates?.[targetCurrencyCode] || 1;
                const inUsd = newAmount / rateUsed;
                const newLocal = inUsd * targetRate;
                updates[`amount_${activeCurrencyKey}`] = newLocal;
                updates[`net_${activeCurrencyKey}`] = newLocal;
                updates.amount_usd = inUsd;

                if (editingTxn?.raw_transcript && editingTxn.raw_transcript.includes('|META:')) {
                    const base = editingTxn.raw_transcript.split('|META:')[0];
                    updates.raw_transcript = base + `|META:${JSON.stringify({ c: orig.currency, a: newAmount })}`;
                }
            } else {
                updates[`amount_${activeCurrencyKey}`] = newAmount;
                updates[`net_${activeCurrencyKey}`] = newAmount;
            }
            updates.category = editCategoryVal.trim() || 'Transaction';

            if (!user) {
                setGuestTransactions(prev => prev.map(t => t.id === editingTxn.id ? { ...t, ...updates } : t));
                closeEditModal();
                return;
            }

            const { error } = await supabase.from('transactions').update(updates).eq('id', editingTxn.id);
            if (!error) {
                fetchProfileAndTransactions(user);
                closeEditModal();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteTransaction = async () => {
        if (!editingTxn) return;
        setIsDeletingTxn(true);
        try {
            if (!user) {
                setGuestTransactions(prev => prev.filter(t => t.id !== editingTxn.id));
                closeEditModal();
                return;
            }
            const { error } = await supabase.from('transactions').delete().eq('id', editingTxn.id);
            if (!error) {
                fetchProfileAndTransactions(user);
                closeEditModal();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsDeletingTxn(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    }

    const totalHistoryPages = Math.ceil(filteredTransactions.length / HISTORY_PER_PAGE);

    return (
        <View className="flex-1 bg-background relative">

            {/* Calendar Modal — available to all users including guests */}
            <Modal visible={isCalendarOpen} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/70 px-4">
                    <View className="w-full bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl">
                        <View className="p-4 border-b border-border flex-row items-center justify-between">
                            <Text className="text-sm font-medium tracking-wide text-foreground uppercase">Ledger Date</Text>
                            <TouchableOpacity onPress={() => setIsCalendarOpen(false)} className="p-2">
                                <X color="#A1A1AA" size={16} />
                            </TouchableOpacity>
                        </View>
                        <View className="p-6">
                            <Calendar
                                selectedDate={selectedDate}
                                onDateSelect={handleDateSelect}
                                transactionDates={transactionDates}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Transaction Modal */}
            <Modal visible={editingTxn !== null} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/70 px-4">
                    <View className="w-full bg-surface border border-border rounded-3xl overflow-hidden shadow-xl">
                        <View className="p-5 border-b border-border flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <Edit2 color="#A1A1AA" size={16} />
                                <Text className="text-sm font-medium tracking-wide text-foreground uppercase">Edit Transaction</Text>
                            </View>
                            <TouchableOpacity onPress={closeEditModal} className="p-2">
                                <X color="#A1A1AA" size={16} />
                            </TouchableOpacity>
                        </View>

                        <View className="p-6 gap-6">
                            <View>
                                <Text className="text-xs uppercase tracking-widest text-muted font-medium mb-2">Category / Label</Text>
                                <TextInput
                                    value={editCategoryVal}
                                    onChangeText={setEditCategoryVal}
                                    placeholder="e.g. Groceries, Freelance..."
                                    placeholderTextColor="#A1A1AA"
                                    className="bg-transparent border border-border text-foreground text-base rounded-2xl py-4 px-5"
                                />
                            </View>
                            <View>
                                <Text className="text-xs uppercase tracking-widest text-muted font-medium mb-2">
                                    Amount ({getOriginalCurrency(editingTxn)?.currency || targetCurrencyCode})
                                </Text>
                                <TextInput
                                    value={editAmountVal}
                                    onChangeText={setEditAmountVal}
                                    keyboardType="numeric"
                                    className="bg-transparent border border-border text-foreground text-xl rounded-2xl py-4 px-5"
                                />
                            </View>

                            <View className="flex-col gap-3 pt-2">
                                <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit || !editAmountVal} className="w-full flex-row items-center justify-center gap-2 bg-foreground py-3.5 rounded-2xl">
                                    {isSavingEdit ? <ActivityIndicator color="#111111" size="small" /> : (
                                        <>
                                            <Text className="text-surface font-medium tracking-wide">Save Changes</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleDeleteTransaction} disabled={isDeletingTxn} className="w-full flex-row items-center justify-center gap-2 border border-red-500/20 py-3.5 rounded-2xl">
                                    {isDeletingTxn ? <ActivityIndicator color="#EF4444" size="small" /> : (
                                        <>
                                            <Trash2 color="#EF4444" size={16} />
                                            <Text className="text-red-500 font-medium tracking-wide">Delete Record</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* History Modal (NEWLY PORTED) */}
            <Modal visible={showHistoryModal} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/70 px-4">
                    <View className="w-full bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl max-h-[80%]">
                        <View className="p-5 border-b border-border flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <Clock color="#A1A1AA" size={16} />
                                <Text className="text-sm font-medium tracking-wide text-foreground uppercase">Transaction History</Text>
                            </View>
                            <View className="flex-row items-center gap-3">
                                <Text className="text-xs text-muted tracking-wide">Page {historyPage} of {totalHistoryPages}</Text>
                                <TouchableOpacity onPress={() => setShowHistoryModal(false)} className="p-2">
                                    <X color="#A1A1AA" size={16} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView className="flex-1 p-4">
                            {filteredTransactions
                                .slice((historyPage - 1) * HISTORY_PER_PAGE, historyPage * HISTORY_PER_PAGE)
                                .map((txn) => {
                                    const orig = getOriginalCurrency(txn);
                                    return (
                                        <TouchableOpacity key={txn.id} onPress={() => { setShowHistoryModal(false); handleOpenEditModal(txn); }} className="flex-row items-center justify-between py-4 px-3 border-b border-border border-opacity-30 rounded-2xl">
                                            {/* Left Column Bounded */}
                                            <View className="flex-row items-center gap-4 flex-1 pr-4">
                                                <View className="w-9 h-9 rounded-full bg-black/5 border border-border items-center justify-center">
                                                    {txn.type === "income" ? <ArrowDownRight color="#34D399" size={14} /> : <ArrowUpRight color="#F43F5E" size={14} />}
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-sm font-medium tracking-tight text-foreground" numberOfLines={1}>{txn.category || "Transaction"}</Text>
                                                    <View className="flex-row flex-wrap mt-0.5 gap-x-1">
                                                        <Text className="text-xs text-muted tracking-tight font-light">{formatDate(txn.date).dayMonth},</Text>
                                                        <Text className="text-xs text-muted tracking-tight font-light">{formatDate(txn.date).time}</Text>
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Right Column Bounded */}
                                            <View className="items-end shrink" style={{ maxWidth: '55%' }}>
                                                <Text className={`text-base font-medium tabular-nums tracking-tight text-right ${txn.type === "income" ? "text-foreground" : "text-muted"}`} numberOfLines={1} adjustsFontSizeToFit>
                                                    {txn.type === "income" ? "+" : "-"}{formatCurrency(getNetValue(txn))}
                                                </Text>
                                                {orig && (
                                                    <Text className="text-[10px] text-muted mt-0.5 tracking-wide font-medium text-right flex-wrap" style={{ flexShrink: 1 }}>
                                                        {zeroDecimalCurrencies.includes(orig.currency) ? orig.amount.toFixed(0) : orig.amount.toFixed(2)} {orig.currency} · 1 {orig.currency} = {Number(orig.rate).toFixed(2)} {targetCurrencyCode}
                                                    </Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                        </ScrollView>

                        {totalHistoryPages > 1 && (
                            <View className="p-4 border-t border-border flex-row items-center justify-between">
                                <TouchableOpacity onPress={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="flex-row items-center gap-1 px-3 py-2 rounded-xl">
                                    <ChevronLeft color={historyPage === 1 ? "#555" : "#A1A1AA"} size={14} />
                                    <Text className={historyPage === 1 ? "text-zinc-600 text-xs" : "text-muted text-xs"}>Prev</Text>
                                </TouchableOpacity>
                                <View className="flex-row items-center gap-1">
                                    {Array.from({ length: totalHistoryPages }, (_, i) => (
                                        <TouchableOpacity key={i} onPress={() => setHistoryPage(i + 1)} className={`w-8 h-8 rounded-full items-center justify-center ${historyPage === i + 1 ? 'bg-foreground' : ''}`}>
                                            <Text className={`text-xs font-medium ${historyPage === i + 1 ? 'text-surface' : 'text-muted'}`}>{i + 1}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TouchableOpacity onPress={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))} disabled={historyPage === totalHistoryPages} className="flex-row items-center gap-1 px-3 py-2 rounded-xl">
                                    <Text className={historyPage === totalHistoryPages ? "text-zinc-600 text-xs" : "text-muted text-xs"}>Next</Text>
                                    <ChevronRight color={historyPage === totalHistoryPages ? "#555" : "#A1A1AA"} size={14} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Onboarding Modals */}
            <WelcomeModal
                isOpen={showWelcomeModal}
                onNext={() => {
                    setShowWelcomeModal(false);
                    setTimeout(() => {
                        setForcingCountrySetup(true);
                        setShowCountryModal(true);
                    }, 400);
                }}
            />

            <CountrySelectModal
                isOpen={showCountryModal}
                onSelect={handleCountrySelect}
                onClose={() => setShowCountryModal(false)}
                currentCurrency={userCountry?.currency}
                requireSave={forcingCountrySetup}
            />

            <DailyNotesPanel
                isOpen={isNotesPanelOpen}
                onClose={() => setIsNotesPanelOpen(false)}
                date={selectedDate}
                isReadOnly={!isToday}
                userId={user?.id}
            />

            <ScrollView className="flex-1 relative z-0" showsVerticalScrollIndicator={false}>
                <View className="px-6 pt-14 pb-12">

                    {/* Top Header */}
                    <View className="flex-row items-center justify-between mb-0 z-50">
                        <View className="flex-row items-center gap-3">
                            <View className="h-3 w-3 rounded-full bg-foreground" />
                            <Text className="text-xl font-medium tracking-tighter text-foreground">Flux</Text>
                        </View>
                        <View className="flex-row items-center gap-3 z-50">
                            {user && user.email && (
                                <View className="relative z-50">
                                    <TouchableOpacity
                                        onPress={() => setShowEmailTooltip(!showEmailTooltip)}
                                        className="h-[34px] w-[34px] rounded-full bg-foreground items-center justify-center border border-border"
                                    >
                                        <Text className="text-surface font-bold text-xs uppercase tracking-widest">
                                            {user.email.charAt(0)}
                                        </Text>
                                    </TouchableOpacity>

                                    {showEmailTooltip && (
                                        <View className="absolute top-12 -right-4 bg-surface border border-border px-3 py-2 rounded-xl shadow-xl z-50 min-w-[120px]">
                                            <Text className="text-xs text-foreground font-medium text-center">{user.email}</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <TouchableOpacity onPress={() => setShowCountryModal(true)} className="flex-row items-center gap-2 border border-border px-3 py-2 rounded-full bg-surface">
                                <Globe color="#A1A1AA" size={14} />
                                <Text className="text-xs font-medium text-muted uppercase tracking-widest">{userCountry?.code || "SET"}</Text>
                            </TouchableOpacity>

                            {user ? (
                                <TouchableOpacity onPress={() => supabase.auth.signOut()} className="border border-border px-4 py-2 rounded-full">
                                    <Text className="text-xs font-medium text-foreground uppercase tracking-wider">Sign Out</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={() => router.replace('/(auth)/login')} className="bg-foreground px-5 py-2.5 rounded-full">
                                    <Text className="text-xs font-medium text-surface uppercase tracking-wider">Sign In</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Theme Toggle — Floating icon below header on the right */}
                    <View className="flex-row justify-end mb-10 pt-4 pb-2 pr-0">
                        <TouchableOpacity
                            onPress={toggleColorScheme}
                            style={{
                                width: 36, height: 36,
                                borderRadius: 18,
                                backgroundColor: colorScheme === 'dark' ? '#111111' : '#f4f4f5',
                                alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            {colorScheme === 'dark'
                                ? <Moon color="#ffffff" size={16} strokeWidth={1.5} />
                                : <Sun color="#111111" size={16} strokeWidth={1.5} />
                            }
                        </TouchableOpacity>
                    </View>

                    {/* Hero Section */}
                    <View className="mb-10 z-10">
                        <View className="flex-row items-center gap-2 mb-4">
                            <Wallet color="#10B981" size={24} />
                            <Text
                                className="text-sm font-semibold uppercase tracking-[0.2em] text-[#10B981]"
                                style={{ textShadowColor: 'rgba(16, 185, 129, 0.4)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }}
                            >
                                Total Capital
                            </Text>
                        </View>

                        <View className="flex-row items-start gap-3 mb-8">
                            <Text
                                className="text-[84px] leading-[96px] font-medium tracking-tighter font-serif"
                                style={{
                                    color: netBalance >= 0 ? '#10B981' : '#E11D48',
                                    textShadowColor: netBalance >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(225, 29, 72, 0.2)',
                                    textShadowRadius: 15,
                                    textShadowOffset: { width: 0, height: 0 }
                                }}
                            >
                                {netBalance >= 0 ? "" : "-"}{formatNumber(Math.abs(netBalance))}
                            </Text>
                            <Text className="text-2xl font-medium font-serif text-zinc-600 tracking-tight mt-6">{targetCurrencyCode}</Text>
                        </View>

                        <View className="flex-row gap-12 border-t border-[#333333] pt-6 relative items-start self-start" style={{ width: '80%' }}>
                            <View className="flex-col gap-1.5">
                                <Text
                                    className="text-sm uppercase tracking-widest font-semibold text-[#10B981]"
                                    style={{ textShadowColor: 'rgba(16, 185, 129, 0.35)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } }}
                                >
                                    Inflow
                                </Text>
                                <Text
                                    className="text-3xl font-semibold tracking-tight font-serif text-[#10B981]"
                                    style={{ textShadowColor: 'rgba(16, 185, 129, 0.3)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } }}
                                >
                                    {!userCountry ? "..." : formatNumber(totalIncomeLocal)}
                                </Text>
                            </View>
                            <View className="flex-col gap-1.5">
                                <Text
                                    className="text-sm uppercase tracking-widest font-semibold text-[#E11D48]"
                                    style={{ textShadowColor: 'rgba(225, 29, 72, 0.35)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } }}
                                >
                                    Outflow
                                </Text>
                                <Text
                                    className="text-3xl font-semibold tracking-tight font-serif text-[#E11D48]"
                                    style={{ textShadowColor: 'rgba(225, 29, 72, 0.3)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } }}
                                >
                                    {!userCountry ? "..." : formatNumber(totalExpenseLocal)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Activity List */}
                    <View className="bg-surface border border-border rounded-3xl p-6 mb-8 min-h-[400px]" style={{ position: 'relative', zIndex: 10 }}>
                        {/* Calendar & Notes Triggers — absolute positioned relative to the activity box */}
                        <View style={{ position: 'absolute', right: 0, top: -20, zIndex: 100, flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setIsNotesPanelOpen(true)}
                                activeOpacity={0.8}
                                className={`w-14 h-14 rounded-full transition-colors border shadow-xl bg-foreground ${isNotesPanelOpen ? "border-accent-income" : "border-transparent"} items-center justify-center`}
                            >
                                <BookOpen color={colorScheme === 'dark' ? '#111111' : '#FFFFFF'} size={24} strokeWidth={2.5} />
                            </TouchableOpacity>
                            <FloatingCalendarTrigger
                                date={selectedDate}
                                onClick={() => setIsCalendarOpen(true)}
                                isActive={isCalendarOpen}
                            />
                        </View>
                        <View className="flex-row items-center justify-between mb-6 pb-4 border-b border-border">
                            <View className="flex-row items-center gap-3">
                                <Activity color="#A1A1AA" size={20} />
                                <Text className="text-lg font-medium text-foreground tracking-tight">
                                    {isToday ? "Activity" : `Ledger: ${selectedDate.toLocaleDateString("en-US", { day: "numeric", month: "long" })}`}
                                </Text>
                            </View>
                            {filteredTransactions.length > 0 && (
                                <View className="bg-black/10 px-3 py-1.5 rounded-full">
                                    <Text className="text-[10px] font-bold tracking-widest uppercase text-muted">
                                        {filteredTransactions.length} Record{filteredTransactions.length !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View className="flex-1">
                            {filteredTransactions.length === 0 ? (
                                <View className="py-16 items-center">
                                    <Text className="text-sm text-muted tracking-tight font-light">No financial activity recorded.</Text>
                                </View>
                            ) : (
                                filteredTransactions.slice(0, 4).map((txn, index) => {
                                    const orig = getOriginalCurrency(txn);
                                    return (
                                        <Animated.View key={txn.id} entering={FadeInDown.delay(index * 100).springify().damping(15)}>
                                            <TouchableOpacity onPress={() => handleOpenEditModal(txn)} className="flex-row items-center justify-between py-4 border-b border-border border-opacity-30">
                                                {/* Left Column (Category & Date) — bounded by flex-1 to prevent right column from crushing it */}
                                                <View className="flex-row items-center gap-5 flex-1 pr-4">
                                                    <View className="w-10 h-10 rounded-full bg-black/5 border border-border items-center justify-center">
                                                        {txn.type === "income" ? (
                                                            <ArrowDownRight color="#34D399" size={16} />
                                                        ) : (
                                                            <ArrowUpRight color="#F43F5E" size={16} />
                                                        )}
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className="text-base font-medium tracking-tight text-foreground" numberOfLines={1}>{txn.category || "Transaction"}</Text>
                                                        <View className="flex-row flex-wrap mt-0.5 gap-x-1">
                                                            <Text className="text-xs text-muted tracking-tight font-light">{formatDate(txn.date).dayMonth},</Text>
                                                            <Text className="text-xs text-muted tracking-tight font-light">{formatDate(txn.date).time}</Text>
                                                        </View>
                                                    </View>
                                                </View>

                                                {/* Right Column (Numbers & Math) — bounded strictly so it wraps instead of overflowing left */}
                                                <View className="items-end shrink" style={{ maxWidth: '55%' }}>
                                                    <Text className={`text-xl font-medium tracking-tight tabular-nums text-right ${txn.type === "income" ? "text-foreground" : "text-muted"}`} numberOfLines={1} adjustsFontSizeToFit>
                                                        {txn.type === "income" ? "+" : "-"}{formatCurrency(getNetValue(txn))}
                                                    </Text>
                                                    {orig && (
                                                        <Text className="text-[10px] text-muted mt-1 uppercase font-medium tracking-widest text-right flex-wrap" style={{ flexShrink: 1 }}>
                                                            {zeroDecimalCurrencies.includes(orig.currency) ? orig.amount.toFixed(0) : orig.amount.toFixed(2)} {orig.currency} · 1 {orig.currency} = {Number(orig.rate).toFixed(2)} {targetCurrencyCode}
                                                        </Text>
                                                    )}
                                                    {Number(txn.amount_usd) > 0 && (Number(txn.platform_fee_usd) + Number(txn.withdrawal_fee_usd)) > 0 && (
                                                        <Text className="text-[10px] text-muted mt-1 uppercase tracking-widest font-medium text-right">
                                                            Fee: ${(Number(txn.platform_fee_usd) + Number(txn.withdrawal_fee_usd)).toFixed(2)}
                                                        </Text>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    );
                                })
                            )}
                        </View>

                        {/* View History Button (NEWLY PORTED) */}
                        {filteredTransactions.length > 4 && (
                            <View className="pt-3 border-t border-border mt-2">
                                <TouchableOpacity onPress={() => { setShowHistoryModal(true); setHistoryPage(1); }} className="flex-row items-center justify-center gap-2 py-2.5 rounded-2xl">
                                    <Clock color="#A1A1AA" size={14} />
                                    <Text className="text-[11px] font-medium tracking-widest uppercase text-muted">
                                        View History ({filteredTransactions.length - 4} more)
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Chat Section — inside scroll, below activity */}
                    <View className="h-[500px] mb-6" style={{ position: 'relative', zIndex: 10 }}>
                        {/* Mic Trigger — absolute positioned relative to the chat box */}
                        <View style={{ position: 'absolute', right: 0, top: -20, zIndex: 100 }}>
                            <FloatingMicTrigger
                                onClick={() => setIsVoiceModalOpen(true)}
                                isActive={isVoiceModalOpen}
                                isOffline={isOffline}
                            />
                        </View>
                        {isToday ? (
                            <ChatInterface
                                key={`chat-${userCountry?.currency || 'PKR'}`}
                                user={user}
                                userCountry={userCountry!}
                                onLoginRequest={() => router.replace('/(auth)/login')}
                                onTransactionSaved={() => user && fetchProfileAndTransactions(user)}
                                onGuestTransaction={handleGuestTransaction}
                                onOfflineTransaction={handleOfflineTransaction}
                                externalInputText={voiceInputText}
                            />
                        ) : (
                            <View className="flex-1 bg-surface border border-border rounded-3xl items-center justify-center p-8 opacity-60">
                                <Clock color="#A1A1AA" size={32} />
                                <Text className="text-foreground font-medium text-lg mt-4 text-center">Historical Insight Mode</Text>
                                <Text className="text-muted font-light text-sm mt-2 text-center">Return to Today's active ledger to input new records via AI chat.</Text>
                                <TouchableOpacity onPress={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setSelectedDate(d); }} className="mt-6 border border-border px-6 py-3 rounded-xl bg-background">
                                    <Text className="text-foreground text-sm font-medium">Return to Active Ledger</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                </View>
            </ScrollView>

            {/* Global Voice Command Modal overlay */}
            <VoiceCommandModal
                visible={isVoiceModalOpen}
                userCountry={userCountry}
                onClose={() => setIsVoiceModalOpen(false)}
                onSend={(text) => {
                    setVoiceInputText(text);
                    setTimeout(() => setVoiceInputText(""), 100);
                }}
            />
        </View>
    );
}
