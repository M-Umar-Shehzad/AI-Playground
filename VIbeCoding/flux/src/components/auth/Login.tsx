"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface LoginProps {
    onCancel?: () => void;
}

export default function Login({ onCancel }: LoginProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setMessage(error.message);
        } else {
            setMessage("Authentication successful.");
        }
        setLoading(false);
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        if (password.length < 6) {
            setMessage("Security requirement: Password must be at least 6 characters.");
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setMessage(error.message);
        } else {
            setMessage("Profile initialized. You may now authenticate.");
            setMode("signin");
        }
        setLoading(false);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        if (!email) {
            setMessage("Email address required for recovery.");
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            setMessage(error.message);
        } else {
            setMessage("If verified, a recovery sequence has been dispatched to your inbox.");
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) setMessage(error.message);
        setLoading(false);
    };

    const isSignIn = mode === "signin";
    const isForgot = mode === "forgot";

    return (
        <div className="flex border-none min-h-screen bg-transparent z-50 fixed inset-0 overflow-hidden font-sans">
            {/* Left Panel: Visual Mesh / Brand */}
            <div className="hidden lg:flex w-1/2 relative bg-white/50 items-center justify-center p-16 overflow-hidden">
                {/* Abstract Shifting Mesh Gradient */}
                <div className="absolute inset-0 z-0 opacity-40">
                    <motion.div
                        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-1/4 -left-1/4 w-[120%] h-[120%] bg-gradient-radial from-[#111111] via-[#050505] to-transparent rounded-full blur-[100px]"
                    />
                    <motion.div
                        animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        className="absolute -bottom-1/4 -right-1/4 w-[100%] h-[100%] bg-gradient-radial from-[#18181A] via-transparent to-transparent rounded-full blur-[120px]"
                    />
                    {/* Subtle noise texture overlay */}
                    <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                </div>

                <div className="relative z-10 max-w-xl space-y-8">
                    <h1 className="text-5xl lg:text-6xl font-medium tracking-tighter text-[var(--foreground)] leading-[1.05]">
                        Master your capital.<br />Command your wealth.
                    </h1>
                    <p className="text-[var(--muted)] text-lg tracking-tight max-w-md font-light leading-relaxed">
                        Flux provides an uncompromising view of your financial landscape. Designed for those who demand precision, elegance, and absolute control.
                    </p>
                </div>

                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="absolute top-12 left-12 flex items-center gap-3 text-sm font-medium tracking-tight text-[var(--muted)] hover:text-[var(--foreground)] transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Return to Hub</span>
                    </button>
                )}
            </div>

            {/* Right Panel: Hyper-minimalist Form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-8 sm:p-12 lg:p-24 relative bg-[var(--surface)]">
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="lg:hidden absolute top-8 left-8 flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                    </button>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-sm space-y-12"
                >
                    <div>
                        <h2 className="text-3xl font-medium tracking-tight text-[var(--foreground)]">
                            {isForgot ? "Recover Access" : (isSignIn ? "Authenticate" : "Initialize Profile")}
                        </h2>
                        <p className="mt-3 text-sm text-[var(--muted)] tracking-tight">
                            {isForgot
                                ? "Enter your registered address to receive a recovery protocol."
                                : (isSignIn
                                    ? "Securely access your financial command center."
                                    : "Establish your secure credentials to begin tracking."
                                )}
                        </p>
                    </div>

                    <div className="space-y-8">
                        {!isForgot && (
                            <div className="space-y-6">
                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="relative flex w-full items-center justify-center gap-3 rounded-none border border-black/10 bg-[var(--surface)] px-4 py-3.5 text-sm font-medium text-zinc-700 hover:text-[var(--foreground)] hover:bg-black/5 focus:outline-none transition-all duration-300"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="currentColor" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
                                    </svg>
                                    Continue with Google
                                </button>

                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-px bg-zinc-900"></div>
                                    <span className="text-[10px] uppercase tracking-widest text-zinc-400">or use email</span>
                                    <div className="flex-1 h-px bg-zinc-900"></div>
                                </div>
                            </div>
                        )}

                        <form className="space-y-6" onSubmit={isForgot ? handleResetPassword : (isSignIn ? handleSignIn : handleSignUp)}>
                            <div className="relative group">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="peer block w-full appearance-none border-0 border-b border-zinc-200 bg-transparent px-0 py-3 text-base text-zinc-200 focus:border-white focus:outline-none focus:ring-0 focus:shadow-[0_4px_24px_rgba(255,255,255,0.02)] transition-all duration-300 placeholder-transparent"
                                    placeholder="name@example.com"
                                />
                                <label
                                    htmlFor="email"
                                    className="absolute left-0 top-3 -z-10 origin-[0] -translate-y-7 scale-75 transform text-sm text-zinc-500 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-7 peer-focus:scale-75 peer-focus:text-zinc-400"
                                >
                                    Corporate / Personal Email
                                </label>
                            </div>

                            {!isForgot && (
                                <div className="relative group pt-2">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="peer block w-full appearance-none border-0 border-b border-zinc-200 bg-transparent px-0 py-3 text-base text-zinc-200 focus:border-white focus:outline-none focus:ring-0 focus:shadow-[0_4px_24px_rgba(255,255,255,0.02)] transition-all duration-300 placeholder-transparent"
                                        placeholder="Secure Passphrase"
                                    />
                                    <label
                                        htmlFor="password"
                                        className="absolute left-0 top-5 -z-10 origin-[0] -translate-y-7 scale-75 transform text-sm text-zinc-500 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-7 peer-focus:scale-75 peer-focus:text-zinc-400"
                                    >
                                        Secure Passphrase
                                    </label>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative flex w-full justify-between items-center rounded-none bg-white px-5 py-3.5 text-sm font-medium text-black hover:bg-zinc-200 focus:outline-none disabled:opacity-50 transition-colors"
                                >
                                    <span>
                                        {loading
                                            ? (isForgot ? "Transmitting..." : (isSignIn ? "Authenticating..." : "Initializing..."))
                                            : (isForgot ? "Dispatch Recovery Protocol" : (isSignIn ? "Authorize Sequence" : "Initialize Credentials"))}
                                    </span>
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between mt-6 text-xs font-medium tracking-wide text-zinc-500">
                                {isSignIn ? (
                                    <>
                                        <button type="button" onClick={() => { setMode("signup"); setMessage(""); }} className="hover:text-zinc-700 transition-colors">
                                            NEW PROFILE
                                        </button>
                                        <button type="button" onClick={() => { setMode("forgot"); setMessage(""); }} className="hover:text-zinc-700 transition-colors">
                                            RECOVER ACCESS
                                        </button>
                                    </>
                                ) : isForgot ? (
                                    <button type="button" onClick={() => { setMode("signin"); setMessage(""); }} className="hover:text-zinc-700 transition-colors">
                                        RETURN TO AUTH
                                    </button>
                                ) : (
                                    <button type="button" onClick={() => { setMode("signin"); setMessage(""); }} className="hover:text-zinc-700 transition-colors">
                                        EXISTING PROFILE
                                    </button>
                                )}
                            </div>
                        </form>

                        <div className="h-6 mt-4">
                            <AnimatePresence>
                                {message && (
                                    <motion.p
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={`text-xs tracking-tight ${msgColor(message)}`}
                                    >
                                        {message}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function msgColor(msg: string) {
    if (msg.includes("successful") || msg.includes("Profile") || msg.includes("sequence")) return "text-[var(--accent-income)]";
    return "text-[var(--accent-expense)]";
}
