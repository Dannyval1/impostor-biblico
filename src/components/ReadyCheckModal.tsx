import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useTranslation } from '../hooks/useTranslation';

export function ReadyCheckModal() {
    const { gameState, submitReadyCheck, cancelReadyCheck } = useOnlineGame();
    const { t } = useTranslation();

    const room = gameState.room;
    if (!room || room.status !== 'ready_check') return null;

    const connectedPlayers = Object.values(room.players).filter(p => p.isConnected !== false);
    const ready = room.readyCheckReady || {};
    const readyCount = connectedPlayers.filter(p => ready[p.id]).length;
    const pendingPlayers = connectedPlayers.filter(p => ready[p.id] !== true);
    const total = connectedPlayers.length;
    const myId = gameState.playerId || '';
    const meReady = !!ready[myId];
    const allReady = total > 0 && readyCount >= total;

    return (
        <Modal visible transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Ionicons name="checkmark-circle-outline" size={54} color="#48BB78" />
                    <Text style={styles.title}>{t.online.ready_check_title}</Text>
                    <Text style={styles.message}>{t.online.ready_check_message}</Text>

                    <View style={styles.countPill}>
                        <Text style={styles.countText}>
                            {t.online.ready_check_count
                                .replace('{ready}', String(readyCount))
                                .replace('{total}', String(total))}
                        </Text>
                    </View>

                    {!allReady && pendingPlayers.length > 0 && (
                        <View style={styles.pendingBox}>
                            <Text style={styles.pendingLabel}>{t.online.lobby_not_ready_prefix}</Text>
                            <Text style={styles.pendingNames}>
                                {pendingPlayers.map(p => p.name.trim()).filter(Boolean).join(', ')}
                            </Text>
                        </View>
                    )}

                    {!meReady ? (
                        <TouchableOpacity
                            style={styles.readyButton}
                            onPress={() => { void submitReadyCheck(); }}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.readyButtonText}>{t.online.ready_check_button}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.waitingBox}>
                            <Text style={styles.waitingTitle}>{t.online.ready_check_done}</Text>
                            <Text style={styles.waitingHint}>
                                {allReady ? t.online.ready_check_starting : t.online.ready_check_waiting}
                            </Text>
                            {!allReady && <ActivityIndicator color="rgba(255,255,255,0.55)" style={{ marginTop: 12 }} />}
                        </View>
                    )}
                    {gameState.isHost && !allReady && (
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => { void cancelReadyCheck(); }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.cancelButtonText}>{t.common.cancel}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.72)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    card: {
        width: '100%',
        backgroundColor: '#1A1A2E',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    title: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        textAlign: 'center',
        marginTop: 12,
    },
    message: {
        color: 'rgba(255,255,255,0.72)',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginTop: 10,
    },
    countPill: {
        marginTop: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 7,
    },
    countText: {
        color: '#E2E8F0',
        fontSize: 14,
        fontWeight: '800',
    },
    pendingBox: {
        width: '100%',
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.07)',
        alignItems: 'center',
    },
    pendingLabel: {
        color: 'rgba(255,255,255,0.48)',
        fontSize: 12,
        fontWeight: '800',
    },
    pendingNames: {
        color: 'rgba(255,255,255,0.84)',
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 3,
    },
    readyButton: {
        width: '100%',
        marginTop: 24,
        backgroundColor: '#48BB78',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
    },
    readyButtonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: 1,
    },
    waitingBox: {
        marginTop: 24,
        alignItems: 'center',
    },
    waitingTitle: {
        color: '#48BB78',
        fontSize: 17,
        fontWeight: '900',
    },
    waitingHint: {
        color: 'rgba(255,255,255,0.58)',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 6,
    },
    cancelButton: {
        marginTop: 18,
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    cancelButtonText: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 13,
        fontWeight: '800',
    },
});
