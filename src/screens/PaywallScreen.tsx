import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ImageBackground,
    StatusBar,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { usePurchase } from '../context/PurchaseContext';
import { useGame } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { ScaleButton } from '../components/ScaleButton';

type PaywallScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Paywall'>;
};

export default function PaywallScreen({ navigation }: PaywallScreenProps) {
    const { isPremium, packages, purchasePackage, restorePurchases, isLoading } = usePurchase();
    const { playClick } = useGame();
    const { t } = useTranslation();
    const tr = t.paywall;

    const [purchasing, setPurchasing] = useState(false);
    const [restoring, setRestoring] = useState(false);

    // Close if user is already premium
    useEffect(() => {
        if (isPremium) navigation.goBack();
    }, [isPremium]);

    const mainPackage = packages.find(p => p.identifier === '$rc_lifetime') ?? packages[0];
    const priceString = mainPackage?.product?.priceString ?? '...';

    const handlePurchase = async () => {
        if (!mainPackage) return;
        playClick();
        setPurchasing(true);
        try {
            await purchasePackage(mainPackage);
        } catch {
            // purchasePackage already shows alert for non-cancelled errors
        } finally {
            setPurchasing(false);
        }
    };

    const handleRestore = async () => {
        playClick();
        setRestoring(true);
        try {
            await restorePurchases();
        } finally {
            setRestoring(false);
        }
    };

    return (
        <ImageBackground
            source={require('../../assets/impostor_home_x.webp')}
            style={styles.bg}
            resizeMode="cover"
        >
            <StatusBar barStyle="light-content" />
            <View style={styles.overlay} />

            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                {/* Close */}
                <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => { playClick(); navigation.goBack(); }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="close-circle" size={34} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>

                {/* ── Badge + Title ── */}
                <View style={styles.headerBlock}>
                    <View style={styles.diamondBadge}>
                        <Ionicons name="diamond" size={26} color="#FFD700" />
                    </View>
                    <Text style={styles.title}>{tr.title}</Text>
                    <Text style={styles.subtitle}>{tr.subtitle}</Text>

                    {/* Social Proof */}
                    <View style={styles.socialProofContainer}>
                        <Text style={styles.socialProofText}>
                            {tr.social_proof_prefix}
                            <Text style={{ fontWeight: '700', color: '#FFF' }}>{tr.social_proof_count}</Text>
                            {tr.social_proof_suffix}
                        </Text>
                    </View>
                </View>

                {/* ── Categories chips ── */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>{tr.categories_title}</Text>
                    <View style={styles.chipsGrid}>
                        {(tr.categories ?? []).map((cat: string, i: number) => (
                            <View key={i} style={styles.chip}>
                                <Text style={styles.chipText}>{cat}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Extra benefits ── */}
                <View style={styles.benefitsBlock}>
                    <Text style={styles.sectionLabel}>{tr.benefits_title}</Text>
                    {(tr.benefits ?? []).map((benefit: string, i: number) => (
                        <View key={i} style={styles.benefitRow}>
                            <Ionicons name="checkmark-circle" size={18} color="#68D391" />
                            <Text style={styles.benefitText}>{benefit}</Text>
                        </View>
                    ))}
                </View>

                {/* ── CTA ── */}
                <View style={styles.ctaBlock}>
                    <Text style={styles.oneTime}>{tr.one_time}</Text>

                    <ScaleButton
                        style={[styles.buyBtn, (purchasing || isLoading) && styles.buyBtnDisabled]}
                        onPress={handlePurchase}
                        disabled={purchasing || isLoading || !mainPackage}
                    >
                        <Ionicons name="diamond" size={18} color="#1A202C" style={{ marginRight: 8 }} />
                        <Text style={styles.buyBtnText}>
                            {purchasing ? '...' : tr.buy_now.replace('%{price}', priceString)}
                        </Text>
                    </ScaleButton>

                    <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
                        <Text style={styles.restoreText}>
                            {restoring ? '...' : tr.restore}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    bg: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 18, 50, 0.82)',
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: 22,
        justifyContent: 'space-between',
    },
    closeBtn: {
        alignSelf: 'flex-end',
        marginTop: 8,
    },

    // ── Header ──
    headerBlock: {
        alignItems: 'center',
        marginTop: -4,
    },
    diamondBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,215,0,0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255,215,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFD700',
        textAlign: 'center',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    },
    socialProofContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    socialProofText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
    },

    // ── Card with chips ──
    card: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        padding: 16,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
    },
    chipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: 'rgba(255,215,0,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.3)',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    chipText: {
        fontSize: 13,
        color: '#FEFCE8',
        fontWeight: '500',
    },

    // ── Benefits ──
    benefitsBlock: {
        gap: 10,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    benefitText: {
        fontSize: 15,
        color: '#F0FFF4',
        fontWeight: '500',
        flex: 1,
    },

    // ── CTA ──
    ctaBlock: {
        alignItems: 'center',
        paddingBottom: Platform.OS === 'android' ? 8 : 0,
    },
    oneTime: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 10,
        letterSpacing: 0.3,
    },
    buyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFD700',
        width: '100%',
        paddingVertical: 17,
        borderRadius: 18,
        marginBottom: 14,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 8,
    },
    buyBtnDisabled: {
        opacity: 0.65,
    },
    buyBtnText: {
        fontSize: 17,
        fontWeight: '900',
        color: '#1A202C',
        letterSpacing: 0.3,
    },
    restoreBtn: {
        paddingVertical: 6,
    },
    restoreText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.45)',
        textDecorationLine: 'underline',
    },
});
