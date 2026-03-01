"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import Login from "@/components/auth/Login";
import ChatInterface from "@/components/chat/ChatInterface";
import Calendar from "@/components/Calendar";
import MagneticCalendarTrigger from "@/components/MagneticCalendarTrigger";
import CountrySelectModal, { CountryOption, COUNTRIES } from "@/components/CountrySelectModal";
import LampPullToggle from "@/components/LampPullToggle";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, Globe, X, ChevronLeft, ChevronRight, Clock, Sun, Moon } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  category: string;
  raw_transcript: string;
  date: string;
  amount_usd?: number;
  platform_fee_usd?: number;
  withdrawal_fee_usd?: number;
  [key: string]: any; // Catch-all for dynamic amount_XXX and net_XXX columns
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // Profile / Country State
  const [userCountry, setUserCountry] = useState<CountryOption | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [forcingCountrySetup, setForcingCountrySetup] = useState(false);

  // Calendar State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PER_PAGE = 12;

  // Theme state
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('flux-theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('flux-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('flux-theme', 'light');
      }
      return next;
    });
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

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
        // Fallback
        setUserCountry({ code: profile.country, name: "Unknown", currency: profile.currency, timezone: "UTC" });
      }
    } else {
      // Check localStorage fallback in case DB migration was skipped
      const localCode = localStorage.getItem(`country_${currentUser.id}`);
      if (localCode) {
        const matched = COUNTRIES.find(c => c.code === localCode);
        if (matched) setUserCountry(matched);
        setForcingCountrySetup(false);
      } else {
        // Force setup only once via local storage
        const hasSeen = localStorage.getItem(`hasSeenCountry_${currentUser.id}`);
        if (!hasSeen) {
          setForcingCountrySetup(true);
          setShowCountryModal(true);
          localStorage.setItem(`hasSeenCountry_${currentUser.id}`, 'true');
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfileAndTransactions(currentUser);
      } else {
        setLoading(false); // Render login screen instantly 
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setShowLogin(false);
        fetchProfileAndTransactions(currentUser);
      } else {
        setTransactions([]);
        setUserCountry(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileAndTransactions]);

  // We only block initially while determining auth state. Profile/Transactions load non-blockingly.
  useEffect(() => {
    if (user !== null) {
      setLoading(false);
    }
  }, [user]);

  const handleCountrySelect = async (country: CountryOption) => {
    setUserCountry(country);
    setShowCountryModal(false);
    setForcingCountrySetup(false);

    if (user) {
      // Always store locally so we never lose it if DB fails
      localStorage.setItem(`country_${user.id}`, country.code);

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        country: country.code,
        currency: country.currency
      }, { onConflict: 'id' });

      if (error) {
        console.warn("Failed to save region profile to DB (likely missing SQL migration), but saved locally:", error);
      }
    }
  };

  // Dynamic calculations based on selected isolated currency column
  const activeCurrencyKey = userCountry ? userCountry.currency.toLowerCase() : 'pkr';
  const targetCurrencyCode = userCountry ? userCountry.currency.toUpperCase() : 'PKR';
  const netCol = `net_${activeCurrencyKey}`;

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

    if (!rates) return 0; // Wait for rates to load

    let sourceCurr = 'USD';
    let sourceVal = 0;

    // Find the original saved currency (e.g. net_pkr, net_inr)
    const keys = Object.keys(t).filter(k => k.startsWith('net_') && t[k] != null && Number(t[k]) !== 0);
    if (keys.length > 0) {
      sourceCurr = keys[0].split('_')[1].toUpperCase();
      sourceVal = Number(t[keys[0]]);
    }

    if (sourceVal === 0 || !rates[sourceCurr] || !rates[targetCurrencyCode]) return 0;

    // Convert from Source -> USD -> Target
    const inUsd = sourceVal / rates[sourceCurr];
    return inUsd * rates[targetCurrencyCode];
  }, [netCol, rates, targetCurrencyCode]);

  // Find the original currency & amount stored in a transaction for conversion display
  const getOriginalCurrency = useCallback((t: any): { currency: string; amount: number; rate: string } | null => {
    if (!rates || !targetCurrencyCode) return null;

    let metaOrigin: { c: string; a: number } | null = null;
    if (t.raw_transcript && typeof t.raw_transcript === 'string' && t.raw_transcript.includes('|META:')) {
      try {
        const jsonStr = t.raw_transcript.split('|META:')[1];
        metaOrigin = JSON.parse(jsonStr);
      } catch (e) { }
    }

    const t_original_currency = t.original_currency || metaOrigin?.c;
    const t_original_amount = Number(t.original_amount) || metaOrigin?.a || 0;

    // Case 1: Newer transactions have explicit original_currency saved (or in META string)
    if (t_original_currency && t_original_currency !== targetCurrencyCode) {
      const origCurr = t_original_currency.toUpperCase();
      const origAmount = t_original_amount;
      // Use the stored exchange_rate if > 0, otherwise calculate it
      let rateVal = Number(t.exchange_rate) > 0
        ? Number(t.exchange_rate)
        : (rates[targetCurrencyCode] || 1) / (rates[origCurr] || 1);

      // We know how many native units were generated per foreign unit:
      return {
        currency: origCurr,
        amount: origAmount,
        rate: `1 ${origCurr} = ${rateVal.toFixed(4)} ${targetCurrencyCode}`
      };
    }

    // Case 2: Legacy transactions - Transaction has amount_usd > 0 and the dashboard is NOT USD
    // This means the transaction originated in USD and was converted
    if (!t_original_currency && Number(t.amount_usd) > 0 && targetCurrencyCode !== 'USD') {
      const netUsd = Number(t.amount_usd) - Number(t.platform_fee_usd || 0) - Number(t.withdrawal_fee_usd || 0);
      // Use stored exchange_rate if available, otherwise calculate from live rates
      const rateVal = Number(t.exchange_rate) > 0
        ? Number(t.exchange_rate)
        : (rates[targetCurrencyCode] || 1);
      return {
        currency: 'USD',
        amount: netUsd,
        rate: `1 USD = ${rateVal.toFixed(2)} ${targetCurrencyCode}`
      };
    }

    // Case 3: Legacy Cross-dashboard viewing
    if (!t.original_currency) {
      const keys = Object.keys(t).filter(k => k.startsWith('net_') && t[k] != null && Number(t[k]) !== 0);
      if (keys.length > 0) {
        const origCurr = keys[0].split('_')[1].toUpperCase();
        const origAmount = Number(t[keys[0]]);
        if (origCurr !== targetCurrencyCode) {
          const rateVal = (rates[targetCurrencyCode] || 1) / (rates[origCurr] || 1);
          return {
            currency: origCurr,
            amount: origAmount,
            rate: `1 ${origCurr} = ${rateVal.toFixed(4)} ${targetCurrencyCode}`
          };
        }
      }
    }

    return null;
  }, [rates, targetCurrencyCode]);

  const totalIncomeLocal = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + getNetValue(t), 0);

  const totalExpenseLocal = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + getNetValue(t), 0);

  const netBalance = totalIncomeLocal - totalExpenseLocal;

  const transactionDates = useMemo(() => {
    const dateSet = new Set<string>();
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dateSet.add(key);
    });
    return dateSet;
  }, [transactions]);

  const filteredTransactions = transactions.filter((t) => {
    const txnDate = new Date(t.date);
    return (
      txnDate.getDate() === selectedDate.getDate() &&
      txnDate.getMonth() === selectedDate.getMonth() &&
      txnDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  const isToday =
    selectedDate.getDate() === new Date().getDate() &&
    selectedDate.getMonth() === new Date().getMonth() &&
    selectedDate.getFullYear() === new Date().getFullYear();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, var(--background-top), var(--background-bottom))' }}>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-xl font-medium tracking-tighter text-[var(--foreground)]"
        >
          Flux
        </motion.div>
      </div>
    );
  }

  if (!user && showLogin) {
    return <Login onCancel={() => setShowLogin(false)} />;
  }

  const zeroDecimalCurrencies = ['PKR', 'INR', 'JPY', 'KRW', 'IDR', 'VND'];
  const fractionDigits = zeroDecimalCurrencies.includes(targetCurrencyCode) ? 0 : 2;

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
    return d.toLocaleDateString("en-PK", {
      hour: "numeric",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });
  };

  // ── Calendar date-change handler ────────────────────────
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);
  };

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(to bottom, var(--background-top), var(--background-bottom))' }}>

      {/* Calendar Modal Overlay */}
      <AnimatePresence>
        {isCalendarOpen && user && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCalendarOpen(false)}
              className="absolute inset-0 bg-[var(--surface)]/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--surface)] border border-black/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-sm font-medium tracking-wide text-[var(--foreground)] uppercase">Ledger Date</h3>
                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="p-2 rounded-full hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  transactionDates={transactionDates}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Country Selection Modal */}
      <CountrySelectModal
        isOpen={showCountryModal}
        onSelect={handleCountrySelect}
        currentCurrency={userCountry?.currency}
        requireSave={forcingCountrySetup}
      />

      {/* Dashboard Top Nav */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[var(--background-top)]/70 backdrop-blur-2xl px-6 py-5 flex items-center justify-between border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-[var(--foreground)] shadow-[0_0_12px_rgba(0,0,0,0.3)]" />
          <h1 className="text-xl font-medium tracking-tighter text-[var(--foreground)]">Flux</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            {/* Lamp Pull Wire */}
            <div className="hidden md:block" style={{ position: 'relative', width: 30, alignSelf: 'stretch', overflow: 'visible', zIndex: 50 }}>
              <LampPullToggle isDark={isDark} onToggle={toggleTheme} />
            </div>

            {/* Country Selector Toggle */}
            <button
              onClick={() => setShowCountryModal(true)}
              className="flex items-center gap-2 text-xs font-medium tracking-wide text-[var(--muted)] hover:text-[var(--foreground)] transition-colors uppercase border border-[var(--border)] px-3 py-2 rounded-full hover:bg-[var(--border)]"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{userCountry ? userCountry.code : "Set Region"}</span>
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowEmailDropdown(prev => !prev)}
                  className="w-8 h-8 rounded-full bg-zinc-800 text-white text-xs font-bold uppercase flex items-center justify-center hover:bg-zinc-700 transition-colors border border-black/10"
                >
                  {user.email?.charAt(0) || '?'}
                </button>
                <AnimatePresence>
                  {showEmailDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      className="absolute right-0 top-11 bg-[var(--surface)] border border-black/10 rounded-2xl px-4 py-3 shadow-xl z-50 whitespace-nowrap"
                    >
                      <p className="text-xs font-medium text-[var(--foreground)] tracking-tight">{user.email}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs font-medium tracking-wide text-[var(--foreground)] hover:text-[var(--muted)] transition-colors uppercase border border-[var(--border)] px-4 py-2 rounded-full hover:bg-[var(--border)]"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="text-xs font-medium tracking-wide text-[var(--surface)] bg-[var(--foreground)] px-5 py-2.5 rounded-full hover:opacity-80 transition-colors uppercase"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Mobile Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="md:hidden absolute top-24 right-6 z-30 w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-transform active:scale-95"
      >
        {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      {/* Main Dashboard Layout */}
      <main className="mx-auto max-w-[1400px] px-6 pt-28 pb-12 lg:pt-32 lg:pb-16 grid grid-cols-1 lg:grid-cols-12 gap-6 relative">

        {/* Glow Effects */}
        <div className={`fixed top-0 left-0 w-[800px] h-[800px] blur-[150px] opacity-[0.07] pointer-events-none rounded-full translate-x-[-20%] translate-y-[-20%] ${netBalance >= 0 ? "bg-[var(--accent-income)]" : "bg-[var(--accent-expense)]"}`} />
        <div className="fixed bottom-0 right-0 w-[600px] h-[600px] blur-[120px] opacity-10 bg-[var(--surface)] pointer-events-none rounded-full translate-x-[20%] translate-y-[20%]" />

        {/* Top Hero Section (Spans Full Width) */}
        <section className="lg:col-span-12 mb-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] mb-4 flex items-center gap-2" style={{ color: '#10B981', textShadow: '0 0 12px rgba(16, 185, 129, 0.4)' }}>
              <Wallet className="w-5 h-5" style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))' }} />
              Total Capital
            </h3>
            <div className="flex items-start gap-4 mb-8">
              <p className="text-[5rem] sm:text-[7rem] lg:text-[9rem] font-medium tracking-tighter leading-[0.85]" style={{ color: netBalance >= 0 ? '#10B981' : '#E11D48', textShadow: netBalance >= 0 ? '0 0 30px rgba(16, 185, 129, 0.2)' : '0 0 30px rgba(225, 29, 72, 0.2)' }}>
                {netBalance >= 0 ? "" : "-"}{formatNumber(Math.abs(netBalance))}
              </p>
              <span className="text-xl sm:text-2xl mt-4 font-medium text-zinc-600 tracking-tight" style={{ textShadow: '0 0 12px rgba(0, 0, 0, 0.3)' }}>{userCountry?.currency || '...'}</span>
            </div>

            <div className="flex items-center gap-12 text-sm border-t border-[var(--border)] pt-8 w-max">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#10B981', textShadow: '0 0 10px rgba(16, 185, 129, 0.35)' }}>Inflow</span>
                <span className="text-2xl font-semibold tracking-tight" style={{ color: '#10B981', textShadow: '0 0 14px rgba(16, 185, 129, 0.3)' }}>
                  {!userCountry ? "..." : formatNumber(totalIncomeLocal)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#E11D48', textShadow: '0 0 10px rgba(225, 29, 72, 0.35)' }}>Outflow</span>
                <span className="text-2xl font-semibold tracking-tight" style={{ color: '#E11D48', textShadow: '0 0 14px rgba(225, 29, 72, 0.3)' }}>
                  {!userCountry ? "..." : formatNumber(totalExpenseLocal)}
                </span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Bento Grid Layout Below Hero */}

        {/* Left Column: Transaction List */}
        <section className="lg:col-span-7 space-y-6 z-10">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:px-8 sm:py-6 backdrop-blur-xl h-[520px] flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-[var(--muted)]" />
                <h2 className="text-lg font-medium text-[var(--foreground)] tracking-tight">
                  {isToday ? "Activity" : `Ledger: ${selectedDate.toLocaleDateString("en-US", { day: "numeric", month: "long" })}`}
                </h2>
              </div>
              {filteredTransactions.length > 0 && (
                <span className="text-xs tracking-widest uppercase text-[var(--muted)] bg-black/[0.03] px-3 py-1.5 rounded-full">
                  {filteredTransactions.length} Record{filteredTransactions.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="space-y-1 flex-1 overflow-hidden">
              <AnimatePresence>
                {filteredTransactions.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-16 text-center"
                  >
                    <p className="text-sm text-[var(--muted)] tracking-tight font-light">No financial activity recorded.</p>
                  </motion.div>
                ) : (
                  filteredTransactions.slice(0, 4).map((txn, i) => (
                    <motion.div
                      key={txn.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.5 }}
                      className="group flex items-center justify-between py-4 px-3 hover:bg-[var(--border)] rounded-2xl transition-all cursor-default"
                    >
                      <div className="flex items-center gap-5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black/[0.02] group-hover:bg-[var(--border)] transition-colors border border-[var(--border)]">
                          {txn.type === "income" ? (
                            <ArrowDownRight className="w-4 h-4 text-[var(--accent-income)]" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-[var(--accent-expense)]" />
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-medium tracking-tight text-[var(--foreground)] group-hover:text-[var(--foreground)] transition-colors">{txn.category || "Transaction"}</p>
                          <p className="text-sm text-[var(--muted)] mt-1 tracking-tight font-light">
                            {formatDate(txn.date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className={`text-xl font-medium tabular-nums tracking-tight ${txn.type === "income" ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                          {txn.type === "income" ? "+" : "-"}
                          {Intl.NumberFormat('en-US', { style: 'currency', currency: targetCurrencyCode }).format(getNetValue(txn))}
                        </p>
                        {(() => {
                          const orig = getOriginalCurrency(txn);
                          if (orig) return (
                            <p className="text-xs text-[var(--muted)] mt-1 tracking-wide font-medium">
                              {zeroDecimalCurrencies.includes(orig.currency) ? orig.amount.toFixed(0) : orig.amount.toFixed(2)} {orig.currency} · {orig.rate}
                            </p>
                          );
                          return null;
                        })()}
                        {Number(txn.amount_usd) > 0 && (Number(txn.platform_fee_usd) + Number(txn.withdrawal_fee_usd)) > 0 && (
                          <p className="text-[11px] text-[var(--muted)] mt-1 uppercase tracking-widest font-medium">
                            Fee: ${(Number(txn.platform_fee_usd) + Number(txn.withdrawal_fee_usd)).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* View History Button */}
            {filteredTransactions.length > 4 && (
              <div className="pt-3 border-t border-[var(--border)] mt-auto">
                <button
                  onClick={() => { setShowHistoryModal(true); setHistoryPage(1); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-medium tracking-widest uppercase text-[var(--muted)] hover:text-[var(--foreground)] transition-colors rounded-2xl hover:bg-[var(--border)]"
                >
                  <Clock className="w-3.5 h-3.5" />
                  View History ({filteredTransactions.length - 4} more)
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Command Center */}
        <section className="lg:col-span-5 space-y-6 z-10 flex flex-col relative w-full items-end lg:items-center">

          {/* Floating Magnetic Calendar Trigger */}
          <div className="absolute -top-6 right-0 lg:-top-6 lg:-right-6 z-50">
            <MagneticCalendarTrigger
              date={selectedDate}
              onClick={() => setIsCalendarOpen(true)}
              isActive={isCalendarOpen}
            />
          </div>

          {/* AI Command Center */}
          {isToday ? (
            <div className="w-full h-[520px] shrink-0">
              <ChatInterface
                key={`chat-${userCountry?.currency || 'PKR'}`}
                user={user}
                userCountry={userCountry}
                onLoginRequest={() => setShowLogin(true)}
                onTransactionSaved={() => {
                  if (user) fetchProfileAndTransactions(user);
                }}
              />
            </div>
          ) : (
            <div className="w-full h-[540px] shrink-0 bg-[var(--surface)]/40 backdrop-blur-2xl border border-[var(--border)] rounded-3xl p-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-black/5 border border-black/10 flex items-center justify-center mb-4">
                <Activity className="w-5 h-5 text-[var(--muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--foreground)] tracking-tight">Viewing archived ledger</p>
              <p className="text-xs text-[var(--muted)] mt-2 font-light max-w-[200px]">New entries can only be logged in the active daily ledger.</p>
              <button
                onClick={() => {
                  const d = new Date();
                  d.setHours(0, 0, 0, 0);
                  setSelectedDate(d);
                }}
                className="mt-6 text-xs font-medium tracking-wide uppercase px-6 py-3 rounded-full bg-[var(--foreground)] text-[var(--surface)] hover:bg-zinc-200 transition-colors"
              >
                Return to Active Ledger
              </button>
            </div>
          )}

        </section>

      </main>

      {/* History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryModal(false)}
              className="absolute inset-0 bg-[var(--surface)]/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[var(--surface)] border border-black/10 rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[var(--muted)]" />
                  <h3 className="text-sm font-medium tracking-wide text-[var(--foreground)] uppercase">Transaction History</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--muted)] tracking-wide">
                    Page {historyPage} of {Math.ceil(filteredTransactions.length / HISTORY_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="p-2 rounded-full hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {filteredTransactions
                  .slice((historyPage - 1) * HISTORY_PER_PAGE, historyPage * HISTORY_PER_PAGE)
                  .map((txn) => (
                    <div
                      key={txn.id}
                      className="group flex items-center justify-between py-4 px-4 hover:bg-[var(--border)] rounded-2xl transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-black/[0.02] border border-[var(--border)]">
                          {txn.type === "income" ? (
                            <ArrowDownRight className="w-3.5 h-3.5 text-[var(--accent-income)]" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--accent-expense)]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium tracking-tight text-[var(--foreground)]">{txn.category || "Transaction"}</p>
                          <p className="text-xs text-[var(--muted)] mt-0.5 tracking-tight font-light">
                            {formatDate(txn.date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className={`text-base font-medium tabular-nums tracking-tight ${txn.type === "income" ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                          {txn.type === "income" ? "+" : "-"}
                          {Intl.NumberFormat('en-US', { style: 'currency', currency: targetCurrencyCode }).format(getNetValue(txn))}
                        </p>
                        {(() => {
                          const orig = getOriginalCurrency(txn);
                          if (orig) return (
                            <p className="text-[11px] text-[var(--muted)] mt-1 tracking-wide font-medium">
                              {zeroDecimalCurrencies.includes(orig.currency) ? orig.amount.toFixed(0) : orig.amount.toFixed(2)} {orig.currency} · {orig.rate}
                            </p>
                          );
                          return null;
                        })()}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Pagination Controls */}
              {Math.ceil(filteredTransactions.length / HISTORY_PER_PAGE) > 1 && (
                <div className="p-4 border-t border-[var(--border)] flex items-center justify-between">
                  <button
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-2 rounded-xl hover:bg-[var(--border)]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(filteredTransactions.length / HISTORY_PER_PAGE) }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setHistoryPage(i + 1)}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${historyPage === i + 1
                          ? 'bg-[var(--foreground)] text-[var(--surface)]'
                          : 'text-[var(--muted)] hover:bg-[var(--border)]'
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setHistoryPage(p => Math.min(Math.ceil(filteredTransactions.length / HISTORY_PER_PAGE), p + 1))}
                    disabled={historyPage === Math.ceil(filteredTransactions.length / HISTORY_PER_PAGE)}
                    className="flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-2 rounded-xl hover:bg-[var(--border)]"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
