import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useGame } from '../context/GameContext';
import { AVATAR_ASSETS } from '../utils/avatarAssets';
import { OnlinePlayer } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { EmojiReactionBar } from '../components/EmojiReactionBar';
import { QuickMessagePanel } from '../components/QuickMessagePanel';
import { OnlineRoomPlaceholder } from '../components/OnlineRoomPlaceholder';
import { GameModal } from '../components/GameModal';
import { OnlineRoundAnswersModal } from '../components/OnlineRoundAnswersModal';
import { ChatPanel } from '../components/ChatPanel';
import { EliminatedSpectatorHeader } from '../components/EliminatedSpectatorHeader';
import { getRoundAnswerEntries } from '../utils/onlineRoundAnswers';
import { useEliminationIntro } from '../hooks/useEliminationIntro';

const VOTING_UI_TIMEOUT_MS = 30_000;

export default function OnlineVotingScreen() {
    const navigation = useNavigation<any>();
    const { gameState, submitVote, leaveRoom } = useOnlineGame();
    const { t } = useTranslation();
    const { setOnlineGameActive } = useGame()!;

    useEffect(() => {
        setOnlineGameActive(true);
        return () => setOnlineGameActive(false);
    }, []);

    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [voteSecondsLeft, setVoteSecondsLeft] = useState(30);
    const [answersOpen, setAnswersOpen] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    const room = gameState.room;
    const pid = gameState.playerId;
    const meEliminatedForIntro =
        !!room && pid != null && room.players[pid]?.isEliminated === true;
    const { introActive, slideY } = useEliminationIntro(meEliminatedForIntro);

    const players = room ? Object.values(room.players) : [];
    const currentPlayer = room?.players[gameState.playerId || ''];
    const votePhaseStart = room?.votingPhaseStartTime;
    const isEliminated = currentPlayer?.isEliminated === true;
    const secretReminderText = currentPlayer?.role === 'impostor'
        ? t.online.word_reminder_impostor
        : room?.currentWord?.word;
    const cluesFingerprint = room
        ? Object.values(room.players)
              .map(p => `${p.id}:${p.clue ?? ''}`)
              .sort()
              .join('|')
        : '';
    const roundAnswerEntries = useMemo(
        () => (room ? getRoundAnswerEntries(room) : []),
        [room, cluesFingerprint]
    );
    const pendingVoters = useMemo(
        () => players.filter(p => !p.isEliminated && p.isConnected !== false && !p.vote),
        [players]
    );

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
        } else if (
            gameState.room?.status === 'clues' ||
            gameState.room?.status === 'simultaneous_reveal' ||
            gameState.room?.status === 'clue_review' ||
            gameState.room?.status === 'deciding'
        ) {
            navigation.replace('OnlineClue');
        } else if (gameState.room?.status === 'playing') {
            navigation.replace('OnlineReveal');
        }
    }, [gameState.roomCode, gameState.room?.status]);

    if (!room) {
        return <OnlineRoomPlaceholder />;
    }

    const handleLeave = () => setShowLeaveConfirm(true);

    const confirmLeave = async () => {
        setShowLeaveConfirm(false);
        await leaveRoom();
        navigation.replace('Home');
    };

    const handleVote = async () => {
        if (isEliminated) return;
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

    return (
        <SafeAreaView style={styles.container}>
            {isEliminated && !introActive && (
                <EliminatedSpectatorHeader
                    title={t.online.spectator_watermark_title}
                    bannerLabel={t.online.spectator_banner}
                />
            )}
            <View style={styles.gameLayer}>
                {isEliminated && !introActive && <View style={styles.spectatorDim} pointerEvents="none" />}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t.voting.vote_title}</Text>
                <Text style={styles.subTitle}>{t.voting.vote_subtitle}</Text>
                {secretReminderText && !isEliminated && (
                    <View style={styles.secretReminderBar}>
                        <Text style={styles.secretReminderLabel}>{t.online.word_reminder_label}</Text>
                        <Text style={styles.secretReminderText} numberOfLines={1}>{secretReminderText}</Text>
                    </View>
                )}
                {gameState.room?.status === 'voting' && votePhaseStart != null && (
                    <>
                        <Text style={styles.voteTimerHint}>
                            {t.online.voting_time_left.replace('{s}', String(voteSecondsLeft))}
                        </Text>
                        {pendingVoters.length > 0 && (
                            <Text style={styles.pendingVoteHint}>
                                {(t.online.voting_missing_players ?? 'Falta votar: {players}')
                                    .replace('{players}', pendingVoters.map(p => p.name.trim()).join(', '))}
                            </Text>
                        )}
                    </>
                )}
                <View style={styles.headerActionsRow}>
                    <TouchableOpacity
                        style={styles.answersHeaderBtn}
                        onPress={() => setAnswersOpen(true)}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="document-text-outline" size={18} color="#FFF" />
                        <Text style={styles.answersHeaderBtnText}>{t.online.round_answers_btn}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLeave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.exitBtn}>{t.common.exit}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={players}
                keyExtractor={item => item.id}
                renderItem={renderPlayerItem}
                contentContainerStyle={styles.listContent}
            />

            <QuickMessagePanel variant="voting" isEliminated={isEliminated} />
            <EmojiReactionBar />
            <ChatPanel
                defaultExpanded={false}
                style={{ marginHorizontal: 12, marginBottom: 4 }}
                onUpgradePress={() => navigation.navigate('Paywall')}
            />

            <View style={styles.footer}>
                {isEliminated && introActive ? null : isEliminated ? (
                    <View style={styles.spectatorVoteFooter}>
                        <Ionicons name="eye-outline" size={26} color="#F6E05E" />
                        <Text style={styles.spectatorVoteFooterText}>{t.online.spectator_vote_hint}</Text>
                        <ActivityIndicator color="rgba(255,255,255,0.5)" style={{ marginTop: 12 }} />
                    </View>
                ) : !hasVoted ? (
                    <TouchableOpacity
                        style={[styles.voteButton, (!selectedPlayerId || isEliminated) && styles.disabledButton]}
                        onPress={handleVote}
                        disabled={!selectedPlayerId || isEliminated}
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
            </View>
            {isEliminated && introActive && (
                <Animated.View
                    style={[styles.eliminationIntroOverlay, { transform: [{ translateY: slideY }] }]}
                    pointerEvents="auto"
                >
                    <Ionicons name="close-circle" size={72} color="#E53E3E" />
                    <Text style={styles.eliminationIntroTitle}>{t.online.you_are_eliminated}</Text>
                </Animated.View>
            )}
            <OnlineRoundAnswersModal
                visible={answersOpen}
                onClose={() => setAnswersOpen(false)}
                title={t.online.round_answers_title}
                emptyLabel={t.online.round_answers_empty}
                entries={roundAnswerEntries}
            />
            <GameModal
                visible={showLeaveConfirm}
                title={t.voting.exit_confirm}
                message={gameState.isHost ? t.online.exit_host_confirm : t.online.exit_player_game_msg}
                type="warning"
                buttonText={t.common.exit}
                onClose={confirmLeave}
                secondaryButtonText={t.common.cancel}
                onSecondaryPress={() => setShowLeaveConfirm(false)}
                onRequestClose={() => setShowLeaveConfirm(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#2C1A0E',
    },
    gameLayer: {
        flex: 1,
        position: 'relative',
    },
    spectatorDim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.14)',
        borderLeftWidth: 3,
        borderLeftColor: 'rgba(229,62,62,0.45)',
        zIndex: 1,
    },
    headerActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        gap: 12,
    },
    answersHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(91,127,219,0.45)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(91,127,219,0.6)',
    },
    exitBtn: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
    },
    answersHeaderBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
        marginLeft: 8,
    },
    eliminationIntroOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 200,
        backgroundColor: '#2C1A0E',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    eliminationIntroTitle: {
        marginTop: 20,
        color: '#FFF',
        fontSize: 26,
        fontWeight: '900',
        textAlign: 'center',
    },
    spectatorVoteFooter: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    spectatorVoteFooterText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 12,
        lineHeight: 22,
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
    secretReminderBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.07)',
        gap: 6,
    },
    secretReminderLabel: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 11,
        fontWeight: '700',
    },
    secretReminderText: {
        color: 'rgba(255,255,255,0.72)',
        fontSize: 12,
        fontWeight: '800',
        maxWidth: 180,
    },
    voteTimerHint: {
        fontSize: 13,
        color: '#F6E05E',
        marginTop: 10,
        textAlign: 'center',
        paddingHorizontal: 16,
        fontWeight: '600',
    },
    pendingVoteHint: {
        color: 'rgba(255,255,255,0.58)',
        fontSize: 12,
        marginTop: 4,
        paddingHorizontal: 18,
        textAlign: 'center',
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
});
