import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

type AuthMode = 'signin' | 'signup' | 'forgot';

function msgColor(msg: string): string {
    if (msg.includes('successful') || msg.includes('Profile') || msg.includes('dispatched') || msg.includes('initialized')) return '#10B981';
    return '#E11D48';
}

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [mode, setMode] = useState<AuthMode>('signin');

    const isSignIn = mode === 'signin';
    const isForgot = mode === 'forgot';

    const handleSignIn = async () => {
        setLoading(true);
        setMessage('');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setMessage(error.message);
        } else {
            setMessage('Authentication successful.');
            router.replace('/(tabs)');
        }
        setLoading(false);
    };

    const handleSignUp = async () => {
        setLoading(true);
        setMessage('');
        if (password.length < 6) {
            setMessage('Security requirement: Password must be at least 6 characters.');
            setLoading(false);
            return;
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            setMessage(error.message);
        } else {
            setMessage('Profile initialized. You may now authenticate.');
            setMode('signin');
        }
        setLoading(false);
    };

    const handleResetPassword = async () => {
        setLoading(true);
        setMessage('');
        if (!email) {
            setMessage('Email address required for recovery.');
            setLoading(false);
            return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) {
            setMessage(error.message);
        } else {
            setMessage('If verified, a recovery sequence has been dispatched to your inbox.');
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setMessage('');
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: Platform.OS === 'web' ? window.location.origin : undefined }
        });
        if (error) {
            setMessage(error.message);
        } else if (data?.url) {
            Linking.openURL(data.url);
        }
        setLoading(false);
    };

    const handleSubmit = isForgot ? handleResetPassword : (isSignIn ? handleSignIn : handleSignUp);

    const getButtonLabel = () => {
        if (loading) {
            if (isForgot) return 'Transmitting...';
            return isSignIn ? 'Authenticating...' : 'Initializing...';
        }
        if (isForgot) return 'Dispatch Recovery Protocol';
        return isSignIn ? 'Authorize Sequence' : 'Initialize Credentials';
    };

    const getTitle = () => {
        if (isForgot) return 'Recover Access';
        return isSignIn ? 'Authenticate' : 'Initialize Profile';
    };

    const getSubtitle = () => {
        if (isForgot) return 'Enter your registered address to receive a recovery protocol.';
        return isSignIn
            ? 'Securely access your financial command center.'
            : 'Establish your secure credentials to begin tracking.';
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-background"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <View className="flex-1 px-8 pt-20 pb-12 justify-center">

                    {/* Back to guest */}
                    <TouchableOpacity
                        onPress={() => router.replace('/(tabs)')}
                        className="flex-row items-center gap-2 mb-12"
                    >
                        <ArrowLeft color="#A1A1AA" size={16} />
                        <Text className="text-sm text-muted font-medium tracking-tight">Return to Hub</Text>
                    </TouchableOpacity>

                    {/* Header */}
                    <View className="mb-12">
                        <Text className="text-3xl font-medium tracking-tight text-foreground mb-3">
                            {getTitle()}
                        </Text>
                        <Text className="text-sm text-muted tracking-tight font-light">
                            {getSubtitle()}
                        </Text>
                    </View>

                    {/* Form */}
                    <View className="gap-6">

                        {/* Google Sign-In — only show for signin/signup */}
                        {!isForgot && (
                            <View className="gap-5">
                                <TouchableOpacity
                                    onPress={handleGoogleLogin}
                                    disabled={loading}
                                    className="flex-row items-center justify-center gap-3 border border-border bg-surface px-4 py-4 rounded-2xl"
                                >
                                    <Svg width="18" height="18" viewBox="0 0 24 24">
                                        <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05" />
                                        <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </Svg>
                                    <Text className="text-foreground font-medium text-sm tracking-wide">
                                        Continue with Google
                                    </Text>
                                </TouchableOpacity>

                                <View className="flex-row items-center gap-4">
                                    <View className="flex-1 bg-border" style={{ height: 1 }} />
                                    <Text className="text-[10px] uppercase tracking-widest text-muted">or use email</Text>
                                    <View className="flex-1 bg-border" style={{ height: 1 }} />
                                </View>
                            </View>
                        )}

                        {/* Email */}
                        <View>
                            <Text className="text-xs uppercase tracking-widest text-muted font-medium mb-3">Email</Text>
                            <TextInput
                                className="w-full border-b border-border bg-transparent py-3 text-base text-foreground"
                                placeholder="name@example.com"
                                placeholderTextColor="#555555"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                onChangeText={setEmail}
                                value={email}
                            />
                        </View>

                        {/* Password (not for forgot) */}
                        {!isForgot && (
                            <View>
                                <Text className="text-xs uppercase tracking-widest text-muted font-medium mb-3">Password</Text>
                                <TextInput
                                    className="w-full border-b border-border bg-transparent py-3 text-base text-foreground"
                                    placeholder="••••••••"
                                    placeholderTextColor="#555555"
                                    secureTextEntry
                                    onChangeText={setPassword}
                                    value={password}
                                />
                            </View>
                        )}

                        {/* Submit */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading}
                            className="flex-row items-center justify-between bg-foreground px-5 py-4 mt-4"
                            style={{ opacity: loading ? 0.5 : 1 }}
                        >
                            <Text className="text-surface font-medium text-sm tracking-wide">
                                {getButtonLabel()}
                            </Text>
                            {!loading && <ArrowRight color="#111111" size={16} />}
                            {loading && <ActivityIndicator color="#111111" size="small" />}
                        </TouchableOpacity>

                        {/* Mode switchers */}
                        <View className="flex-row items-center justify-between mt-4">
                            {isSignIn ? (
                                <>
                                    <TouchableOpacity onPress={() => { setMode('signup'); setMessage(''); }}>
                                        <Text className="text-xs font-medium tracking-widest uppercase text-muted">New Profile</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setMode('forgot'); setMessage(''); }}>
                                        <Text className="text-xs font-medium tracking-widest uppercase text-muted">Recover Access</Text>
                                    </TouchableOpacity>
                                </>
                            ) : isForgot ? (
                                <TouchableOpacity onPress={() => { setMode('signin'); setMessage(''); }}>
                                    <Text className="text-xs font-medium tracking-widest uppercase text-muted">Return to Auth</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={() => { setMode('signin'); setMessage(''); }}>
                                    <Text className="text-xs font-medium tracking-widest uppercase text-muted">Existing Profile</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Feedback message */}
                        {message !== '' && (
                            <Text className="text-xs tracking-tight mt-2" style={{ color: msgColor(message) }}>
                                {message}
                            </Text>
                        )}

                        {/* Guest */}
                        <TouchableOpacity className="mt-6 py-3 items-center" onPress={() => router.replace('/(tabs)')}>
                            <Text className="text-muted text-xs font-medium tracking-widest uppercase">Continue as Guest</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
