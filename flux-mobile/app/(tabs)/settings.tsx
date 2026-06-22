import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { LogOut, Sun, Moon, Globe, User as UserIcon, Lock, Bell, ChevronRight, Sparkles } from 'lucide-react-native';
import CountrySelectModal, { CountryOption, COUNTRIES } from '../../src/components/CountrySelectModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsTab() {
    const router = useRouter();
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const [user, setUser] = useState<User | null>(null);
    const [userCountry, setUserCountry] = useState<CountryOption | null>(null);
    const [showCountryModal, setShowCountryModal] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        // Load saved country
        AsyncStorage.getItem('userCountry').then(saved => {
            if (saved) {
                try { setUserCountry(JSON.parse(saved)); } catch { }
            } else {
                const pkr = COUNTRIES.find(c => c.code === 'PK');
                if (pkr) setUserCountry(pkr);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.replace('/(tabs)');
    };

    const handleCountrySelect = async (country: CountryOption) => {
        setUserCountry(country);
        await AsyncStorage.setItem('userCountry', JSON.stringify(country));
        setShowCountryModal(false);
    };

    const isDark = colorScheme === 'dark';

    const SectionHeader = ({ title }: { title: string }) => (
        <Text className="text-[10px] uppercase tracking-widest font-semibold text-muted px-2 mb-2 mt-6">{title}</Text>
    );

    const Row = ({ icon, label, value, onPress, danger }: { icon: React.ReactNode; label: string; value?: string; onPress?: () => void; danger?: boolean }) => (
        <TouchableOpacity
            onPress={onPress}
            className="flex-row items-center justify-between px-5 py-4 bg-surface border-b border-border"
            disabled={!onPress}
        >
            <View className="flex-row items-center gap-4">
                {icon}
                <Text className={`text-base font-medium tracking-tight ${danger ? 'text-[#E11D48]' : 'text-foreground'}`}>{label}</Text>
            </View>
            <View className="flex-row items-center gap-2">
                {value ? <Text className="text-sm text-muted">{value}</Text> : null}
                {onPress && !danger && <ChevronRight color="#A1A1AA" size={16} />}
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
            <CountrySelectModal
                isOpen={showCountryModal}
                onSelect={handleCountrySelect}
                currentCurrency={userCountry?.currency}
            />

            {/* Header */}
            <View className="px-6 pt-16 pb-6 border-b border-border">
                <View className="flex-row items-center gap-3 mb-1">
                    <View className="h-3 w-3 rounded-full bg-foreground" />
                    <Text className="text-xl font-medium tracking-tighter text-foreground">Settings</Text>
                </View>
                <Text className="text-sm text-muted font-light tracking-tight">Account & Preferences</Text>
            </View>

            <View className="px-4 pb-16">

                {/* Account */}
                <SectionHeader title="Account" />
                <View className="rounded-2xl overflow-hidden border border-border">
                    {user ? (
                        <>
                            <Row
                                icon={<UserIcon color="#A1A1AA" size={18} />}
                                label={user.email || 'Authenticated'}
                                value="Signed in"
                            />
                            <Row
                                icon={<LogOut color="#E11D48" size={18} />}
                                label="Sign Out"
                                onPress={handleSignOut}
                                danger
                            />
                        </>
                    ) : (
                        <Row
                            icon={<UserIcon color="#A1A1AA" size={18} />}
                            label="Sign In / Create Profile"
                            onPress={() => router.replace('/(auth)/login')}
                        />
                    )}
                </View>

                {/* Preferences */}
                <SectionHeader title="Preferences" />
                <View className="rounded-2xl overflow-hidden border border-border">
                    {/* Theme toggle */}
                    <View className="flex-row items-center justify-between px-5 py-4 bg-surface border-b border-border">
                        <View className="flex-row items-center gap-4">
                            {isDark ? <Moon color="#a5b4fc" size={18} /> : <Sun color="#fbbf24" size={18} />}
                            <Text className="text-base font-medium tracking-tight text-foreground">
                                {isDark ? 'Dark Mode' : 'Light Mode'}
                            </Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleColorScheme}
                            trackColor={{ false: '#3f3f46', true: '#6366f1' }}
                            thumbColor="#ffffff"
                        />
                    </View>

                    {/* Region */}
                    <Row
                        icon={<Globe color="#A1A1AA" size={18} />}
                        label="Region & Currency"
                        value={userCountry ? `${userCountry.code} · ${userCountry.currency}` : 'PKR'}
                        onPress={() => setShowCountryModal(true)}
                    />
                </View>

                {/* Flux+ */}
                <SectionHeader title="Flux+" />
                <View className="rounded-2xl overflow-hidden border border-border">
                    <View className="px-5 py-5 bg-surface">
                        <View className="flex-row items-center gap-3 mb-3">
                            <Sparkles color="#a5b4fc" size={20} />
                            <Text className="text-base font-semibold text-foreground tracking-tight">Flux+ Premium</Text>
                        </View>
                        <Text className="text-sm text-muted font-light leading-5 mb-4">
                            Unlock unlimited AI chat, advanced analytics, receipt scanning, and multi-account support.
                        </Text>
                        <TouchableOpacity className="bg-foreground px-5 py-3 rounded-xl flex-row items-center justify-center">
                            <Text className="text-surface font-semibold text-sm tracking-wide">Coming Soon</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Version */}
                <View className="items-center mt-10">
                    <Text className="text-[11px] text-muted tracking-widest uppercase">Flux v1.0.0</Text>
                </View>
            </View>
        </ScrollView>
    );
}
