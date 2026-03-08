import React, { useRef, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScaleButton } from './ScaleButton';
import { useTranslation } from '../hooks/useTranslation';

// Preview of what premium users get — shown as teaser cards
const PREMIUM_PREVIEWS = [
    { emoji: '📋', key: 'oficios_biblicos' },
    { emoji: '🏗️', key: 'lugares_biblicos' },
    { emoji: '👩', key: 'mujeres_biblicas' },
    { emoji: '✨', key: 'milagros_biblicos' },
    { emoji: '🐾', key: 'animales' },
    { emoji: '🍽️', key: 'comida' },
] as const;

interface PostGamePaywallModalProps {
    visible: boolean;
    onClose: () => void;
    onBuyPremium: () => void;
}

export function PostGamePaywallModal({
    visible,
    onClose,
    onBuyPremium,
}: PostGamePaywallModalProps) {
    const { t } = useTranslation();
    const slideAnim = useRef(new Animated.Value(500)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 60,
                    friction: 9,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            slideAnim.setValue(500);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <Animated.View
                    style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
                >
                    {/* Close button */}
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={22} color="#A0AEC0" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.sparkleRow}>
                        <Text style={styles.sparkle}>✨</Text>
                        <Text style={styles.sparkle}>✨</Text>
                        <Text style={styles.sparkle}>✨</Text>
                    </View>
                    <Text style={styles.title}>{t.post_game_paywall.title}</Text>
                    <Text style={styles.subtitle}>
                        {t.post_game_paywall.subtitle_1}
                        <Text style={{ fontWeight: '700', color: '#1A202C' }}>{t.post_game_paywall.subtitle_2}</Text>
                        {t.post_game_paywall.subtitle_3}
                        <Text style={{ fontWeight: '700', color: '#1A202C' }}>{t.post_game_paywall.subtitle_4}</Text>
                        {t.post_game_paywall.subtitle_5}
                    </Text>

                    {/* Preview grid */}
                    <View style={styles.previewGrid}>
                        {PREMIUM_PREVIEWS.map((item) => (
                            <View key={item.key} style={styles.previewCard}>
                                <View style={styles.lockOverlay}>
                                    <Ionicons name="lock-closed" size={12} color="#FFF" />
                                </View>
                                <Text style={styles.previewEmoji}>{item.emoji}</Text>
                                <Text style={styles.previewLabel} numberOfLines={2}>
                                    {t.setup.categories_list[item.key as keyof typeof t.setup.categories_list]}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.socialProofRow}>
                        <Ionicons name="trending-up" size={14} color="#D69E2E" style={{ marginRight: 6 }} />
                        <Text style={styles.socialProofText}>
                            {t.post_game_paywall.top_category}
                            <Text style={{ fontWeight: 'bold' }}>{t.post_game_paywall.top_category_name}</Text>
                        </Text>
                    </View>

                    {/* CTA */}
                    <ScaleButton style={styles.premiumBtn} onPress={onBuyPremium}>
                        <Ionicons name="diamond" size={20} color="#1A202C" style={{ marginRight: 10 }} />
                        <Text style={styles.premiumBtnText}>{t.post_game_paywall.get_premium}</Text>
                    </ScaleButton>
                    <Text style={styles.priceHint}>{t.post_game_paywall.price_hint}</Text>

                    <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
                        <Text style={styles.skipText}>{t.post_game_paywall.skip}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 24,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 6,
        zIndex: 10,
    },
    sparkleRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 8,
    },
    sparkle: {
        fontSize: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#1A202C',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#718096',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
        paddingHorizontal: 8,
    },
    // Preview grid
    previewGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 10,
    },
    previewCard: {
        width: '30%',
        backgroundColor: '#F7FAFC',
        borderRadius: 14,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        position: 'relative',
        overflow: 'hidden',
    },
    lockOverlay: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#5B7FDB',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    previewEmoji: {
        fontSize: 26,
        marginBottom: 6,
    },
    previewLabel: {
        fontSize: 10,
        color: '#4A5568',
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 13,
    },
    socialProofRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEFCBF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F6E05E',
    },
    socialProofText: {
        fontSize: 12,
        color: '#744210',
    },
    // CTA
    premiumBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFD700',
        width: '100%',
        paddingVertical: 17,
        borderRadius: 16,
        marginBottom: 8,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    premiumBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1A202C',
    },
    priceHint: {
        fontSize: 12,
        color: '#A0AEC0',
        textAlign: 'center',
        marginBottom: 16,
    },
    skipBtn: {
        paddingVertical: 8,
    },
    skipText: {
        fontSize: 13,
        color: '#718096',
        fontWeight: '500',
    },
});
