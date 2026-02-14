import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useOnlineGame } from '../context/OnlineGameContext';
import { Ionicons } from '@expo/vector-icons';
import { OnlinePlayerRole } from '../types';
import { useTranslation } from '../hooks/useTranslation';

export default function OnlineRevealScreen() {
    const navigation = useNavigation<any>();
    const { gameState, updateSettings, nextRound, startVoting } = useOnlineGame();
    const { t } = useTranslation();

    // Local state for countdown
    const [secondsLeft, setSecondsLeft] = useState<number>(gameState.room?.settings.gameDuration || 300);
    const [isRevealed, setIsRevealed] = useState(false); // Initially hidden? Or show immediately? 
    // In Online mode, since everyone has their own screen, we can show immediately or tap to reveal.
    // Let's do: Tap to Reveal, then static display.

    const player = gameState.room?.players[gameState.playerId || ''];
    const role = player?.role;
    const isImpostor = role === 'impostor';
    const word = gameState.room?.currentWord;

    useEffect(() => {
        if (gameState.room?.status === 'voting') {
            navigation.replace('OnlineVoting');
        } else if (gameState.room?.status === 'finished') {
            // Handle game over from here if needed
        }
    }, [gameState.room?.status]);

    useEffect(() => {
        // Simple local timer sync-ish. 
        // Ideally we sync start time from server but for now local countdown is okay-ish if started roughly same time.
        // Better: `createdAt` or `startTime` in Room object.
        // For MVP: Local timer.
        const interval = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    if (!player) return <View style={styles.container}><Text style={styles.text}>{t.home.loading}</Text></View>;

    return (
        <SafeAreaView style={[styles.container, isImpostor ? styles.impostorBg : styles.civilianBg]}>
            <View style={styles.header}>
                <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.roleTitle}>
                    {isImpostor ? t.reveal.you_are_impostor : t.reveal.you_are_civilian}
                </Text>

                <View style={styles.card}>
                    {isImpostor ? (
                        <View style={styles.impostorContent}>
                            <Ionicons name="skull-outline" size={80} color="#E53E3E" />
                            <Text style={styles.impostorText}>{t.reveal.impostor_task_1}</Text>
                            <Text style={styles.impostorText}>{t.reveal.impostor_task_2}</Text>
                        </View>
                    ) : (
                        <View style={styles.civilianContent}>
                            <Text style={styles.wordLabel}>{t.reveal.your_word}</Text>
                            <Text style={styles.secretWord}>{word?.word}</Text>
                            <Text style={styles.categoryLabel}>{word?.category}</Text>
                        </View>
                    )}
                </View>

                {gameState.isHost && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={startVoting}
                    >
                        <Text style={styles.actionButtonText}>{t.online.errors.start_voting}</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.hintText}>
                    {gameState.isHost
                        ? t.online.errors.host_hint
                        : t.online.errors.player_hint}
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#2C1A0E',
    },
    impostorBg: {
        backgroundColor: '#2C1A0E', // Can be reddish
    },
    civilianBg: {
        backgroundColor: '#2C1A0E', // Can be blueish
    },
    header: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    timerText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        fontVariant: ['tabular-nums'],
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    roleTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 30,
        textAlign: 'center',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 30,
        width: '100%',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
        marginBottom: 40,
        minHeight: 200,
        justifyContent: 'center',
    },
    impostorContent: {
        alignItems: 'center',
        gap: 10,
    },
    impostorText: {
        fontSize: 18,
        color: '#333',
        textAlign: 'center',
    },
    civilianContent: {
        alignItems: 'center',
        gap: 10,
    },
    wordLabel: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    secretWord: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#2C1A0E',
        textAlign: 'center',
    },
    categoryLabel: {
        fontSize: 14,
        color: '#999',
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 5,
    },
    actionButton: {
        backgroundColor: '#E53E3E',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 12,
        marginBottom: 15,
        width: '100%',
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    hintText: {
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        fontSize: 14,
    },
    text: {
        color: '#FFF',
    },
});
