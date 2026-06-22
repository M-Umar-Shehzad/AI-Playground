import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import '../global.css';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../src/lib/supabase';
import { useStore } from '../src/store/useStore';
import { Platform } from 'react-native';

export default function RootLayout() {
    const { session, setSession } = useStore();
    const { colorScheme } = useColorScheme();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const inAuthGroup = segments[0] === '(auth)';

        if (session && inAuthGroup) {
            // Redirect away from the sign-in page if already logged in.
            router.replace('/(tabs)');
        }
    }, [session, segments]);

    // DOM Theme Syncer
    // NativeWind secretly relies on the 'dark' class being present on the HTML element.
    // Expo-Router has a bug where navigating completely destroys and replaces the root tree on web, 
    // severing NativeWind's class injection. This hook acts as a universal router-guard: we listen
    // to every single navigation change (segments) and aggressively re-inject the memory state back onto the DOM.
    useEffect(() => {
        if (Platform.OS === 'web') {
            if (colorScheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }, [colorScheme, segments]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            </Stack>
        </GestureHandlerRootView>
    );
}
