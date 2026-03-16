import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useOnlineGame } from '../context/OnlineGameContext';
import { AVATAR_ASSETS } from '../utils/avatarAssets';
import { useTranslation } from '../hooks/useTranslation';

export default function OnlineResultsScreen() {
    const navigation = useNavigation<any>();
    const { gameState, nextRound, continueRound } = useOnlineGame();
    const { t } = useTranslation();

    const room = gameState.room;

    useEffect(() => {
        if (!room) return;
        if (room.status === 'finished') {
            const winner = room.winner === 'impostors' ? t.voting.winner_impostors : t.voting.winner_civilians;
            Alert.alert(t.voting.game_over, winner, [
                { text: t.online.back_to_lobby, onPress: () => navigation.replace('OnlineLobby') }
            ]);
        } else if (room.status === 'playing') {
            navigation.replace('OnlineReveal');
        } else if (room.status === 'voting') {
            navigation.replace('OnlineVoting');
        } else if (room.status === 'waiting') {
            navigation.replace('OnlineLobby');
        }
    }, [room?.status]);

    if (!room || room.status !== 'results') return null;

    const players = Object.values(room.players);
    const voteCounts = room.voteCounts || {};

    // Sort players by vote count
    const sortedPlayers = [...players].sort((a, b) => {
        const votesA = voteCounts[a.id] || 0;
        const votesB = voteCounts[b.id] || 0;
        return votesB - votesA;
    });

    const isTie = room.isTie;
    const eliminatedId = room.lastEliminatedId;
    const eliminatedPlayer = players.find(p => p.id === eliminatedId);

    const renderPlayerItem = ({ item }: { item: any }) => {
        const votesReceived = voteCounts[item.id] || 0;
        const isEliminatedThisRound = item.id === eliminatedId;
        const isMe = item.id === gameState.playerId;

        return (
            <View style={[styles.playerCard, isEliminatedThisRound && styles.playerCardEliminated]}>
                <View style={styles.avatarContainer}>
                    <Image source={AVATAR_ASSETS[item.avatar]} style={styles.avatarImage} />
                </View>
                <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>
                        {item.name} {isMe && t.online.you}
                    </Text>
                    {isEliminatedThisRound && (
                        <Text style={styles.eliminatedText}>{t.online.eliminated_badge}</Text>
                    )}
                </View>
                <View style={styles.voteBubble}>
                    <Text style={styles.voteText}>{votesReceived} {votesReceived === 1 ? 'voto' : 'votos'}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Resultados</Text>
                <Text style={styles.subTitle}>
                    {isTie
                        ? '¡Hubo un empate!'
                        : eliminatedPlayer
                            ? `${eliminatedPlayer.name} fue eliminado.`
                            : 'Votación finalizada.'}
                </Text>
            </View>

            <FlatList
                data={sortedPlayers}
                keyExtractor={item => item.id}
                renderItem={renderPlayerItem}
                contentContainerStyle={styles.listContent}
            />

            <View style={styles.footer}>
                {!gameState.isHost ? (
                    <Text style={styles.waitingText}>{t.online.waiting_host}</Text>
                ) : (
                    <View style={styles.hostControls}>
                        <TouchableOpacity
                            style={[styles.hostButton, { backgroundColor: '#E53E3E' }]}
                            onPress={nextRound}
                        >
                            <Text style={styles.hostButtonText}>{t.voting.next_round}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.hostButton, { backgroundColor: '#48BB78' }]}
                            onPress={continueRound}
                        >
                            <Text style={styles.hostButtonText}>Continuar</Text>
                        </TouchableOpacity>
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
        color: '#F9E675',
        marginTop: 5,
        fontWeight: 'bold',
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
    playerCardEliminated: {
        backgroundColor: '#FFD2D2',
        borderWidth: 2,
        borderColor: '#E53E3E',
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
    playerInfo: {
        flex: 1,
    },
    playerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    eliminatedText: {
        fontSize: 12,
        color: '#E53E3E',
        fontWeight: 'bold',
    },
    voteBubble: {
        backgroundColor: '#5B7FDB',
        borderRadius: 15,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    voteText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    footer: {
        padding: 20,
        backgroundColor: '#1A1008',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    waitingText: {
        color: '#FFF',
        fontSize: 16,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    hostControls: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'space-between',
    },
    hostButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    hostButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
