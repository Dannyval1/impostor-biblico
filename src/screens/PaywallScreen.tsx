import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
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

// ==========================================
// TOGGLE THIS FLAG AFTER HOLY WEEK:
const IS_HOLY_WEEK = true;
// ==========================================

export default function PaywallScreen({ navigation }: { navigation: NativeStackNavigationProp<RootStackParamList, 'Paywall'> }) {
    if (IS_HOLY_WEEK) {
        return <HolyWeekPaywallContent navigation={navigation} />;
    }
    return <NormalPaywallContent navigation={navigation} />;
}

function HolyWeekPaywallContent({ navigation }: { navigation: NativeStackNavigationProp<RootStackParamList, 'Paywall'> }) {
    const { isPremium, packages, purchasePackage, restorePurchases, isLoading } = usePurchase();
    const { playClick } = useGame();
    const { t } = useTranslation();
    const tr = t.paywall;

    const [purchasing, setPurchasing] = useState(false);
    const [restoring, setRestoring] = useState(false);

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
            // handle error if needed
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
        <ImageBackground source={require('../../assets/impostor_home_x.webp')} style={styles.bg} resizeMode="cover">
            <StatusBar barStyle="light-content" />
            <View style={styles.holyWeekOverlay} />

            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                <View style={styles.topNav}>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => { playClick(); navigation.goBack(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                </View>

                <View style={styles.contentWrapper}>
                    <View style={styles.headerBlock}>
                        <View style={styles.easterBadge}>
                            <Text style={{ fontSize: 32 }}>🙏</Text>
                        </View>
                        <Text style={styles.holyWeekTitle}>{'Especial Semana Santa'.toUpperCase()}</Text>
                        <Text style={styles.holyWeekSubtitle}>¡Desbloquea TODO el juego con un descuento especial!</Text>

                        <View style={styles.socialProofContainer}>
                            <Text style={styles.socialProofText}>
                                {tr.social_proof_prefix}
                                <Text style={{ fontWeight: '700', color: '#FFF' }}>{tr.social_proof_count}</Text>
                                {tr.social_proof_suffix}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionLabel}>{tr.categories_title}</Text>
                        <View style={styles.chipsGrid}>
                            {(tr.categories ?? []).slice(0, 4).map((cat: string, i: number) => (
                                <View key={i} style={styles.holyWeekChip}>
                                    <Text style={styles.chipText}>{cat}</Text>
                                </View>
                            ))}
                            <View style={[styles.holyWeekChip, { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}>
                                <Text style={[styles.chipText, { color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }]}>¡Y más!</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.benefitsBlock}>
                        <Text style={styles.sectionLabel}>{tr.benefits_title}</Text>
                        {(tr.benefits ?? []).map((benefit: string, i: number) => (
                            <View key={i} style={styles.benefitRow}>
                                <Ionicons name="checkmark-circle" size={18} color="#90CDF4" />
                                <Text style={styles.benefitText}>{benefit}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.ctaBlock}>
                    <Text style={styles.oneTime}>{tr.one_time}</Text>

                    <ScaleButton style={[styles.buyBtnHolyWeek, (purchasing || isLoading) && styles.buyBtnDisabled]} onPress={handlePurchase} disabled={purchasing || isLoading || !mainPackage}>
                        <Ionicons name="diamond" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.buyBtnTextHolyWeek}>
                            {purchasing ? '...' : tr.buy_now.replace('%{price}', priceString)}
                        </Text>
                    </ScaleButton>

                    <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
                        <Text style={styles.restoreText}>{restoring ? '...' : tr.restore}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
}

function NormalPaywallContent({ navigation }: { navigation: NativeStackNavigationProp<RootStackParamList, 'Paywall'> }) {
    const { isPremium, packages, purchasePackage, restorePurchases, isLoading } = usePurchase();
    const { playClick } = useGame();
    const { t } = useTranslation();
    const tr = t.paywall;

    const [purchasing, setPurchasing] = useState(false);
    const [restoring, setRestoring] = useState(false);

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
        <ImageBackground source={require('../../assets/impostor_home_x.webp')} style={styles.bg} resizeMode="cover">
            <StatusBar barStyle="light-content" />
            <View style={styles.overlay} />

            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                <View style={styles.topNav}>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => { playClick(); navigation.goBack(); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                </View>

                <View style={styles.contentWrapper}>
                    <View style={styles.headerBlock}>
                        <View style={styles.diamondBadge}>
                            <Ionicons name="diamond" size={26} color="#FFD700" />
                        </View>
                        <Text style={styles.title}>{tr.title}</Text>
                        <Text style={styles.subtitle}>{tr.subtitle}</Text>

                        <View style={styles.socialProofContainer}>
                            <Text style={styles.socialProofText}>
                                {tr.social_proof_prefix}
                                <Text style={{ fontWeight: '700', color: '#FFF' }}>{tr.social_proof_count}</Text>
                                {tr.social_proof_suffix}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionLabel}>{tr.categories_title}</Text>
                        <View style={styles.chipsGrid}>
                            {(tr.categories ?? []).slice(0, 4).map((cat: string, i: number) => (
                                <View key={i} style={styles.chip}>
                                    <Text style={styles.chipText}>{cat}</Text>
                                </View>
                            ))}
                            <View style={[styles.chip, { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' }]}>
                                <Text style={[styles.chipText, { color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }]}>¡Y más!</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.benefitsBlock}>
                        <Text style={styles.sectionLabel}>{tr.benefits_title}</Text>
                        {(tr.benefits ?? []).map((benefit: string, i: number) => (
                            <View key={i} style={styles.benefitRow}>
                                <Ionicons name="checkmark-circle" size={18} color="#68D391" />
                                <Text style={styles.benefitText}>{benefit}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.ctaBlock}>
                    <Text style={styles.oneTime}>{tr.one_time}</Text>

                    <ScaleButton style={[styles.buyBtn, (purchasing || isLoading) && styles.buyBtnDisabled]} onPress={handlePurchase} disabled={purchasing || isLoading || !mainPackage}>
                        <Ionicons name="diamond" size={18} color="#1A202C" style={{ marginRight: 8 }} />
                        <Text style={styles.buyBtnText}>
                            {purchasing ? '...' : tr.buy_now.replace('%{price}', priceString)}
                        </Text>
                    </ScaleButton>

                    <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
                        <Text style={styles.restoreText}>{restoring ? '...' : tr.restore}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 18, 50, 0.82)' },
    holyWeekOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(38, 20, 50, 0.90)' }, // purplish dark overlay
    safeArea: { flex: 1, paddingHorizontal: 22, justifyContent: 'space-between' },
    topNav: { width: '100%', alignItems: 'flex-end', paddingTop: 8 },
    closeBtn: { alignSelf: 'flex-end', marginTop: 8 },
    contentWrapper: { flex: 1, justifyContent: 'space-evenly', width: '100%' },

    // Header
    headerBlock: { alignItems: 'center' },
    diamondBadge: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,215,0,0.15)', borderWidth: 2, borderColor: 'rgba(255,215,0,0.5)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    easterBadge: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(159, 122, 234, 0.2)', borderWidth: 2, borderColor: 'rgba(159, 122, 234, 0.6)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 22, fontWeight: '900', color: '#FFD700', textAlign: 'center', letterSpacing: 0.5, marginBottom: 8 },
    holyWeekTitle: { fontSize: 26, fontWeight: '900', color: '#F6E05E', textAlign: 'center', letterSpacing: 0.5, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: 10 },
    holyWeekSubtitle: { fontSize: 16, color: '#E9D8FD', textAlign: 'center', fontWeight: '600', paddingHorizontal: 10 },
    socialProofContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginTop: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    socialProofText: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },

    // Card with chips
    card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 20 },
    sectionLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { backgroundColor: 'rgba(255,215,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
    holyWeekChip: { backgroundColor: 'rgba(159, 122, 234, 0.15)', borderWidth: 1, borderColor: 'rgba(159, 122, 234, 0.4)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
    chipText: { fontSize: 13, color: '#FEFCE8', fontWeight: '500' },

    // Benefits
    benefitsBlock: { gap: 10 },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    benefitText: { fontSize: 15, color: '#F0FFF4', fontWeight: '500', flex: 1 },

    // CTA
    ctaBlock: { alignItems: 'center', paddingBottom: Platform.OS === 'android' ? 8 : 0 },
    oneTime: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10, letterSpacing: 0.3 },
    discountBanner: { backgroundColor: '#E53E3E', color: 'white', fontWeight: '900', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', fontSize: 13, marginBottom: 8 },
    buyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD700', width: '100%', paddingVertical: 17, borderRadius: 18, marginBottom: 14, shadowColor: '#FFD700', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8 },
    buyBtnHolyWeek: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#805AD5', width: '100%', paddingVertical: 17, borderRadius: 18, marginBottom: 14, shadowColor: '#9F7AEA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8, borderWidth: 1, borderColor: '#D6BCFA' },
    buyBtnDisabled: { opacity: 0.65 },
    buyBtnText: { fontSize: 17, fontWeight: '900', color: '#1A202C', letterSpacing: 0.3 },
    buyBtnTextHolyWeek: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.3 },
    restoreBtn: { paddingVertical: 6 },
    restoreText: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecorationLine: 'underline' },
});
