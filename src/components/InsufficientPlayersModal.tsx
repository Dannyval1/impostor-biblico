import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';

export function InsufficientPlayersModal() {
    const { insufficientPlayers, clearInsufficientPlayers, leaveRoom, roomClosed } = useOnlineGame();
    const navigation = useNavigation<any>();
    const { t } = useTranslation();

    const handleDismiss = async () => {
        clearInsufficientPlayers();
        try { await leaveRoom(); } catch { /* ignore */ }
        navigation.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'Setup' }] })
        );
    };

    return (
        <Modal visible={insufficientPlayers && !roomClosed} transparent animationType="fade" onRequestClose={handleDismiss}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.iconWrapper}>
                        <Ionicons name="people-outline" size={36} color="#DD6B20" />
                    </View>
                    <Text style={styles.title}>{t.online.errors.insufficient_players}</Text>
                    <Text style={styles.subtitle}>{t.online.errors.insufficient_players_desc}</Text>
                    <TouchableOpacity style={styles.button} onPress={handleDismiss} activeOpacity={0.85}>
                        <Text style={styles.buttonText}>{t.ok || 'OK'}</Text>
                    </TouchableOpacity>
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
        paddingHorizontal: 32,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 28,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 16,
    },
    iconWrapper: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFFAF0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
        borderWidth: 2,
        borderColor: '#FEEBC8',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A202C',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#718096',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    button: {
        backgroundColor: '#DD6B20',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
