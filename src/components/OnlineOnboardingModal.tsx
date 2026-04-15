import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { hasSeenOnlineOnboarding, markOnlineOnboardingSeen } from '../utils/storage';
import { AVATAR_ASSETS } from '../utils/avatarAssets';

const { width } = Dimensions.get('window');

const STEP_AVATARS = [
    // Step 1 – host alone
    ['avatar_3'],
    // Step 2 – friends joining
    ['avatar_7', 'avatar_11', 'avatar_15'],
    // Step 3 – game: one impostor highlighted
    ['avatar_5', 'avatar_9', 'avatar_2'],
];

export function OnlineOnboardingModal() {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState(0);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const ob = t.online.onboarding;

    const STEPS = [
        { emoji: ob.step1_emoji, title: ob.step1_title, desc: ob.step1_desc },
        { emoji: ob.step2_emoji, title: ob.step2_title, desc: ob.step2_desc },
        { emoji: ob.step3_emoji, title: ob.step3_title, desc: ob.step3_desc },
    ];
    const isLast = step === STEPS.length - 1;

    useEffect(() => {
        hasSeenOnlineOnboarding().then(seen => {
            if (!seen) setVisible(true);
        });
    }, []);

    const animateStep = (next: number) => {
        Animated.sequence([
            Animated.timing(slideAnim, { toValue: -20, duration: 120, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
        setStep(next);
    };

    const handleNext = () => {
        if (isLast) {
            dismiss();
        } else {
            animateStep(step + 1);
        }
    };

    const dismiss = () => {
        setVisible(false);
        void markOnlineOnboardingSeen();
    };

    const current = STEPS[step];
    const avatars = STEP_AVATARS[step];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={dismiss}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    {/* Skip button */}
                    <TouchableOpacity style={styles.skipBtn} onPress={dismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Text style={styles.skipText}>{ob.skip}</Text>
                    </TouchableOpacity>

                    {/* Avatars illustration */}
                    <Animated.View style={[styles.avatarRow, { transform: [{ translateX: slideAnim }] }]}>
                        {avatars.map((av, i) => (
                            <View
                                key={av}
                                style={[
                                    styles.avatarWrapper,
                                    // In step 3, middle avatar is the impostor
                                    step === 2 && i === 1 && styles.impostorWrapper,
                                ]}
                            >
                                <Image source={AVATAR_ASSETS[av]} style={styles.avatar} />
                                {step === 2 && i === 1 && (
                                    <View style={styles.impostorBadge}>
                                        <Text style={styles.impostorBadgeText}>!</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </Animated.View>

                    {/* Emoji + content */}
                    <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }] }]}>
                        <Text style={styles.emoji}>{current.emoji}</Text>
                        <Text style={styles.title}>{current.title}</Text>
                        <Text style={styles.desc}>{current.desc}</Text>
                    </Animated.View>

                    {/* Dots */}
                    <View style={styles.dots}>
                        {STEPS.map((_, i) => (
                            <View
                                key={i}
                                style={[styles.dot, i === step && styles.dotActive]}
                            />
                        ))}
                    </View>

                    {/* Button */}
                    <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.85}>
                        <Text style={styles.btnText}>{isLast ? ob.got_it : ob.next}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 28,
        width: '100%',
        maxWidth: width * 0.88,
        paddingTop: 20,
        paddingBottom: 28,
        paddingHorizontal: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
    },
    skipBtn: {
        alignSelf: 'flex-end',
        marginBottom: 8,
    },
    skipText: {
        color: '#A0AEC0',
        fontSize: 13,
        fontWeight: '600',
    },
    avatarRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 12,
        marginBottom: 20,
        minHeight: 80,
    },
    avatarWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#EBF4FF',
        overflow: 'visible',
        justifyContent: 'center',
        alignItems: 'center',
    },
    impostorWrapper: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#FFF5F5',
        borderWidth: 2.5,
        borderColor: '#FC8181',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    impostorBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#E53E3E',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    impostorBadgeText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
        lineHeight: 16,
    },
    content: {
        alignItems: 'center',
        marginBottom: 24,
    },
    emoji: {
        fontSize: 42,
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A202C',
        textAlign: 'center',
        marginBottom: 10,
    },
    desc: {
        fontSize: 15,
        color: '#4A5568',
        textAlign: 'center',
        lineHeight: 22,
    },
    dots: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#CBD5E0',
    },
    dotActive: {
        backgroundColor: '#5B7FDB',
        width: 20,
    },
    btn: {
        backgroundColor: '#5B7FDB',
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 40,
        alignSelf: 'stretch',
        alignItems: 'center',
    },
    btnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
});
