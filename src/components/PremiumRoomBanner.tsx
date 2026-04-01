import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';

export function PremiumRoomBanner() {
    const { gameState } = useOnlineGame();
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const room = gameState.room;
    if (!room) return null;

    const isPremium = room.settings.isPremiumRoom;
    const hostName =
        room.originalHostName ||
        room.players[room.originalHostId]?.name ||
        room.players[room.hostId]?.name ||
        t.online.host_name_fallback;

    if (isPremium) {
        return (
            <View style={styles.premiumBanner}>
                <Text style={styles.premiumIcon}>✨</Text>
                <Text style={styles.premiumText}>
                    {t.online.premium_banner_prefix}
                    <Text style={styles.bold}>{hostName}</Text>
                </Text>
            </View>
        );
    }

    return (
        <TouchableOpacity style={styles.freeBanner} onPress={() => navigation.navigate('Paywall')} activeOpacity={0.8}>
            <Text style={styles.freeText}>
                {t.online.premium_banner_free_before}
                <Text style={styles.bold}>{t.online.premium_banner_free_highlight}</Text>
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    premiumBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#B8860B',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 13,
        marginHorizontal: 20,
        marginBottom: 12,
        gap: 10,
        borderWidth: 1.5,
        borderColor: '#FFD700',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 6,
    },
    premiumIcon: { fontSize: 22 },
    premiumText: {
        color: '#FFF',
        fontSize: 15,
        flex: 1,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    bold: { fontWeight: '900' },
    freeBanner: {
        backgroundColor: 'rgba(91,127,219,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(91,127,219,0.3)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginHorizontal: 20,
        marginBottom: 12,
    },
    freeText: { color: '#C3DAFE', fontSize: 12, textAlign: 'center' },
});
