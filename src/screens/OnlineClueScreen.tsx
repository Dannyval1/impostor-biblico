import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useGame } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';
import { AVATAR_ASSETS } from '../utils/avatarAssets';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmojiReactionBar } from '../components/EmojiReactionBar';
import { QuickMessagePanel } from '../components/QuickMessagePanel';
import { OnlineRoomPlaceholder } from '../components/OnlineRoomPlaceholder';
import { GameModal } from '../components/GameModal';
import { EliminatedSpectatorHeader } from '../components/EliminatedSpectatorHeader';
import { ChatPanel } from '../components/ChatPanel';
import { getRoundAnswerEntries } from '../utils/onlineRoundAnswers';
import { useEliminationIntro } from '../hooks/useEliminationIntro';

const CLUE_REVIEW_TIMEOUT_MS = 10_000;

export default function OnlineClueScreen() {
    const navigation = useNavigation<any>();
    const {
        gameState,
        submitClue,
        advanceTurn,
        startVoting,
        openRoundDecisionAfterSimultaneousReveal,
        clearVoteTieRecovery,
        leaveRoom,
    } = useOnlineGame();
    const { t } = useTranslation();
    const { setOnlineGameActive } = useGame()!;

    useEffect(() => {
        setOnlineGameActive(true);
        return () => {
            setOnlineGameActive(false);
            if (firebaseClearTimerRef.current) clearTimeout(firebaseClearTimerRef.current);
        };
    }, []);

    const [clueText, setClueText] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    // Debe declararse antes de cualquier return: si no, al perderse `room` React rompe el orden de hooks.
    const [secondsLeft, setSecondsLeft] = useState(30);
    const [reviewSecondsLeft, setReviewSecondsLeft] = useState(10);
    const [tieNoticeVisible, setTieNoticeVisible] = useState(false);
    const [tieContinueSeconds, setTieContinueSeconds] = useState(3);
    const flashAnim = useRef(new Animated.Value(1)).current;
    const tieNoticeSeenRoundRef = useRef<number | null>(null);
    const tieNoticeStartedAtRef = useRef<number | null>(null);
    const tiePauseStartedAtRef = useRef<number | null>(null);
    const firebaseClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tiePausedAccumulatedMsRef = useRef(0);
    /** Evita llamar advanceTurn/startVoting una vez por segundo cuando remaining === 0 */
    const clueTimerZeroHandledRef = useRef<string | null>(null);

    const isClueReviewPhase = gameState.room?.status === 'clue_review';

    useEffect(() => {
        if (!isClueReviewPhase || !gameState.room?.clueReviewStartTime) {
            setReviewSecondsLeft(Math.ceil(CLUE_REVIEW_TIMEOUT_MS / 1000));
            return;
        }
        const start = gameState.room.clueReviewStartTime;
        const tick = () => {
            const elapsed = Date.now() - start;
            setReviewSecondsLeft(Math.max(0, Math.ceil((CLUE_REVIEW_TIMEOUT_MS - elapsed) / 1000)));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [isClueReviewPhase, gameState.room?.clueReviewStartTime, gameState.roomCode]);

    // Derived values with optional chaining — defined before any hook so the hook count
    // never changes regardless of whether room is null (e.g. after leaveRoom()).
    const room = gameState.room;
    const myId = gameState.playerId ?? '';
    const isHost = gameState.isHost;
    const mode = room?.settings.discussionMode ?? 'turns';
    const turnOrder = room?.turnOrder ?? [];
    const currentTurnIndex = room?.currentTurnIndex ?? 0;
    const currentTurnPlayerId = turnOrder[currentTurnIndex];
    const currentTurnPlayer = room?.players[currentTurnPlayerId];
    const players = Object.values(room?.players ?? {}).filter(p => !p.isEliminated);
    const cluesFingerprint = players.map(p => `${p.id}:${p.clue ?? ''}`).sort().join('|');
    const me = room?.players[myId];
    const tieRecoveryActive = room?.voteTieRecovery === true;
    const clueDuration = room?.settings.clueDuration || (mode === 'turns' ? 30 : 60);
    const isClueReview = room?.status === 'clue_review';
    const isSimultaneousReveal = room?.status === 'simultaneous_reveal' && mode === 'simultaneous';
    const isMyTurn = mode === 'turns' ? currentTurnPlayerId === myId : true;
    const isSpectator = me?.isEliminated === true;
    const secretReminderText = me?.role === 'impostor'
        ? t.online.word_reminder_impostor
        : room?.currentWord?.word;
    const tieDetails = room?.voteTieDetails || [];

    const meEliminatedForIntro =
        !!room && myId !== '' && room.players[myId]?.isEliminated === true;
    const { introActive, slideY } = useEliminationIntro(meEliminatedForIntro);

    useEffect(() => {
        if (!tieRecoveryActive) {
            setTieNoticeVisible(false);
            setTieContinueSeconds(3);
            tieNoticeStartedAtRef.current = null;
            tiePauseStartedAtRef.current = null;
            return;
        }
        const roundKey = room?.clueRound || 0;
        if (tieNoticeSeenRoundRef.current === roundKey) return;
        tieNoticeSeenRoundRef.current = roundKey;
        tieNoticeStartedAtRef.current = Date.now();
        setTieNoticeVisible(true);
        setTieContinueSeconds(3);
        tiePauseStartedAtRef.current = Date.now();
    }, [tieRecoveryActive, room?.clueRound]);

    /** Cuenta atrás visual (3→1) y cierre automático; el host limpia `voteTieRecovery` en Firebase. */
    useEffect(() => {
        if (!tieNoticeVisible) return;
        const started = tieNoticeStartedAtRef.current ?? Date.now();
        tieNoticeStartedAtRef.current = started;
        const syncSeconds = () => {
            const sec = Math.max(0, 3 - Math.floor((Date.now() - started) / 1000));
            setTieContinueSeconds(sec);
        };
        syncSeconds();
        const iv = setInterval(() => {
            syncSeconds();
        }, 200);
        const remainingMs = Math.max(0, 3000 - (Date.now() - started));
        // Dismiss the UI overlay at 3 s for everyone already on screen.
        const dismiss = setTimeout(() => {
            setTieNoticeVisible(false);
            tieNoticeStartedAtRef.current = null;
        }, remainingMs);
        // Host clears the Firebase flag after 8 s total, giving spectators/late-navigators
        // enough time to arrive at the clue screen and still see the tie notice.
        // Stored in a ref so it survives the re-render caused by setTieNoticeVisible(false).
        if (gameState.isHost && gameState.roomCode) {
            if (firebaseClearTimerRef.current) clearTimeout(firebaseClearTimerRef.current);
            const firebaseClearDelay = Math.max(remainingMs, 8000 - (Date.now() - started));
            firebaseClearTimerRef.current = setTimeout(() => {
                void clearVoteTieRecovery();
                firebaseClearTimerRef.current = null;
            }, firebaseClearDelay);
        }
        return () => {
            clearInterval(iv);
            clearTimeout(dismiss);
        };
    }, [tieNoticeVisible, gameState.isHost, gameState.roomCode]);

    // Reset submission state when my clue is cleared (new clue round)
    useEffect(() => {
        if (me && me.clue == null && hasSubmitted) {
            setHasSubmitted(false);
            setClueText('');
        }
    }, [me?.clue]);

    // Navigate when status changes (sin roomCode = sesión cerrada; no navegar con snapshot conservado)
    useEffect(() => {
        if (!gameState.roomCode) return;
        if (room?.status === 'voting') {
            navigation.replace('OnlineVoting');
        } else if (room?.status === 'results' || room?.status === 'finished' || room?.status === 'elimination_choice') {
            navigation.replace('OnlineResults');
        }
    }, [gameState.roomCode, room?.status]);

    // Reset my submission state when turn changes (turns mode)
    useEffect(() => {
        if (mode === 'turns') {
            if (currentTurnPlayerId !== myId) {
                setHasSubmitted(false);
                setClueText('');
            }
        }
    }, [currentTurnPlayerId]);

    // Timer per turn/phase (solo durante pistas activas, no en revisión ni modal de decisión)
    useEffect(() => {
        if (!room) return;
        if (room.status !== 'clues' && room.status !== 'simultaneous_reveal') return;
        const startTime = room.cluePhaseStartTime;
        if (!startTime) return;

        const phaseKey = `${gameState.roomCode}|${startTime}|${room.currentTurnIndex ?? 0}|${room.status}|${mode}`;

        const update = () => {
            const elapsedMsRaw = Date.now() - startTime;
            const elapsedMsEffective = Math.max(0, elapsedMsRaw - tiePausedAccumulatedMsRef.current);
            const elapsed = Math.floor(elapsedMsEffective / 1000);
            const remaining = Math.max(0, clueDuration - elapsed);
            setSecondsLeft(remaining);

            if (remaining <= 10 && remaining > 0) {
                Animated.sequence([
                    Animated.timing(flashAnim, { toValue: 0.3, duration: 300, useNativeDriver: true }),
                    Animated.timing(flashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                ]).start();
            }

            if (remaining === 0 && isHost) {
                if (clueTimerZeroHandledRef.current === phaseKey) return;
                clueTimerZeroHandledRef.current = phaseKey;
                if (mode === 'turns') {
                    advanceTurn();
                } else if (mode === 'simultaneous' && room.status === 'clues') {
                    const activePlayers = Object.values(room.players).filter(
                        p => !p.isEliminated && p.isConnected !== false
                    );
                    const allIn = activePlayers.length > 0 && activePlayers.every(p => p.clue != null);
                    if (!allIn) {
                        startVoting();
                    }
                }
            }
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [room?.cluePhaseStartTime, room?.status, mode, isHost, cluesFingerprint, gameState.roomCode, room?.currentTurnIndex]);

    useEffect(() => {
        if (room?.status !== 'clues' && room?.status !== 'simultaneous_reveal') return;
        if (tieNoticeVisible) {
            if (tiePauseStartedAtRef.current == null) {
                tiePauseStartedAtRef.current = Date.now();
            }
            return;
        }
        if (tiePauseStartedAtRef.current != null) {
            tiePausedAccumulatedMsRef.current += Date.now() - tiePauseStartedAtRef.current;
            tiePauseStartedAtRef.current = null;
        }
    }, [tieNoticeVisible, room?.status]);

    useEffect(() => {
        tiePausedAccumulatedMsRef.current = 0;
        tiePauseStartedAtRef.current = null;
    }, [room?.cluePhaseStartTime, room?.status, room?.currentTurnIndex, gameState.roomCode]);

    // In turns mode, host auto-advances when the current turn player submits
    useEffect(() => {
        if (mode !== 'turns' || !isHost || !currentTurnPlayer || room?.status !== 'clues') return;
        if (currentTurnPlayer.clue != null) {
            const timeout = setTimeout(() => advanceTurn(), 1500);
            return () => clearTimeout(timeout);
        }
    }, [currentTurnPlayer?.clue, currentTurnIndex]);

    // Si el jugador del turno se desconecta, no forzar al resto a esperar su pista.
    useEffect(() => {
        if (mode !== 'turns' || !isHost || room?.status !== 'clues') return;
        if (!currentTurnPlayerId) return;
        if (!currentTurnPlayer || currentTurnPlayer.isConnected === false) {
            const timeout = setTimeout(() => advanceTurn(), 1200);
            return () => clearTimeout(timeout);
        }
    }, [mode, isHost, room?.status, currentTurnPlayerId, currentTurnPlayer?.isConnected]);

    // Early return AFTER all hooks — safe for React's hook count invariant.
    if (!room) return <OnlineRoomPlaceholder />;

    // From here room is guaranteed non-null.
    const submittedClues = players.filter(p => p.clue !== null && p.clue !== undefined);

    const handleLeave = () => setShowLeaveConfirm(true);

    const confirmLeave = async () => {
        setShowLeaveConfirm(false);
        await leaveRoom();
        navigation.replace('Home');
    };

    const handleSubmitClue = () => {
        const trimmed = clueText.trim();
        if (!trimmed) return;
        submitClue(trimmed);
        setHasSubmitted(true);
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const timerColor = secondsLeft <= 10 ? '#E53E3E' : secondsLeft <= 20 ? '#F6AD55' : '#48BB78';

    return (
        <SafeAreaView style={styles.container}>
            {isSpectator && !introActive && (
                <EliminatedSpectatorHeader
                    title={t.online.spectator_watermark_title}
                    bannerLabel={t.online.spectator_banner}
                />
            )}
            <View style={styles.gameLayer}>
                {isSpectator && !introActive && <View style={styles.spectatorDim} pointerEvents="none" />}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.phaseLabel, { flex: 1 }]}>
                        {isClueReview
                            ? t.online.clue_review_title
                            : isSimultaneousReveal
                              ? t.online.simultaneous_reveal_phase
                              : t.online.clue_phase_title}
                    </Text>
                    <Animated.Text style={[styles.timer, { color: isClueReview ? '#F6E05E' : timerColor, opacity: isClueReview ? 1 : flashAnim }]}>
                        {isClueReview
                            ? t.online.clue_review_timer.replace('{s}', String(reviewSecondsLeft))
                            : isSimultaneousReveal
                              ? '—'
                              : formatTime(secondsLeft)}
                    </Animated.Text>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <TouchableOpacity onPress={handleLeave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={styles.exitBtn}>{t.common.exit}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {secretReminderText && !isClueReview && !isSpectator && (
                    <View style={styles.secretReminderBar}>
                        <Text style={styles.secretReminderLabel}>{t.online.word_reminder_label}</Text>
                        <Text style={styles.secretReminderText} numberOfLines={1}>{secretReminderText}</Text>
                    </View>
                )}

                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                    {isClueReview && (
                        <View style={styles.clueReviewSection}>
                            <Text style={styles.clueReviewIntro}>{t.online.clue_review_subtitle}</Text>
                            {getRoundAnswerEntries(room).map(e => (
                                <View key={e.playerId} style={styles.clueReviewRow}>
                                    <Image source={AVATAR_ASSETS[e.avatar]} style={styles.clueReviewAvatar} />
                                    <View style={styles.clueReviewRowText}>
                                        <Text style={styles.clueReviewName}>{e.name}</Text>
                                        <Text style={styles.clueReviewClueText}>"{e.clue}"</Text>
                                    </View>
                                </View>
                            ))}
                            <Text style={styles.clueReviewSpectator}>{t.online.clue_review_spectator}</Text>
                        </View>
                    )}

                    {/* TURNS MODE */}
                    {!isClueReview && mode === 'turns' && (
                        <>
                            {/* Current player spotlight */}
                            <View style={styles.spotlightCard}>
                                {currentTurnPlayer ? (
                                    <>
                                        <Image
                                            source={AVATAR_ASSETS[currentTurnPlayer.avatar]}
                                            style={styles.spotlightAvatar}
                                        />
                                        <Text style={styles.spotlightName}>
                                            {isMyTurn ? me?.name : currentTurnPlayer.name}
                                        </Text>
                                        <Text style={styles.spotlightLabel}>
                                            {isMyTurn ? t.online.your_turn : t.online.watching_player}
                                        </Text>
                                        <Text style={styles.turnProgress}>
                                            {currentTurnIndex + 1} / {turnOrder.length}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={styles.spotlightName}>{t.online.all_clues_waiting}</Text>
                                )}
                            </View>

                            {/* Input – only when it's my turn */}
                            {isMyTurn && !hasSubmitted && !isSpectator && (
                                <View style={styles.inputSection}>
                                    <Text style={styles.inputLabel}>{t.online.write_clue}</Text>
                                    <TextInput
                                        style={styles.clueInput}
                                        value={clueText}
                                        onChangeText={setClueText}
                                        placeholder={t.online.clue_placeholder}
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                        maxLength={40}
                                        editable={!isSpectator}
                                        autoFocus={!isSpectator}
                                    />
                                    <TouchableOpacity
                                        style={[styles.submitBtn, !clueText.trim() && styles.submitBtnDisabled]}
                                        onPress={handleSubmitClue}
                                        disabled={!clueText.trim() || isSpectator}
                                    >
                                        <Text style={styles.submitBtnText}>{t.online.submit_clue}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {isMyTurn && hasSubmitted && !isSpectator && (
                                <View style={styles.submittedBanner}>
                                    <Ionicons name="checkmark-circle" size={30} color="#48BB78" />
                                    <Text style={styles.submittedText}>{t.online.clue_submitted}</Text>
                                </View>
                            )}

                            {!isMyTurn && (
                                <View style={styles.waitingBanner}>
                                    <Text style={styles.waitingText}>{t.online.waiting_turn}</Text>
                                </View>
                            )}

                            {/* Clues collected so far */}
                            {submittedClues.length > 0 && (
                                <View style={styles.cluesSection}>
                                    <Text style={styles.cluesSectionTitle}>{t.online.clues_so_far}</Text>
                                    {submittedClues.map(p => (
                                        <View key={p.id} style={styles.clueCard}>
                                            <Image source={AVATAR_ASSETS[p.avatar]} style={styles.clueAvatar} />
                                            <View style={styles.clueCardContent}>
                                                <Text style={styles.clueName}>{p.name}</Text>
                                                <Text style={styles.clueText}>"{p.clue}"</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </>
                    )}

                    {/* SIMULTANEOUS — revelación: todas las pistas antes del modal de decisión */}
                    {!isClueReview && mode === 'simultaneous' && isSimultaneousReveal && (
                        <>
                            <View style={styles.revealIntroCard}>
                                <Ionicons name="eye-outline" size={40} color="#F6E05E" />
                                <Text style={styles.revealIntroTitle}>{t.online.simultaneous_reveal_title}</Text>
                                <Text style={styles.revealIntroSubtitle}>{t.online.simultaneous_reveal_subtitle}</Text>
                            </View>
                            {submittedClues.length > 0 && (
                                <View style={styles.cluesSection}>
                                    <Text style={styles.cluesSectionTitle}>{t.online.clues_so_far}</Text>
                                    {submittedClues.map(p => (
                                        <View key={p.id} style={styles.clueCard}>
                                            <Image source={AVATAR_ASSETS[p.avatar]} style={styles.clueAvatar} />
                                            <View style={styles.clueCardContent}>
                                                <Text style={styles.clueName}>{p.name}</Text>
                                                <Text style={styles.clueText}>"{p.clue}"</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                            {isHost && !isSpectator ? (
                                <TouchableOpacity
                                    style={styles.continueDecisionBtn}
                                    onPress={() => { void openRoundDecisionAfterSimultaneousReveal(); }}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.continueDecisionBtnText}>{t.online.continue_to_group_decision}</Text>
                                    <Ionicons name="arrow-forward-circle" size={22} color="#1A1A2E" />
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.waitingHostRevealBox}>
                                    <Text style={styles.waitingHostRevealText}>{t.online.waiting_host_reveal_decision}</Text>
                                </View>
                            )}
                        </>
                    )}

                    {/* SIMULTANEOUS MODE — escribir pistas */}
                    {!isClueReview && mode === 'simultaneous' && !isSimultaneousReveal && (
                        <>
                            {/* Progress of who has submitted */}
                            <View style={styles.progressRow}>
                                {players.map(p => (
                                    <View key={p.id} style={styles.progressDot}>
                                        <Image source={AVATAR_ASSETS[p.avatar]} style={[
                                            styles.progressAvatar,
                                            p.clue ? styles.progressAvatarDone : styles.progressAvatarPending
                                        ]} />
                                        {p.clue && (
                                            <View style={styles.progressCheck}>
                                                <Ionicons name="checkmark" size={8} color="#FFF" />
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                            <Text style={styles.progressLabel}>
                                {submittedClues.length}/{players.length} enviadas
                            </Text>

                            {/* Input */}
                            {!hasSubmitted && !isSpectator ? (
                                <View style={styles.inputSection}>
                                    <Text style={styles.inputLabel}>{t.online.write_clue}</Text>
                                    <TextInput
                                        style={styles.clueInput}
                                        value={clueText}
                                        onChangeText={setClueText}
                                        placeholder={t.online.clue_placeholder}
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                        maxLength={40}
                                        editable={!isSpectator}
                                        autoFocus={!isSpectator}
                                    />
                                    <TouchableOpacity
                                        style={[styles.submitBtn, !clueText.trim() && styles.submitBtnDisabled]}
                                        onPress={handleSubmitClue}
                                        disabled={!clueText.trim() || isSpectator}
                                    >
                                        <Text style={styles.submitBtnText}>{t.online.submit_clue}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : !isSpectator ? (
                                <View style={styles.submittedBanner}>
                                    <Ionicons name="checkmark-circle" size={30} color="#48BB78" />
                                    <Text style={styles.submittedText}>{t.online.clue_submitted}</Text>
                                    <Text style={styles.waitingOthers}>
                                        {t.online.waiting_others_clue}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.spectatorClueHint}>
                                    <Ionicons name="eye-outline" size={28} color="#A0AEC0" />
                                    <Text style={styles.spectatorClueHintText}>{t.online.spectator_banner}</Text>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>

                {!(isSpectator && introActive) && (
                    <QuickMessagePanel variant="clues" isEliminated={isSpectator} />
                )}
                {!(isSpectator && introActive) && <EmojiReactionBar />}
                <ChatPanel
                    defaultExpanded={false}
                    style={{ marginHorizontal: 12, marginBottom: 4 }}
                    onUpgradePress={() => navigation.navigate('Paywall')}
                />
            </KeyboardAvoidingView>
            </View>
            {isSpectator && introActive && (
                <Animated.View
                    style={[styles.eliminationIntroOverlay, { transform: [{ translateY: slideY }] }]}
                    pointerEvents="auto"
                >
                    <Ionicons name="close-circle" size={72} color="#E53E3E" />
                    <Text style={styles.eliminationIntroTitle}>{t.online.you_are_eliminated}</Text>
                </Animated.View>
            )}
            {tieNoticeVisible && (
                <View style={styles.tieOverlay} pointerEvents="auto">
                    <View style={styles.tieCard}>
                        <Ionicons name="git-compare-outline" size={48} color="#F6E05E" />
                        <Text style={styles.tieTitle}>{t.online.vote_tie_title}</Text>
                        <Text style={styles.tieMessage}>{t.online.vote_tie_message}</Text>
                        <View style={styles.tieDetailsBox}>
                            {tieDetails.length > 0 ? tieDetails.map(item => (
                                <Text key={item.playerId} style={styles.tieDetailText}>
                                    {item.name} · {t.online.vote_tie_votes.replace('{count}', String(item.votes))}
                                </Text>
                            )) : (
                                <Text style={styles.tieDetailText}>{t.online.vote_tie_no_votes}</Text>
                            )}
                        </View>
                        <View style={styles.tieCountdownChip}>
                            <Text style={styles.tieCountdownNumber}>{tieContinueSeconds}</Text>
                        </View>
                    </View>
                </View>
            )}
            <GameModal
                visible={showLeaveConfirm}
                title={t.voting.exit_confirm}
                message={isHost ? t.online.exit_host_confirm : t.online.exit_player_game_msg}
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
        backgroundColor: '#1A1A2E',
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
    eliminationIntroOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 200,
        backgroundColor: '#1A1A2E',
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
    tieOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 260,
        backgroundColor: 'rgba(0,0,0,0.62)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 22,
    },
    tieCard: {
        width: '100%',
        backgroundColor: '#1E2238',
        borderRadius: 20,
        paddingVertical: 22,
        paddingHorizontal: 18,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(246,224,94,0.35)',
    },
    tieTitle: {
        color: '#F6E05E',
        fontSize: 24,
        fontWeight: '900',
        textAlign: 'center',
        marginTop: 10,
    },
    tieMessage: {
        color: 'rgba(255,255,255,0.86)',
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginTop: 10,
    },
    tieDetailsBox: {
        width: '100%',
        marginTop: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.07)',
        gap: 4,
    },
    tieDetailText: {
        color: 'rgba(255,255,255,0.86)',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },
    tieCountdownChip: {
        marginTop: 20,
        backgroundColor: '#F6E05E',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 28,
        minWidth: 88,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tieCountdownNumber: {
        color: '#1A1A2E',
        fontSize: 34,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    clueReviewSection: {
        marginBottom: 8,
    },
    clueReviewIntro: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 12,
    },
    clueReviewRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    clueReviewAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    clueReviewRowText: { flex: 1 },
    clueReviewName: {
        color: '#A0AEC0',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    clueReviewClueText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
        lineHeight: 24,
    },
    clueReviewSpectator: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 20,
    },
    spectatorClueHint: {
        alignItems: 'center',
        paddingVertical: 20,
        marginBottom: 12,
    },
    spectatorClueHintText: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    headerRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    exitBtn: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
    },
    phaseLabel: {
        color: '#A0AEC0',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        flex: 1,
    },
    timer: {
        fontSize: 28,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    secretReminderBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        backgroundColor: 'rgba(255,255,255,0.035)',
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
    modeLabel: {
        color: '#A0AEC0',
        fontSize: 11,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },
    scroll: { flex: 1 },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    // Turns mode
    spotlightCard: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    spotlightAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
        backgroundColor: '#2D3748',
    },
    spotlightLabel: {
        color: '#A0AEC0',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },
    spotlightName: {
        color: '#FFF',
        fontSize: 26,
        fontWeight: '900',
        textAlign: 'center',
    },
    turnProgress: {
        color: '#718096',
        fontSize: 13,
        marginTop: 8,
    },
    // Input section
    inputSection: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    inputLabel: {
        color: '#A0AEC0',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 10,
        textAlign: 'center',
    },
    clueInput: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 14,
        color: '#FFF',
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    submitBtn: {
        backgroundColor: '#5B7FDB',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.4,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    submittedBanner: {
        alignItems: 'center',
        backgroundColor: 'rgba(72,187,120,0.15)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(72,187,120,0.3)',
    },
    submittedText: {
        color: '#48BB78',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 8,
    },
    waitingOthers: {
        color: '#718096',
        fontSize: 13,
        marginTop: 8,
        textAlign: 'center',
    },
    waitingBanner: {
        alignItems: 'center',
        paddingVertical: 16,
        marginBottom: 16,
    },
    waitingText: {
        color: '#718096',
        fontSize: 16,
        fontWeight: '600',
    },
    // Clues list
    cluesSection: {
        marginTop: 8,
    },
    cluesSectionTitle: {
        color: '#A0AEC0',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    clueCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    clueAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2D3748',
        marginRight: 12,
    },
    clueCardContent: {
        flex: 1,
    },
    clueName: {
        color: '#A0AEC0',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 2,
    },
    clueText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    // Simultaneous mode
    wordReminderCard: {
        backgroundColor: 'rgba(91,127,219,0.2)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(91,127,219,0.4)',
    },
    wordReminderImpostor: {
        backgroundColor: 'rgba(229,62,62,0.15)',
        borderColor: 'rgba(229,62,62,0.3)',
    },
    wordReminderLabel: {
        color: '#A0AEC0',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
    },
    wordReminderWord: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
    },
    wordReminderSub: {
        color: '#FC8181',
        fontSize: 13,
        marginTop: 4,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    progressDot: {
        position: 'relative',
    },
    progressAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    progressAvatarDone: {
        opacity: 1,
        borderWidth: 2,
        borderColor: '#48BB78',
    },
    progressAvatarPending: {
        opacity: 0.4,
    },
    progressCheck: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#48BB78',
        width: 14,
        height: 14,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressLabel: {
        color: '#718096',
        textAlign: 'center',
        fontSize: 13,
        marginBottom: 20,
    },
    revealIntroCard: {
        backgroundColor: 'rgba(246,224,94,0.12)',
        borderRadius: 20,
        padding: 22,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(246,224,94,0.35)',
    },
    revealIntroTitle: {
        color: '#F6E05E',
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        marginTop: 10,
    },
    revealIntroSubtitle: {
        color: '#A0AEC0',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    continueDecisionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#F6E05E',
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 18,
        marginTop: 8,
    },
    continueDecisionBtnText: {
        color: '#1A1A2E',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    waitingHostRevealBox: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 18,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    waitingHostRevealText: {
        color: '#A0AEC0',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
});
