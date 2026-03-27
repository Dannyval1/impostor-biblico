import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useNavigation } from '@react-navigation/native';

export function PremiumRoomBanner() {
    const { gameState } = useOnlineGame();
    const navigation = useNavigation<any>();
    const room = gameState.room;
    if (!room) return null;

    const isPremium = room.settings.isPremiumRoom;
    const hostPlayer = room.players[room.originalHostId] || room.players[room.hostId];
    const hostName = hostPlayer?.name || 'Anfitrión';

    if (isPremium) {
        return (
            <View style={styles.premiumBanner}>
                <Text style={styles.premiumIcon}>✨</Text>
                <Text style={styles.premiumText}>
                    Sala Premium gracias a <Text style={styles.bold}>{hostName}</Text>
                </Text>
            </View>
        );
    }

    return (
        <TouchableOpacity style={styles.freeBanner} onPress={() => navigation.navigate('Paywall')} activeOpacity={0.8}>
            <Text style={styles.freeText}>
                🔓 Más categorías, sin anuncios y más jugadores con <Text style={styles.bold}>Premium</Text>
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    premiumBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#F6E05E',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginHorizontal: 20,
        marginBottom: 12,
        gap: 8,
    },
    premiumIcon: { fontSize: 18 },
    premiumText: { color: '#744210', fontSize: 13, flex: 1 },
    bold: { fontWeight: '800' },
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
