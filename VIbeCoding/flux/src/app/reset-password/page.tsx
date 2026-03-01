"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function ResetPassword() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setMessage("Invalid or expired reset link. Please request a new one.");
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setMessage("Please enter your new passphrase.");
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        if (password.length < 6) {
            setMessage("Security requirement: Passphrase must be at least 6 characters.");
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setMessage("Error: Passphrases do not match.");
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({
            password: password,
        });

        if (error) {
            setMessage(error.message);
        } else {
            setMessage("Credentials securely updated. Redirecting to Hub...");
            setTimeout(() => {
                router.push("/");
            }, 2000);
        }
        setLoading(false);
    };

    function msgColor(msg: string) {
        if (msg.includes("successfully") || msg.includes("updated") || msg.includes("enter")) return "text-[var(--accent-income)]";
        return "text-[var(--accent-expense)]";
    }

    return (
        <div className="flex border-none min-h-screen bg-[linear-gradient(to_bottom,var(--background-top),var(--background-bottom))] z-50 fixed inset-0 overflow-hidden font-sans">
            {/* Left Panel: Visual Mesh / Brand */}
            <div className="hidden lg:flex w-1/2 relative bg-transparent items-center justify-center p-16 overflow-hidden">
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
                        Reestablish Control.<br />Secure your access.
                    </h1>
                    <p className="text-[var(--muted)] text-lg tracking-tight max-w-md font-light leading-relaxed">
                        Update your credentials to regain access to your financial command center. Precision and security, fully restored.
                    </p>
                </div>

                <button
                    onClick={() => router.push("/")}
                    className="absolute top-12 left-12 flex items-center gap-3 text-sm font-medium tracking-tight text-[var(--muted)] hover:text-[var(--foreground)] transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Return to Hub</span>
                </button>
            </div>

            {/* Right Panel: Hyper-minimalist Form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-8 sm:p-12 lg:p-24 relative bg-[var(--surface)]">
                <button
                    onClick={() => router.push("/")}
                    className="lg:hidden absolute top-8 left-8 flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-sm space-y-12"
                >
                    <div>
                        <h2 className="text-3xl font-medium tracking-tight text-[var(--foreground)]">
                            Reset Passphrase
                        </h2>
                        <p className="mt-3 text-sm text-[var(--muted)] tracking-tight">
                            Establish your new secure credentials below.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <form className="space-y-8" onSubmit={handleReset}>
                            <div className="relative group">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="peer block w-full appearance-none border-0 border-b border-zinc-200 bg-transparent px-0 py-3 text-base text-zinc-200 focus:border-white focus:outline-none focus:ring-0 focus:shadow-[0_4px_24px_rgba(255,255,255,0.02)] transition-all duration-300 placeholder-transparent"
                                    placeholder="New Secure Passphrase"
                                />
                                <label
                                    htmlFor="password"
                                    className="absolute left-0 top-3 -z-10 origin-[0] -translate-y-7 scale-75 transform text-sm text-zinc-500 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-7 peer-focus:scale-75 peer-focus:text-zinc-400"
                                >
                                    New Secure Passphrase
                                </label>
                            </div>

                            <div className="relative group pt-2">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="peer block w-full appearance-none border-0 border-b border-zinc-200 bg-transparent px-0 py-3 text-base text-zinc-200 focus:border-white focus:outline-none focus:ring-0 focus:shadow-[0_4px_24px_rgba(255,255,255,0.02)] transition-all duration-300 placeholder-transparent"
                                    placeholder="Confirm Passphrase"
                                />
                                <label
                                    htmlFor="confirmPassword"
                                    className="absolute left-0 top-5 -z-10 origin-[0] -translate-y-7 scale-75 transform text-sm text-zinc-500 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-7 peer-focus:scale-75 peer-focus:text-zinc-400"
                                >
                                    Confirm Passphrase
                                </label>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative flex w-full justify-between items-center rounded-none bg-white px-5 py-3.5 text-sm font-medium text-black hover:bg-zinc-200 focus:outline-none disabled:opacity-50 transition-colors"
                                >
                                    <span>
                                        {loading ? "Reconfiguring..." : "Confirm Update"}
                                    </span>
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </button>
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
