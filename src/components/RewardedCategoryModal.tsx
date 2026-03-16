import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RewardedAd, RewardedAdEventType, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { usePurchase } from '../context/PurchaseContext';
import { useTranslation } from '../hooks/useTranslation';
import { ScaleButton } from './ScaleButton';

const adUnitId = __DEV__
    ? TestIds.REWARDED
    : Platform.OS === 'ios'
        ? 'ca-app-pub-4782245353460263/1721627119'   // ✅ iOS Rewarded
        : 'ca-app-pub-4782245353460263/2244504743';  // ✅ Android Rewarded

interface RewardedCategoryModalProps {
    visible: boolean;
    categoryId: string;
    categoryLabel: string;
    onUnlockGranted: () => void;
    onBuyPremium: () => void;
    onClose: () => void;
    existingUnlockCategoryLabel?: string | null;
}

function formatCountdown(ms: number): string {
    if (ms <= 0) return '0:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function RewardedCategoryModal({
    visible,
    categoryId,
    categoryLabel,
    onUnlockGranted,
    onBuyPremium,
    onClose,
    existingUnlockCategoryLabel,
}: RewardedCategoryModalProps) {
    const { t } = useTranslation();
    const { rewardedUnlock, isCategoryUnlockedByAd, getAdUnlockStatus, getCooldownRemaining } = usePurchase();

    const adStatus = getAdUnlockStatus(categoryId);
    const isCurrentlyUnlocked = isCategoryUnlockedByAd(categoryId);

    const [adState, setAdState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const earnedRewardRef = useRef(false);
    const [rewardedAd, setRewardedAd] = useState<RewardedAd>(() =>
        RewardedAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: true })
    );

    // Countdown for active unlock
    const [timeLeft, setTimeLeft] = useState<number>(0);
    // Countdown for cooldown
    const [cooldownLeft, setCooldownLeft] = useState<number>(0);

    // Slide-up animation
    const slideAnim = useRef(new Animated.Value(400)).current;
    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 9 }).start();
        } else {
            slideAnim.setValue(400);
        }
    }, [visible]);

    // Load ad only when status is 'available' and no other unlock is active
    useEffect(() => {
        if (!visible) return;
        if (adStatus !== 'available') return;
        if (existingUnlockCategoryLabel) return;

        setAdState('loading');
        earnedRewardRef.current = false;

        const freshAd = RewardedAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: true });

        const unsubLoaded = freshAd.addAdEventListener(RewardedAdEventType.LOADED, () => setAdState('ready'));
        const unsubError = freshAd.addAdEventListener(AdEventType.ERROR, () => setAdState('error'));
        const unsubEarned = freshAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
            earnedRewardRef.current = true;
        });
        const unsubClosed = freshAd.addAdEventListener(AdEventType.CLOSED, () => {
            if (earnedRewardRef.current) onUnlockGranted();
        });

        freshAd.load();
        setRewardedAd(freshAd);

        return () => { unsubLoaded(); unsubError(); unsubEarned(); unsubClosed(); };
    }, [visible, adStatus, existingUnlockCategoryLabel]);

    // Active unlock countdown
    useEffect(() => {
        if (!visible || !isCurrentlyUnlocked || !rewardedUnlock) return;
        const compute = () => Math.max(0, rewardedUnlock.expiryTimestamp - Date.now());
        setTimeLeft(compute());
        const interval = setInterval(() => {
            const left = compute();
            setTimeLeft(left);
            if (left <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [visible, isCurrentlyUnlocked, rewardedUnlock]);

    // Cooldown countdown
    useEffect(() => {
        if (!visible || adStatus !== 'cooldown') return;
        const compute = () => getCooldownRemaining(categoryId);
        setCooldownLeft(compute());
        const interval = setInterval(() => {
            const left = compute();
            setCooldownLeft(left);
            if (left <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [visible, adStatus, categoryId]);

    const handleWatchAd = async () => {
        if (adState !== 'ready') return;
        try {
            await rewardedAd.show();
        } catch (e) {
            console.log('Rewarded ad show error:', e);
        }
    };

    const tr = t.rewarded_unlock;

    // ── Render the top section based on status ──────────────────────────────
    const renderStatusBlock = () => {
        // Another category already unlocked
        if (existingUnlockCategoryLabel && !isCurrentlyUnlocked) {
            return (
                <View style={styles.infoBanner}>
                    <Ionicons name="information-circle" size={20} color="#744210" />
                    <Text style={styles.infoText}>
                        {tr.already_unlocked_other.replace('%{cat}', existingUnlockCategoryLabel)}
                    </Text>
                </View>
            );
        }

        // Active (already unlocked)
        if (adStatus === 'active') {
            return (
                <View style={styles.activeBanner}>
                    <Ionicons name="checkmark-circle" size={22} color="#276749" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.activeTitle}>{tr.active_unlock_title}</Text>
                        <Text style={styles.activeTimer}>{formatCountdown(timeLeft)}</Text>
                    </View>
                </View>
            );
        }

        // Cooldown period
        if (adStatus === 'cooldown') {
            return (
                <View style={styles.cooldownBanner}>
                    <Ionicons name="hourglass" size={22} color="#6B4B0A" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.cooldownTitle}>{tr.cooldown_title ?? 'En espera de cooldown'}</Text>
                        <Text style={styles.cooldownTimer}>{formatCountdown(cooldownLeft)}</Text>
                        <Text style={styles.cooldownHint}>{tr.cooldown_hint ?? 'Podrás ver otro anuncio cuando expire'}</Text>
                    </View>
                </View>
            );
        }

        // Maxed out (this category) — only paywall
        if (adStatus === 'maxed') {
            return (
                <View style={styles.maxedBanner}>
                    <Ionicons name="lock-closed" size={20} color="#742A2A" />
                    <Text style={styles.maxedText}>
                        {tr.maxed_hint}
                    </Text>
                </View>
            );
        }

        // Global maxed — user has trialed max allowed categories
        if (adStatus === 'global_maxed') {
            return (
                <View style={styles.globalMaxedBanner}>
                    <Ionicons name="trophy" size={22} color="#742A2A" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.globalMaxedTitle}>{tr.global_maxed_title}</Text>
                        <Text style={styles.globalMaxedText}>{tr.global_maxed_hint}</Text>
                    </View>
                </View>
            );
        }

        // Available — show watch-ad button
        return (
            <>
                <ScaleButton
                    style={[styles.watchAdBtn, adState !== 'ready' && styles.watchAdBtnDisabled]}
                    onPress={handleWatchAd}
                    disabled={adState !== 'ready'}
                >
                    {adState === 'loading' ? (
                        <ActivityIndicator color="#744210" />
                    ) : adState === 'error' ? (
                        <Text style={styles.watchAdText}>{tr.ad_unavailable}</Text>
                    ) : (
                        <>
                            <Ionicons name="play-circle" size={22} color="#744210" style={{ marginRight: 8 }} />
                            <Text style={styles.watchAdText}>{tr.watch_ad_button}</Text>
                        </>
                    )}
                </ScaleButton>
                <View style={styles.timerBadge}>
                    <Ionicons name="time-outline" size={14} color="#718096" />
                    <Text style={styles.timerBadgeText}>{tr.unlock_duration}</Text>
                </View>
            </>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={22} color="#718096" />
                    </TouchableOpacity>

                    <View style={styles.lockIconWrapper}>
                        <Ionicons
                            name={adStatus === 'active' ? 'lock-open' : 'lock-closed'}
                            size={32}
                            color="#FFD700"
                        />
                    </View>

                    <Text style={styles.title}>{tr.title}</Text>
                    <Text style={styles.categoryName}>"{categoryLabel}"</Text>
                    <Text style={styles.subtitle}>{tr.subtitle}</Text>

                    {renderStatusBlock()}

                    {/* Show OR divider only when there's an ad option — not on full paywall states */}
                    {adStatus !== 'premium' && adStatus !== 'global_maxed' && (
                        <>
                            <View style={styles.dividerRow}>
                                <View style={styles.divider} />
                                <Text style={styles.orText}>{tr.or}</Text>
                                <View style={styles.divider} />
                            </View>

                            <ScaleButton style={styles.premiumBtn} onPress={onBuyPremium}>
                                <Ionicons name="diamond" size={18} color="#1A202C" style={{ marginRight: 8 }} />
                                <Text style={styles.premiumBtnText}>{tr.buy_premium}</Text>
                            </ScaleButton>

                            <Text style={styles.premiumDesc}>{tr.buy_premium_desc}</Text>
                        </>
                    )}

                    {/* On global_maxed: show premium button directly without the OR divider */}
                    {adStatus === 'global_maxed' && (
                        <>
                            <ScaleButton style={[styles.premiumBtn, { marginTop: 4 }]} onPress={onBuyPremium}>
                                <Ionicons name="diamond" size={18} color="#1A202C" style={{ marginRight: 8 }} />
                                <Text style={styles.premiumBtnText}>{tr.buy_premium}</Text>
                            </ScaleButton>
                            <Text style={styles.premiumDesc}>{tr.buy_premium_desc}</Text>
                        </>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 28,
        paddingBottom: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 20,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
    },
    lockIconWrapper: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#FFFBEB',
        borderWidth: 2,
        borderColor: '#FFD700',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A202C',
        textAlign: 'center',
        marginBottom: 4,
    },
    categoryName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#5B7FDB',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#718096',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    // ── Status banners ──────────────────────────────────────────────
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 14,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F6E05E',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#744210',
        lineHeight: 18,
    },
    activeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FFF4',
        borderRadius: 12,
        padding: 14,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#9AE6B4',
    },
    activeTitle: {
        fontSize: 13,
        color: '#276749',
        fontWeight: '600',
    },
    activeTimer: {
        fontSize: 22,
        fontWeight: '800',
        color: '#276749',
        letterSpacing: 1,
        marginTop: 2,
    },
    cooldownBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 14,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F6AD55',
    },
    cooldownTitle: {
        fontSize: 13,
        color: '#6B4B0A',
        fontWeight: '700',
    },
    cooldownTimer: {
        fontSize: 20,
        fontWeight: '800',
        color: '#C05621',
        letterSpacing: 1,
        marginTop: 2,
    },
    cooldownHint: {
        fontSize: 11,
        color: '#744210',
        marginTop: 4,
    },
    maxedBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#FFF5F5',
        borderRadius: 12,
        padding: 14,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FEB2B2',
    },
    maxedText: {
        flex: 1,
        fontSize: 13,
        color: '#742A2A',
        lineHeight: 18,
    },
    globalMaxedBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFF5F5',
        borderRadius: 12,
        padding: 14,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FC8181',
    },
    globalMaxedTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#742A2A',
        marginBottom: 4,
    },
    globalMaxedText: {
        fontSize: 12,
        color: '#742A2A',
        lineHeight: 17,
    },
    // ── Watch ad button ─────────────────────────────────────────────
    watchAdBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEFCD0',
        borderWidth: 2,
        borderColor: '#F6E05E',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 8,
    },
    watchAdBtnDisabled: { opacity: 0.7 },
    watchAdText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#744210',
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 20,
    },
    timerBadgeText: {
        fontSize: 12,
        color: '#718096',
    },
    // ── Divider + Premium ────────────────────────────────────────────
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 16,
    },
    divider: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    orText: { marginHorizontal: 12, color: '#A0AEC0', fontSize: 13, fontWeight: '500' },
    premiumBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFD700',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 10,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    premiumBtnText: { fontSize: 16, fontWeight: '800', color: '#1A202C' },
    premiumDesc: { fontSize: 12, color: '#A0AEC0', textAlign: 'center' },
});
