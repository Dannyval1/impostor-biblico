// Web stub for RewardedCategoryModal.
// Rewarded ads are not supported on web — only the premium purchase option is shown.
import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';

interface RewardedCategoryModalProps {
    visible: boolean;
    categoryId: string;
    categoryLabel: string;
    onUnlockGranted: () => void;
    onBuyPremium: () => void;
    onClose: () => void;
    existingUnlockCategoryLabel?: string | null;
}

export function RewardedCategoryModal({
    visible,
    categoryLabel,
    onBuyPremium,
    onClose,
}: RewardedCategoryModalProps) {
    const { t } = useTranslation();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={22} color="#718096" />
                    </TouchableOpacity>

                    <View style={styles.lockIconWrapper}>
                        <Ionicons name="lock-closed" size={32} color="#FFD700" />
                    </View>

                    <Text style={styles.title}>{t.rewarded_unlock.title}</Text>
                    <Text style={styles.categoryName}>"{categoryLabel}"</Text>
                    <Text style={styles.subtitle}>
                        Esta categoría requiere Premium para jugarse.
                    </Text>

                    <Text style={styles.webNote}>
                        Los anuncios de video no están disponibles en web.
                    </Text>

                    <TouchableOpacity style={styles.premiumBtn} onPress={onBuyPremium}>
                        <Ionicons name="diamond" size={18} color="#1A202C" style={{ marginRight: 8 }} />
                        <Text style={styles.premiumBtnText}>{t.rewarded_unlock.buy_premium}</Text>
                    </TouchableOpacity>

                    <Text style={styles.premiumDesc}>{t.rewarded_unlock.buy_premium_desc}</Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    sheet: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 28,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    closeBtn: {
        position: 'absolute',
        top: 14,
        right: 14,
        padding: 4,
    },
    lockIconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFBEB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A202C',
        textAlign: 'center',
        marginBottom: 8,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#5B7FDB',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#718096',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    webNote: {
        fontSize: 12,
        color: '#A0AEC0',
        textAlign: 'center',
        marginBottom: 20,
        fontStyle: 'italic',
    },
    premiumBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9E675',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        width: '100%',
        marginBottom: 10,
    },
    premiumBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A202C',
    },
    premiumDesc: {
        fontSize: 11,
        color: '#A0AEC0',
        textAlign: 'center',
    },
});
