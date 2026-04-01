import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useOnlineGame } from '../context/OnlineGameContext';
import { AVATAR_ASSETS } from '../utils/avatarAssets';
import { OnlinePlayer } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { EmojiReactionBar } from '../components/EmojiReactionBar';
import { OnlineRoomPlaceholder } from '../components/OnlineRoomPlaceholder';

const VOTING_UI_TIMEOUT_MS = 30_000;

export default function OnlineVotingScreen() {
    const navigation = useNavigation<any>();
    const { gameState, submitVote } = useOnlineGame();
    const { t } = useTranslation();

    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [voteSecondsLeft, setVoteSecondsLeft] = useState(30);

    const room = gameState.room;
    const players = room ? Object.values(room.players) : [];
    const currentPlayer = room?.players[gameState.playerId || ''];
    const votePhaseStart = room?.votingPhaseStartTime;
    const isEliminated = currentPlayer?.isEliminated;

    useEffect(() => {
        if (!votePhaseStart) {
            setVoteSecondsLeft(30);
            return;
        }
        const tick = () => {
            const elapsed = Date.now() - votePhaseStart;
            setVoteSecondsLeft(Math.max(0, Math.ceil((VOTING_UI_TIMEOUT_MS - elapsed) / 1000)));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [votePhaseStart]);

    useEffect(() => {
        if (!gameState.roomCode) return;
        if (gameState.room?.status === 'finished' || gameState.room?.status === 'results' || gameState.room?.status === 'elimination_choice') {
            navigation.replace('OnlineResults');
        } else if (gameState.room?.status === 'playing') {
            navigation.replace('OnlineReveal');
        }
    }, [gameState.roomCode, gameState.room?.status]);

    if (!room) {
        return <OnlineRoomPlaceholder />;
    }

    const handleVote = async () => {
        if (selectedPlayerId) {
            submitVote(selectedPlayerId);
            setHasVoted(true);
        }
    };

    const renderPlayerItem = ({ item }: { item: OnlinePlayer }) => {
        const isSelected = selectedPlayerId === item.id;
        const isMe = item.id === gameState.playerId;
        const isPlayerEliminated = item.isEliminated;

        // Can't vote for myself or eliminated players
        const canVote = !hasVoted && !isMe && !isPlayerEliminated && !isEliminated;

        return (
            <TouchableOpacity
                style={[
                    styles.playerCard,
                    isSelected && styles.playerCardSelected,
                    isPlayerEliminated && styles.playerCardEliminated
                ]}
                onPress={() => canVote && setSelectedPlayerId(item.id)}
                disabled={!canVote}
                activeOpacity={canVote ? 0.7 : 1}
            >
                <View style={styles.avatarContainer}>
                    <Image source={AVATAR_ASSETS[item.avatar]} style={[styles.avatarImage, isPlayerEliminated && { opacity: 0.5 }]} />
                    {item.vote && !isPlayerEliminated && (
                        <View style={styles.votedBadge}>
                            <Ionicons name="checkmark" size={12} color="#FFF" />
                        </View>
                    )}
                </View>
                <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, isPlayerEliminated && styles.playerNameEliminated]}>
                        {item.name} {isMe && t.online.you}
                    </Text>
                    {isPlayerEliminated && <Text style={styles.eliminatedText}>{t.online.eliminated_badge}</Text>}
                </View>
                {isSelected && <Ionicons name="radio-button-on" size={24} color="#5B7FDB" />}
                {!isSelected && canVote && <Ionicons name="radio-button-off" size={24} color="#CCC" />}
            </TouchableOpacity>
        );
    };

    // ── Eliminated player overlay ──────────────────────────────────
    if (isEliminated) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.eliminatedOverlay}>
                    <View style={styles.eliminatedAvatarContainer}>
                        {currentPlayer?.avatar && (
                            <Image
                                source={AVATAR_ASSETS[currentPlayer.avatar]}
                                style={styles.eliminatedAvatar}
                            />
                        )}
                        <View style={styles.eliminatedAvatarBadge}>
                            <Ionicons name="close-circle" size={32} color="#E53E3E" />
                        </View>
                    </View>
                    <Text style={styles.eliminatedTitle}>{t.online.you_are_eliminated}</Text>
                    <Text style={styles.eliminatedSubtitle}>
                        {t.online.vote_submitted?.replace('Voto enviado. ', '').replace('Vote submitted. ', '') || 'Esperando resultado...'}
                    </Text>
                    <ActivityIndicator color="rgba(255,255,255,0.5)" size="large" style={{ marginTop: 24 }} />
                </View>
                <EmojiReactionBar />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t.voting.vote_title}</Text>
                <Text style={styles.subTitle}>{t.voting.vote_subtitle}</Text>
                {gameState.room?.status === 'voting' && votePhaseStart != null && (
                    <Text style={styles.voteTimerHint}>
                        {t.online.voting_time_left.replace('{s}', String(voteSecondsLeft))}
                    </Text>
                )}
            </View>

            <FlatList
                data={players}
                keyExtractor={item => item.id}
                renderItem={renderPlayerItem}
                contentContainerStyle={styles.listContent}
            />

            <EmojiReactionBar />

            <View style={styles.footer}>
                {!hasVoted ? (
                    <TouchableOpacity
                        style={[styles.voteButton, !selectedPlayerId && styles.disabledButton]}
                        onPress={handleVote}
                        disabled={!selectedPlayerId}
                    >
                        <Text style={styles.voteButtonText}>{t.online.vote_button}</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.waitingContainer}>
                        <Text style={styles.waitingText}>
                            {t.online.vote_submitted}
                        </Text>
                        <ActivityIndicator color="#FFF" style={{ marginTop: 10 }} />
                    </View>
                )}

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#2C1A0E',
    },
    header: {
        alignItems: 'center',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    subTitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 5,
    },
    voteTimerHint: {
        fontSize: 13,
        color: '#F6E05E',
        marginTop: 10,
        textAlign: 'center',
        paddingHorizontal: 16,
        fontWeight: '600',
    },
    listContent: {
        padding: 20,
    },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 12,
        marginBottom: 10,
    },
    playerCardSelected: {
        borderWidth: 3,
        borderColor: '#5B7FDB',
        backgroundColor: '#F0F4FF',
    },
    playerCardEliminated: {
        backgroundColor: '#CCC',
        opacity: 0.7,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        marginRight: 15,
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F0F4FF',
        resizeMode: 'contain',
    },
    votedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#48BB78',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    playerNameEliminated: {
        textDecorationLine: 'line-through',
        color: '#666',
    },
    eliminatedText: {
        fontSize: 10,
        color: '#E53E3E',
        fontWeight: 'bold',
    },
    footer: {
        padding: 20,
        backgroundColor: '#1A1008',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    voteButton: {
        backgroundColor: '#E53E3E',
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    disabledButton: {
        backgroundColor: '#718096',
        opacity: 0.5,
    },
    voteButtonText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 1,
    },
    waitingContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    waitingText: {
        color: '#FFF',
        fontSize: 16,
        textAlign: 'center',
    },
    // ── Eliminated overlay styles ──────────────────────────────
    eliminatedOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    eliminatedAvatarContainer: {
        width: 120,
        height: 120,
        marginBottom: 24,
    },
    eliminatedAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        opacity: 0.35,
        backgroundColor: '#555',
        resizeMode: 'contain',
    },
    eliminatedAvatarBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: '#2C1A0E',
        borderRadius: 20,
        padding: 2,
    },
    eliminatedTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#E53E3E',
        textAlign: 'center',
        letterSpacing: 1,
    },
    eliminatedSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },
});
