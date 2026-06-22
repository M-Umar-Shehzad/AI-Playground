import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CountryOption, COUNTRIES } from '../../src/components/CountrySelectModal';
import { TrendingUp, TrendingDown, BarChart2, PieChart, Calendar } from 'lucide-react-native';

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    category?: string;
    date?: string;
    [key: string]: any;
}

export default function InsightsTab() {
    const [user, setUser] = useState<User | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [userCountry, setUserCountry] = useState<CountryOption | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            const saved = await AsyncStorage.getItem('userCountry');
            let country = COUNTRIES.find(c => c.code === 'PK') || null;
            if (saved) { try { country = JSON.parse(saved); } catch { } }
            setUserCountry(country);

            if (currentUser) {
                const { data } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false });
                setTransactions(data || []);
            } else {
                // Load guest transactions
                const guestRaw = await AsyncStorage.getItem('guestTransactions');
                if (guestRaw) { try { setTransactions(JSON.parse(guestRaw)); } catch { } }
            }
            setLoading(false);
        };
        load();
    }, []);

    const currency = userCountry?.currency || 'PKR';
    const currencyKey = `net_${currency.toLowerCase()}`;

    const income = transactions.filter(t => t.type === 'income');
    const expenses = transactions.filter(t => t.type === 'expense');

    const totalIncome = income.reduce((s, t) => s + (Number(t[currencyKey]) || 0), 0);
    const totalExpenses = expenses.reduce((s, t) => s + (Number(t[currencyKey]) || 0), 0);
    const net = totalIncome - totalExpenses;

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(t => {
        const cat = t.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(t[currencyKey]) || 0);
    });
    const topCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    const fmt = (n: number) => {
        const isZeroDecimal = ['PKR', 'INR', 'JPY', 'KRW', 'IDR', 'VND'].includes(currency);
        return isZeroDecimal ? Math.round(n).toLocaleString() : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (loading) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator color="#FFFFFF" />
            </View>
        );
    }

    if (transactions.length === 0) {
        return (
            <View className="flex-1 bg-background items-center justify-center px-8">
                <BarChart2 color="#A1A1AA" size={40} />
                <Text className="text-foreground text-lg font-medium mt-6 text-center">No data yet</Text>
                <Text className="text-muted text-sm text-center mt-2 font-light">Add transactions via the AI chat on the Home tab to see your insights here.</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="px-6 pt-16 pb-6 border-b border-border">
                <View className="flex-row items-center gap-3 mb-1">
                    <View className="h-3 w-3 rounded-full bg-foreground" />
                    <Text className="text-xl font-medium tracking-tighter text-foreground">Insights</Text>
                </View>
                <Text className="text-sm text-muted font-light tracking-tight">Financial Overview · {currency}</Text>
            </View>

            <View className="px-6 pt-6 pb-16 gap-6">

                {/* Summary Cards */}
                <View className="flex-row gap-4">
                    <View className="flex-1 bg-surface border border-border rounded-2xl p-4">
                        <View className="flex-row items-center gap-2 mb-2">
                            <TrendingUp color="#34D399" size={16} />
                            <Text className="text-[10px] uppercase tracking-widest text-[#34D399] font-semibold">Inflow</Text>
                        </View>
                        <Text className="text-xl font-semibold text-white tracking-tight">{fmt(totalIncome)}</Text>
                        <Text className="text-[10px] text-muted mt-1">{income.length} transactions</Text>
                    </View>
                    <View className="flex-1 bg-surface border border-border rounded-2xl p-4">
                        <View className="flex-row items-center gap-2 mb-2">
                            <TrendingDown color="#F43F5E" size={16} />
                            <Text className="text-[10px] uppercase tracking-widest text-[#F43F5E] font-semibold">Outflow</Text>
                        </View>
                        <Text className="text-xl font-semibold text-white tracking-tight">{fmt(totalExpenses)}</Text>
                        <Text className="text-[10px] text-muted mt-1">{expenses.length} transactions</Text>
                    </View>
                </View>

                {/* Net */}
                <View className="bg-surface border border-border rounded-2xl p-5">
                    <Text className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-3">Net Capital</Text>
                    <Text className="text-3xl font-medium tracking-tighter" style={{ color: net >= 0 ? '#34D399' : '#F43F5E' }}>
                        {net >= 0 ? '+' : '-'}{fmt(Math.abs(net))} {currency}
                    </Text>
                </View>

                {/* Top Spending Categories */}
                {topCategories.length > 0 && (
                    <View className="bg-surface border border-border rounded-2xl p-5">
                        <View className="flex-row items-center gap-3 mb-4 pb-3 border-b border-border">
                            <PieChart color="#A1A1AA" size={16} />
                            <Text className="text-sm font-medium text-foreground tracking-tight uppercase">Top Expenses</Text>
                        </View>
                        {topCategories.map(([cat, amount], idx) => {
                            const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                            return (
                                <View key={cat} className="mb-3">
                                    <View className="flex-row items-center justify-between mb-1.5">
                                        <Text className="text-sm font-medium text-foreground">{cat}</Text>
                                        <Text className="text-sm text-muted">{fmt(amount)} · {pct.toFixed(0)}%</Text>
                                    </View>
                                    <View className="h-1 bg-border rounded-full overflow-hidden">
                                        <View className="h-full rounded-full bg-foreground" style={{ width: `${pct}%`, opacity: 0.6 - idx * 0.08 }} />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Transaction count */}
                <View className="bg-surface border border-border rounded-2xl p-5 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                        <Calendar color="#A1A1AA" size={16} />
                        <Text className="text-sm font-medium text-foreground">Total Records</Text>
                    </View>
                    <Text className="text-lg font-semibold text-foreground">{transactions.length}</Text>
                </View>
            </View>
        </ScrollView>
    );
}
