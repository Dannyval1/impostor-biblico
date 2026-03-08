import React, { useRef, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Animated,
    Image,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScaleButton } from './ScaleButton';
import { usePurchase } from '../context/PurchaseContext';
import { useTranslation } from '../hooks/useTranslation';

interface ExpiredAdUnlockModalProps {
    visible: boolean;
    categoryName: string;
    onClose: () => void;
    onBuyPremium: () => void;
}

export function ExpiredAdUnlockModal({
    visible,
    categoryName,
    onClose,
    onBuyPremium,
}: ExpiredAdUnlockModalProps) {
    const { t } = useTranslation();
    const { packages } = usePurchase();
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const mainPackage = packages.find(p => p.identifier === '$rc_lifetime') ?? packages[0];
    const priceString = mainPackage?.product?.priceString ?? 'Premium';

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.9);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>

                    {/* Header Image/Icon */}
                    <View style={styles.iconContainer}>
                        <View style={styles.iconBg}>
                            <Ionicons name="hourglass-outline" size={36} color="#E53E3E" />
                        </View>
                    </View>

                    {/* Texts */}
                    <Text style={styles.title}>{t.expired_modal.title}</Text>
                    <Text style={styles.subtitle}>
                        {t.expired_modal.subtitle_1}
                        <Text style={styles.highlight}>{categoryName}</Text>
                        {t.expired_modal.subtitle_2}
                    </Text>

                    {/* Selling Point */}
                    <View style={styles.sellingPointCard}>
                        <View style={styles.sellingRow}>
                            <Ionicons name="infinite" size={24} color="#D69E2E" />
                            <Text style={styles.sellingText}>
                                {t.expired_modal.selling_1_1}
                                <Text style={{ fontWeight: 'bold' }}>{t.expired_modal.selling_1_2}</Text>
                                {t.expired_modal.selling_1_3}
                            </Text>
                        </View>
                        <View style={styles.sellingRow}>
                            <Ionicons name="ban" size={20} color="#D69E2E" style={{ marginLeft: 2 }} />
                            <Text style={styles.sellingText}>{t.expired_modal.selling_2}</Text>
                        </View>
                    </View>

                    {/* CTA */}
                    <ScaleButton style={styles.premiumBtn} onPress={onBuyPremium}>
                        <Ionicons name="diamond" size={20} color="#1A202C" style={{ marginRight: 8 }} />
                        <Text style={styles.premiumBtnText}>
                            {t.expired_modal.buy_btn.replace('%{price}', priceString)}
                        </Text>
                    </ScaleButton>

                    {/* Wait option */}
                    <TouchableOpacity onPress={onClose} style={styles.waitBtn}>
                        <Text style={styles.waitBtnText}>{t.expired_modal.wait_btn}</Text>
                    </TouchableOpacity>

                </Animated.View>
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
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 16,
    },
    iconBg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFF5F5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FEB2B2',
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1A202C',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 15,
        color: '#4A5568',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
        paddingHorizontal: 8,
    },
    highlight: {
        fontWeight: '700',
        color: '#2D3748',
    },
    sellingPointCard: {
        backgroundColor: '#FFFFF0',
        borderRadius: 16,
        padding: 16,
        width: '100%',
        borderWidth: 1,
        borderColor: '#FEFCBF',
        marginBottom: 20,
        gap: 12,
    },
    sellingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingRight: 20,
    },
    sellingText: {
        fontSize: 14,
        color: '#744210',
        lineHeight: 20,
    },
    premiumBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFD700',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    premiumBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1A202C',
    },
    waitBtn: {
        paddingVertical: 10,
    },
    waitBtnText: {
        fontSize: 13,
        color: '#A0AEC0',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
