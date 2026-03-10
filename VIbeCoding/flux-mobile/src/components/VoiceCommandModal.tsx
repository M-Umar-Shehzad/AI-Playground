import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedProps, withRepeat, withTiming, Easing, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse, Filter, FeGaussianBlur } from 'react-native-svg';

const AnimatedRadialGradient = Animated.createAnimatedComponent(RadialGradient);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
import { X, Check, RotateCcw } from 'lucide-react-native';

interface VoiceCommandModalProps {
    visible: boolean;
    onClose: () => void;
    onSend: (text: string) => void;
    userCountry?: { name: string; currency: string } | null;
}

export default function VoiceCommandModal({ visible, onClose, onSend, userCountry }: VoiceCommandModalProps) {
    const [state, setState] = useState<'idle' | 'listening' | 'review' | 'processing'>('idle');
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const recordingRef = useRef<Audio.Recording | null>(null);
    const [text, setText] = useState('');
    const inputRef = useRef<TextInput>(null);

    // Silence Detection
    const [shouldStop, setShouldStop] = useState(false);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSpeakingRef = useRef<boolean>(false);

    // Live Web Speech API (Option A)
    const recognitionRef = useRef<any>(null);
    const [isHealed, setIsHealed] = useState(false);
    const [recoveryCount, setRecoveryCount] = useState(0);
    const [retryTrigger, setRetryTrigger] = useState(0);

    // Orb Animation Values
    const scale = useSharedValue(0.95);
    const rotation = useSharedValue(0);
    const opacity = useSharedValue(0.8);

    // Liquid morphing value (0 to 1 back to 0)
    const morph = useSharedValue(0);

    // Start recording when opened
    useEffect(() => {
        if (!visible) {
            if (recording) {
                recording.stopAndUnloadAsync().catch(console.error);
                setRecording(null);
            }
            return;
        }

        // Reset state
        setState('idle');
        setText('Initializing...');
        setIsHealed(false);
        setShouldStop(false);
        isSpeakingRef.current = false;
        setRecoveryCount(0);
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

        // Cleanup any dangling recordings before doing anything
        if (recordingRef.current) {
            recordingRef.current.stopAndUnloadAsync().catch(() => { });
            recordingRef.current = null;
        }

        // Start idle breathing while initializing
        scale.value = withRepeat(withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
        rotation.value = withRepeat(withTiming(360, { duration: 25000, easing: Easing.linear }), -1, false);
        morph.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true);

        const initSpeechRecognition = () => {
            if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
                const SpeechRecognition = (window as any).webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;

                const langCode = userCountry?.name === 'Pakistan' ? 'ur-PK' : 'en-US';
                recognition.lang = langCode;

                recognition.onstart = () => { };

                recognition.onresult = (event: any) => {
                    if (isHealed) return;

                    let interimTranscript = '';
                    let finalTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript;
                        } else {
                            interimTranscript += transcript;
                        }
                    }

                    const currentLiveText = finalTranscript || interimTranscript;
                    if (currentLiveText.trim()) {
                        setText(currentLiveText);
                    }
                };

                recognition.onerror = (event: any) => {
                    // Senior Architect Fix: "Silent UX" - we log locally but avoid triggering RedBox/LogBox

                    // Recovery for Network/Aborted
                    if ((event.error === 'network' || event.error === 'aborted') && recoveryCount < 5) {
                        setRecoveryCount(prev => prev + 1);
                        setTimeout(() => {
                            if (state === 'listening') {
                                try { recognition.start(); } catch (e) { }
                            }
                        }, 500);
                    }
                };

                recognition.onend = () => {
                    if (state === 'listening' && recoveryCount < 5) {
                        try { recognition.start(); } catch (e) { }
                    }
                };

                recognitionRef.current = recognition;
            }
        };

        initSpeechRecognition();

        // Request permission and start listening
        (async () => {
            try {
                const { status } = await Audio.requestPermissionsAsync();
                if (status === 'granted') {
                    // Cleanup again just in case async overlap
                    if (recordingRef.current) {
                        await recordingRef.current.stopAndUnloadAsync().catch(() => { });
                        recordingRef.current = null;
                    }

                    // Senior Audit: Hardening Audio Mode for maximal fidelity
                    await Audio.setAudioModeAsync({
                        allowsRecordingIOS: true,
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: false,
                        shouldDuckAndroid: true,
                    });

                    const { recording } = await Audio.Recording.createAsync(
                        {
                            ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                            // Ensure 44.1kHz or higher for Gemini forensic pass
                            android: {
                                ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
                                sampleRate: 44100,
                            },
                            ios: {
                                ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
                                sampleRate: 44100,
                            },
                        },
                        (status) => {
                            if (status.isRecording && status.metering !== undefined) {
                                const db = status.metering;
                                // Phase 15 Reverted: AI requires loud/clear audio (-35dB) to reliably hear the terminal 'k'
                                if (db > -35) {
                                    isSpeakingRef.current = true;
                                    if (silenceTimeoutRef.current) {
                                        clearTimeout(silenceTimeoutRef.current);
                                        silenceTimeoutRef.current = null;
                                    }
                                } else if (isSpeakingRef.current) {
                                    if (!silenceTimeoutRef.current) {
                                        silenceTimeoutRef.current = setTimeout(() => {
                                            setShouldStop(true);
                                        }, 1800);
                                    }
                                }
                            }
                        },
                        100
                    );
                    recordingRef.current = recording;
                    setRecording(recording);
                    setState('listening');
                    setText('');

                    if (recognitionRef.current) {
                        try {
                            recognitionRef.current.start();
                        } catch (e) {
                            console.warn("Live Speech failed to start", e);
                        }
                    }

                    scale.value = withRepeat(withTiming(1.2, { duration: 500, easing: Easing.inOut(Easing.ease) }), -1, true);
                    morph.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }), -1, true);
                    rotation.value = withRepeat(withTiming(360, { duration: 8000, easing: Easing.linear }), -1, false);
                } else {
                    setText('Microphone permission denied.');
                    setState('review');
                }
            } catch (err) {
                console.error('Failed to start recording', err);
                setText('Error starting microphone');
                setState('review');
            }
        })();

        return () => {
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.onend = null;
                    recognitionRef.current.stop();
                } catch (e) { }
            }
            if (recordingRef.current) {
                recordingRef.current.stopAndUnloadAsync().catch(() => { });
                recordingRef.current = null;
            }
        };
    }, [visible, retryTrigger]);

    useEffect(() => {
        if (state === 'review') {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [state]);

    useEffect(() => {
        if (shouldStop && state === 'listening') {
            stopRecording();
            setShouldStop(false);
        }
    }, [shouldStop, state]);

    const stopRecording = async () => {
        if (state !== 'listening') return;
        setState('processing');

        scale.value = withRepeat(withTiming(1.02, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true);
        morph.value = withRepeat(withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) }), -1, true);
        rotation.value = withRepeat(withTiming(360, { duration: 25000, easing: Easing.linear }), -1, false);

        if (recognitionRef.current) {
            try {
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
            } catch (e) { }
        }

        const currentRec = recordingRef.current || recording;
        if (currentRec) {
            try {
                await currentRec.stopAndUnloadAsync();
                const uri = currentRec.getURI();
                setRecording(null);
                recordingRef.current = null;

                if (uri) {
                    await processAudio(uri);
                } else {
                    setState('review');
                }
            } catch (error) {
                console.error('[Senior Audit] Stop recording failure:', error);
                setState('review');
            }
        }
    };

    const processAudio = async (uri: string) => {
        try {
            const formData = new FormData();

            if (Platform.OS === 'web') {
                const audioBlobResponse = await fetch(uri);
                const rawBlob = await audioBlobResponse.blob();
                const fileBlob = new File([rawBlob], 'audio.webm', { type: 'audio/webm' });
                formData.append('file', fileBlob);
            } else {
                formData.append('file', {
                    uri,
                    name: 'audio.m4a',
                    type: 'audio/m4a'
                } as any);
            }

            if (userCountry?.name) {
                formData.append('country', userCountry.name);
            }

            let endpoint = '/api/transcribe';
            let hostUrl = 'http://localhost:8081';

            // Priority 1: Use explicit environment API URL (routes to Next.js on 3000)
            if (process.env.EXPO_PUBLIC_API_URL) {
                hostUrl = process.env.EXPO_PUBLIC_API_URL;
            }
            // Priority 2: Fallback to local Expo host (for purely mobile native testing)
            else if (Constants.expoConfig?.hostUri) {
                hostUrl = `http://${Constants.expoConfig.hostUri}`;
            }

            endpoint = `${hostUrl}/api/transcribe`;

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Transcription API returned error');

            const data = await response.json();
            const transcribed = data.text || '';

            if (transcribed && transcribed !== 'EMPTY') {
                setText(transcribed);
            }
            setIsHealed(true);

        } catch (error) {
            console.error('Transcription upload error', error);
        } finally {
            setState('review');
        }
    };

    const handleSend = () => {
        if (!text.trim()) return;
        setState('processing');
        scale.value = withSpring(0.5);

        setTimeout(() => {
            onSend(text.trim());
            onClose();
        }, 800);
    };

    const orbStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` }
        ],
        opacity: opacity.value
    }));

    const baseGradientProps = useAnimatedProps(() => {
        const rx = 50 + (morph.value * 2);
        const cx = 50 + (morph.value * 3);
        const cy = 50 - (morph.value * 3);
        return {
            rx: `${rx}%`,
            ry: `${rx}%`,
            cx: `${cx}%`,
            cy: `${cy}%`,
            fx: `${cx}%`,
            fy: `${cy}%`,
        };
    });

    const highlightProps = useAnimatedProps(() => {
        const cx = 50 - (morph.value * 5);
        const cy = 50 - (morph.value * 5);
        const rx = 60 + (morph.value * 3);
        return {
            rx: `${rx}%`,
            ry: `${rx}%`,
            cx: `${cx}%`,
            cy: `${cy}%`,
            fx: `${cx}%`,
            fy: `${cy}%`,
        };
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <BlurView intensity={70} tint="dark" className="flex-1 justify-between px-6 pt-20 pb-12">

                        {/* Top Context */}
                        <View className="items-center gap-1">
                            <Text className={`tracking-widest uppercase font-bold text-base transition-all ${state === 'listening' ? 'text-white/90' : 'text-white/50'} mb-1`}>
                                {state === 'idle' ? 'STANDBY' :
                                    state === 'listening' ? 'LISTENING...' :
                                        state === 'processing' ? 'LOADING...' :
                                            isHealed ? 'FINALIZED' : 'DRAFT'}
                            </Text>
                            {state === 'listening' && (
                                <Text className="text-white/40 text-xs uppercase font-medium tracking-widest mt-1">(Tap orb to stop)</Text>
                            )}
                        </View>

                        {/* Centered Orb Visualizer */}
                        <TouchableOpacity
                            className="flex-1 items-center justify-center"
                            activeOpacity={state === 'listening' ? 0.8 : 1}
                            onPress={state === 'listening' ? stopRecording : undefined}
                        >
                            <Animated.View
                                style={[orbStyle, { width: 400, height: 400, alignItems: 'center', justifyContent: 'center' }]}
                            >
                                <Svg height="400" width="400" viewBox="0 0 400 400" style={{ overflow: 'visible' }}>
                                    <Defs>
                                        <AnimatedRadialGradient id="gradBase" gradientUnits="userSpaceOnUse" animatedProps={baseGradientProps}>
                                            <Stop offset="0%" stopColor="#d946ef" stopOpacity="0.95" />
                                            <Stop offset="30%" stopColor="#06b6d4" stopOpacity="0.85" />
                                            <Stop offset="60%" stopColor="#34d399" stopOpacity="0.5" />
                                            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                                        </AnimatedRadialGradient>
                                        <AnimatedRadialGradient id="gradAccent" gradientUnits="userSpaceOnUse" animatedProps={highlightProps}>
                                            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                                            <Stop offset="80%" stopColor="#ffffff" stopOpacity="0" />
                                        </AnimatedRadialGradient>
                                        <Filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
                                            <FeGaussianBlur stdDeviation="20" result="coloredBlur" />
                                        </Filter>
                                    </Defs>
                                    <AnimatedCircle cx="200" cy="200" r="110" fill="url(#gradBase)" filter="url(#blur)" />
                                    <AnimatedCircle cx="200" cy="200" r="110" fill="url(#gradAccent)" filter="url(#blur)" />
                                </Svg>
                            </Animated.View>
                        </TouchableOpacity>

                        {/* Bottom Controls */}
                        <View className="w-full gap-8">
                            <View className="bg-surface/90 border border-border rounded-3xl p-4 shadow-2xl relative overflow-hidden">
                                <TextInput
                                    ref={inputRef}
                                    value={text}
                                    onChangeText={setText}
                                    multiline
                                    className="text-foreground text-lg leading-7 font-light tracking-wide min-h-[50px] max-h-[120px]"
                                    placeholder={state === 'listening' ? "Listening..." : "Say something..."}
                                    placeholderTextColor="#52525B"
                                    textAlignVertical="top"
                                    style={{ outlineStyle: 'none' } as any}
                                    editable={state === 'review'}
                                    autoFocus={state === 'review'}
                                    onFocus={(e) => {
                                        // Auto-move cursor to the end
                                        const length = text.length;
                                        if (Platform.OS === 'web') {
                                            const target = e.nativeEvent.target as any;
                                            if (target && target.setSelectionRange) {
                                                target.setSelectionRange(length, length);
                                            }
                                        }
                                    }}
                                />
                            </View>

                            {/* Circular Action Buttons */}
                            <View className="flex-row justify-center items-center gap-8 mb-4">
                                {/* Cancel Button */}
                                <TouchableOpacity
                                    onPress={onClose}
                                    disabled={state === 'processing'}
                                    activeOpacity={0.7}
                                    className="w-14 h-14 rounded-full bg-surface border border-border items-center justify-center shadow-lg"
                                >
                                    <X size={24} color="#ef4444" />
                                </TouchableOpacity>

                                {/* Retake Button (Shows only in review mode) */}
                                {state === 'review' && (
                                    <TouchableOpacity
                                        onPress={() => setRetryTrigger(prev => prev + 1)}
                                        activeOpacity={0.7}
                                        className="w-14 h-14 rounded-full bg-surface border border-border items-center justify-center shadow-lg"
                                    >
                                        <RotateCcw size={22} color="#34d399" />
                                    </TouchableOpacity>
                                )}

                                {/* Send Button */}
                                {state === 'processing' ? (
                                    <View className="w-16 h-16 rounded-full bg-foreground items-center justify-center shadow-lg shadow-black/50">
                                        <ActivityIndicator color="#111111" size="small" />
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={handleSend}
                                        disabled={state !== 'review' || !text.trim()}
                                        activeOpacity={0.8}
                                        className={`w-16 h-16 rounded-full items-center justify-center shadow-lg shadow-black/50 transition-colors duration-300 ${state === 'review' && text.trim() ? 'bg-foreground' : 'bg-surface border border-border opacity-50'}`}
                                    >
                                        <Check size={28} color={state === 'review' && text.trim() ? '#111111' : '#a1a1aa'} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </BlurView>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
