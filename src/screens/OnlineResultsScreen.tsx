import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useOnlineGame } from '../context/OnlineGameContext';
import { AVATAR_ASSETS } from '../utils/avatarAssets';
import { useTranslation } from '../hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { EmojiReactionBar } from '../components/EmojiReactionBar';
import { getWordCategoryDisplayLabel } from '../utils/wordCategoryLabel';

export default function OnlineResultsScreen() {
    const navigation = useNavigation<any>();
    const { gameState, nextRound, resetToLobby, submitEliminationChoice } = useOnlineGame();
    const { t } = useTranslation();

    const room = gameState.room;
    const myId = gameState.playerId!;

    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1, tension: 50, friction: 7, useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1, duration: 600, useNativeDriver: true,
            }),
        ]).start();
    }, []);

    useEffect(() => {
        if (!room) return;
        if (room.status === 'playing') navigation.replace('OnlineReveal');
        else if (room.status === 'clues' || room.status === 'simultaneous_reveal') navigation.replace('OnlineClue');
        else if (room.status === 'voting') navigation.replace('OnlineVoting');
        else if (room.status === 'waiting') navigation.replace('OnlineLobby');
        else if (room.status === 'finished') navigation.replace('OnlineLobby');
    }, [room?.status]);

    if (!room || (room.status !== 'results' && room.status !== 'elimination_choice')) return null;

    const isEliminationChoicePhase = room.status === 'elimination_choice';

    const players = Object.values(room.players);
    const voteCounts = room.voteCounts || {};
    const isTie = room.isTie;
    const eliminatedId = room.lastEliminatedId;
    const eliminatedPlayer = players.find(p => p.id === eliminatedId);
    const impostorIds = room.currentImpostors || [];
    const amIImpostor = impostorIds.includes(myId);
    const eliminatedIsImpostor = impostorIds.includes(eliminatedId || '');

    const civiliansWon = !isTie && eliminatedIsImpostor;
    const impostorsWon = !isTie && !eliminatedIsImpostor;

    const iWon = amIImpostor ? impostorsWon : civiliansWon;

    const choiceEligible = players.filter(p => !p.isEliminated && p.isConnected !== false);
    const myEliminationChoice = room.eliminationChoiceVotes?.[myId];
    const iCanVoteEliminationChoice =
        isEliminationChoicePhase && choiceEligible.some(p => p.id === myId);

    const bgColor = isEliminationChoicePhase ? '#2C1A0E' : (iWon ? '#0F2027' : '#1A0000');
    const accentColor = isEliminationChoicePhase ? '#F6AD55' : (iWon ? '#48BB78' : '#E53E3E');
    const titleEmoji = isEliminationChoicePhase ? '❓' : (iWon ? '🎉' : '💀');
    const isTieResult = isTie;

    const sortedPlayers = [...players].sort((a, b) =>
        (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0)
    );

    const impostors = players.filter(p => impostorIds.includes(p.id));

    const getTitle = () => {
        if (isEliminationChoicePhase) return t.online.wrong_civilian_choice_title;
        if (isTieResult) return t.online.tie_result;
        if (amIImpostor) return iWon ? t.online.impostor_escaped : t.online.you_were_caught;
        return iWon ? t.online.civilians_win_title : t.online.impostors_win_title;
    };

    const getSubtitle = () => {
        if (isEliminationChoicePhase) return t.online.wrong_civilian_choice_subtitle;
        if (isTieResult) return 'Nadie fue eliminado esta ronda';
        if (civiliansWon) return t.online.good_job_civils;
        if (impostorsWon) return t.online.impostor_won;
        return '';
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
            <ScrollView contentContainerStyle={styles.scroll}>

                <Animated.View style={[
                    styles.resultCard,
                    { borderColor: accentColor, transform: [{ scale: scaleAnim }] }
                ]}>
                    <Text style={styles.resultEmoji}>
                        {isTieResult && !isEliminationChoicePhase ? '🤝' : titleEmoji}
                    </Text>
                    <Text style={[styles.resultTitle, { color: accentColor }]}>
                        {getTitle()}
                    </Text>
                    <Text style={styles.resultSubtitle}>{getSubtitle()}</Text>
                </Animated.View>

                <Animated.View style={{ opacity: fadeAnim }}>
                    {!isTieResult && eliminatedPlayer && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>
                                {eliminatedIsImpostor
                                    ? t.online.civilian_caught_impostor
                                    : t.online.civilian_eliminated_msg}
                            </Text>
                            <View style={[
                                styles.eliminatedCard,
                                { borderColor: eliminatedIsImpostor ? '#48BB78' : '#E53E3E' }
                            ]}>
                                <Image
                                    source={AVATAR_ASSETS[eliminatedPlayer.avatar]}
                                    style={styles.eliminatedAvatar}
                                />
                                <View style={styles.eliminatedInfo}>
                                    <Text style={styles.eliminatedName}>{eliminatedPlayer.name}</Text>
                                    <Text style={[
                                        styles.eliminatedRole,
                                        { color: eliminatedIsImpostor ? '#FC8181' : '#68D391' }
                                    ]}>
                                        {eliminatedIsImpostor ? '🔴 IMPOSTOR' : '🟢 CIVIL'}
                                    </Text>
                                </View>
                                <Ionicons
                                    name={eliminatedIsImpostor ? 'checkmark-circle' : 'close-circle'}
                                    size={28}
                                    color={eliminatedIsImpostor ? '#48BB78' : '#E53E3E'}
                                />
                            </View>
                        </View>
                    )}

                    {!isEliminationChoicePhase && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>{t.online.the_impostor_was}</Text>
                        {impostors.map(imp => (
                            <View key={imp.id} style={styles.impostorRevealCard}>
                                <Image source={AVATAR_ASSETS[imp.avatar]} style={styles.impostorAvatar} />
                                <Text style={styles.impostorName}>
                                    {imp.name} {imp.id === myId ? `(${t.online.you})` : ''}
                                </Text>
                                <Ionicons name="skull" size={20} color="#FC8181" />
                            </View>
                        ))}
                    </View>
                    )}

                    {!isEliminationChoicePhase && room.currentWord && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>{t.online.the_word_was}</Text>
                            <View style={styles.wordCard}>
                                <Text style={styles.secretWord}>{room.currentWord.word}</Text>
                                <Text style={styles.wordCategory}>
                                    {getWordCategoryDisplayLabel(
                                        room.currentWord,
                                        t.setup.categories_list as Record<string, string>,
                                        room.settings.customCategories
                                    )}
                                </Text>
                            </View>
                        </View>
                    )}

                    {!isEliminationChoicePhase && players.some(p => p.clue) && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>{t.online.clues_so_far}</Text>
                            {sortedPlayers.filter(p => p.clue).map(p => {
                                const isImp = impostorIds.includes(p.id);
                                return (
                                    <View key={p.id} style={[
                                        styles.clueRevealCard,
                                        isImp && styles.clueRevealCardImpostor
                                    ]}>
                                        <Image source={AVATAR_ASSETS[p.avatar]} style={styles.clueRevealAvatar} />
                                        <View style={styles.clueRevealContent}>
                                            <View style={styles.clueRevealNameRow}>
                                                <Text style={styles.clueRevealName}>{p.name}</Text>
                                                {isImp && (
                                                    <View style={styles.impostorBadge}>
                                                        <Text style={styles.impostorBadgeText}>IMPOSTOR</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.clueRevealText}>"{p.clue}"</Text>
                                        </View>
                                        <Text style={styles.clueVoteCount}>
                                            {voteCounts[p.id] || 0} 🗳
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {!isEliminationChoicePhase && !room.settings.isPremiumRoom && (
                        <TouchableOpacity
                            style={styles.premiumCta}
                            onPress={() => navigation.navigate('Paywall')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.premiumCtaText}>
                                ¿Te gustó jugar online? Con <Text style={{ fontWeight: '900' }}>Premium</Text> desbloqueas más categorías, salas más grandes y sin anuncios para todos.
                            </Text>
                        </TouchableOpacity>
                    )}

                    <EmojiReactionBar />

                    <View style={styles.footer}>
                        {isEliminationChoicePhase ? (
                            iCanVoteEliminationChoice && !myEliminationChoice ? (
                                <View style={styles.eliminationChoiceRow}>
                                    <TouchableOpacity
                                        style={[styles.eliminationChoiceBtn, styles.eliminationChoiceBtnContinue]}
                                        onPress={() => submitEliminationChoice('continue_same')}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="play-forward" size={22} color="#1A202C" />
                                        <Text style={styles.eliminationChoiceBtnTextDark}>{t.online.continue_same_word_btn}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.eliminationChoiceBtn, styles.eliminationChoiceBtnReveal]}
                                        onPress={() => submitEliminationChoice('reveal_impostor')}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="eye" size={22} color="#FFF" />
                                        <Text style={styles.eliminationChoiceBtnText}>{t.online.reveal_impostor_btn}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : isEliminationChoicePhase && !choiceEligible.some(p => p.id === myId) ? (
                                <View style={styles.waitingHostBox}>
                                    <Text style={styles.waitingHostTitle}>{t.online.elimination_choice_eliminated_title}</Text>
                                    <Text style={styles.waitingHostHint}>{t.online.elimination_choice_eliminated_hint}</Text>
                                </View>
                            ) : (
                                <View style={styles.waitingHostBox}>
                                    <Text style={styles.waitingHostTitle}>{t.online.elimination_choice_waiting}</Text>
                                    <Text style={styles.waitingHostHint}>{t.online.elimination_choice_waiting_hint}</Text>
                                </View>
                            )
                        ) : gameState.isHost ? (
                            <View style={styles.hostActions}>
                                <TouchableOpacity
                                    style={[styles.hostChoiceBtn, styles.hostChoiceBtnPlay]}
                                    onPress={() => { nextRound().catch(() => {}); }}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="refresh" size={20} color="#FFF" />
                                    <Text style={styles.hostChoiceBtnText}>{t.online.play_again}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.hostChoiceBtn, styles.hostChoiceBtnLobby]}
                                    onPress={() => { resetToLobby().catch(() => {}); }}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="exit-outline" size={20} color="#FFF" />
                                    <Text style={styles.hostChoiceBtnText}>{t.online.back_lobby}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.waitingHostBox}>
                                <Text style={styles.waitingHostTitle}>{t.online.waiting_host_results}</Text>
                                <Text style={styles.waitingHostHint}>{t.online.waiting_host_results_hint}</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 20, paddingBottom: 40 },
    resultCard: {
        borderRadius: 24,
        borderWidth: 2,
        padding: 28,
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    resultEmoji: { fontSize: 64, marginBottom: 12 },
    resultTitle: {
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 1,
        marginBottom: 8,
    },
    resultSubtitle: {
        color: '#A0AEC0',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    section: { marginBottom: 20 },
    sectionLabel: {
        color: '#718096',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    eliminatedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: 14,
        borderWidth: 2,
    },
    eliminatedAvatar: {
        width: 52, height: 52, borderRadius: 10, backgroundColor: '#2D3748', marginRight: 14,
    },
    eliminatedInfo: { flex: 1 },
    eliminatedName: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    eliminatedRole: { fontSize: 13, fontWeight: '700', marginTop: 2 },
    impostorRevealCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(229,62,62,0.15)',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(229,62,62,0.3)',
    },
    impostorAvatar: {
        width: 44, height: 44, borderRadius: 10, backgroundColor: '#2D3748', marginRight: 12,
    },
    impostorName: { flex: 1, color: '#FC8181', fontSize: 16, fontWeight: '700' },
    wordCard: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    secretWord: { color: '#FFF', fontSize: 32, fontWeight: '900', marginBottom: 6 },
    wordCategory: {
        color: '#718096',
        fontSize: 13,
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    clueRevealCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    clueRevealCardImpostor: {
        backgroundColor: 'rgba(229,62,62,0.12)',
        borderColor: 'rgba(229,62,62,0.3)',
    },
    clueRevealAvatar: {
        width: 38, height: 38, borderRadius: 10, backgroundColor: '#2D3748', marginRight: 12,
    },
    clueRevealContent: { flex: 1 },
    clueRevealNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    clueRevealName: { color: '#A0AEC0', fontSize: 12, fontWeight: '600', marginRight: 6 },
    impostorBadge: {
        backgroundColor: '#E53E3E',
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    impostorBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
    clueRevealText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    clueVoteCount: { color: '#718096', fontSize: 13 },
    footer: { marginTop: 10 },
    hostActions: {
        flexDirection: 'row',
        gap: 10,
    },
    hostChoiceBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 2,
    },
    hostChoiceBtnPlay: {
        backgroundColor: 'rgba(72,187,120,0.25)',
        borderColor: 'rgba(72,187,120,0.5)',
    },
    hostChoiceBtnLobby: {
        backgroundColor: 'rgba(113,128,150,0.25)',
        borderColor: 'rgba(113,128,150,0.45)',
    },
    hostChoiceBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
    },
    waitingHostBox: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    waitingHostTitle: {
        color: '#E2E8F0',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    waitingHostHint: {
        color: '#718096',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    premiumCta: {
        backgroundColor: 'rgba(91,127,219,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(91,127,219,0.3)',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
    },
    premiumCtaText: {
        color: '#C3DAFE',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    eliminationChoiceRow: {
        flexDirection: 'column',
        gap: 12,
    },
    eliminationChoiceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 2,
    },
    eliminationChoiceBtnContinue: {
        backgroundColor: 'rgba(246,173,85,0.35)',
        borderColor: 'rgba(246,173,85,0.7)',
    },
    eliminationChoiceBtnReveal: {
        backgroundColor: 'rgba(229,62,62,0.35)',
        borderColor: 'rgba(229,62,62,0.55)',
    },
    eliminationChoiceBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '800',
    },
    eliminationChoiceBtnTextDark: {
        color: '#1A202C',
        fontSize: 14,
        fontWeight: '800',
    },
});
