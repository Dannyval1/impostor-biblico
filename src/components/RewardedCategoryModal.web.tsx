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
                        ⚠️ Los anuncios de video no están disponibles en web.
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
