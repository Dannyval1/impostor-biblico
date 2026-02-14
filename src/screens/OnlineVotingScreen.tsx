import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useOnlineGame } from '../context/OnlineGameContext';
import { AVATAR_ASSETS } from '../utils/avatarAssets';
import { OnlinePlayer } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';

export default function OnlineVotingScreen() {
    const navigation = useNavigation<any>();
    const { gameState, submitVote, eliminatePlayer, nextRound, playAgain } = useOnlineGame();
    const { t } = useTranslation();
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);

    const players = gameState.room ? Object.values(gameState.room.players) : [];
    const currentPlayer = gameState.room?.players[gameState.playerId || ''];

    useEffect(() => {
        if (gameState.room?.status === 'finished') {
            // Game Over
            const winner = gameState.room.winner === 'impostors' ? t.voting.winner_impostors : t.voting.winner_civilians;
            Alert.alert(t.voting.game_over, winner, [
                { text: t.online.errors.back_to_lobby, onPress: () => navigation.replace('OnlineLobby') }
            ]);
        } else if (gameState.room?.status === 'playing') {
            // Back to playing (Next Round)
            navigation.replace('OnlineLobby');
        }
    }, [gameState.room?.status]);

    const handleVote = async () => {
        if (selectedPlayerId) {
            submitVote(selectedPlayerId);
            setHasVoted(true);
        }
    };

    const renderPlayerItem = ({ item }: { item: OnlinePlayer }) => {
        const isSelected = selectedPlayerId === item.id;
        const isMe = item.id === gameState.playerId;
        const isEliminated = item.isEliminated;

        // Can't vote for myself or eliminated players
        const canVote = !hasVoted && !isMe && !isEliminated && !currentPlayer?.isEliminated;

        return (
            <TouchableOpacity
                style={[
                    styles.playerCard,
                    isSelected && styles.playerCardSelected,
                    isEliminated && styles.playerCardEliminated
                ]}
                onPress={() => canVote && setSelectedPlayerId(item.id)}
                disabled={!canVote}
                activeOpacity={canVote ? 0.7 : 1}
            >
                <View style={styles.avatarContainer}>
                    <Image source={AVATAR_ASSETS[item.avatar]} style={[styles.avatarImage, isEliminated && { opacity: 0.5 }]} />
                    {item.vote && !isEliminated && (
                        <View style={styles.votedBadge}>
                            <Ionicons name="checkmark" size={12} color="#FFF" />
                        </View>
                    )}
                </View>
                <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, isEliminated && styles.playerNameEliminated]}>
                        {item.name} {isMe && t.online.you}
                    </Text>
                    {isEliminated && <Text style={styles.eliminatedText}>{t.online.errors.eliminated_badge}</Text>}
                </View>
                {isSelected && <Ionicons name="radio-button-on" size={24} color="#5B7FDB" />}
                {!isSelected && canVote && <Ionicons name="radio-button-off" size={24} color="#CCC" />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t.voting.vote_title}</Text>
                <Text style={styles.subTitle}>{t.voting.vote_subtitle}</Text>
            </View>

            <FlatList
                data={players}
                keyExtractor={item => item.id}
                renderItem={renderPlayerItem}
                contentContainerStyle={styles.listContent}
            />

            <View style={styles.footer}>
                {!hasVoted && !currentPlayer?.isEliminated ? (
                    <TouchableOpacity
                        style={[styles.voteButton, !selectedPlayerId && styles.disabledButton]}
                        onPress={handleVote}
                        disabled={!selectedPlayerId}
                    >
                        <Text style={styles.voteButtonText}>{t.online.errors.vote_button}</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.waitingContainer}>
                        <Text style={styles.waitingText}>
                            {currentPlayer?.isEliminated ? t.online.errors.you_are_eliminated : t.online.errors.vote_submitted}
                        </Text>
                        {!currentPlayer?.isEliminated && <ActivityIndicator color="#FFF" style={{ marginTop: 10 }} />}
                    </View>
                )}

                {/* Host Controls for Manual Override if needed */}
                {gameState.isHost && (
                    <View style={styles.hostControls}>
                        <Text style={styles.hostLabel}>{t.online.errors.host_controls}</Text>
                        <View style={styles.hostButtonsRow}>
                            <TouchableOpacity
                                style={[styles.hostButton, { backgroundColor: '#E53E3E' }]}
                                onPress={() => {
                                    // Manual elimination of selected
                                    if (selectedPlayerId) eliminatePlayer(selectedPlayerId);
                                    else Alert.alert(t.online.errors.select_player_alert);
                                }}
                            >
                                <Text style={styles.hostButtonText}>{t.online.errors.eliminate_selected}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.hostButton, { backgroundColor: '#48BB78' }]}
                                onPress={nextRound}
                            >
                                <Text style={styles.hostButtonText}>{t.voting.next_round}</Text>
                            </TouchableOpacity>
                        </View>
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
        borderRadius: 25,
        backgroundColor: '#F0F4FF',
        marginRight: 15,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    votedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#48BB78',
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
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
    hostControls: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    hostLabel: {
        color: '#F9E675',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    hostButtonsRow: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'space-between',
    },
    hostButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    hostButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
});
