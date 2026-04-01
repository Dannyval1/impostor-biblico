import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useTranslation } from '../hooks/useTranslation';

const DECISION_TIMEOUT_S = 10;

export function RoundDecisionModal() {
    const { gameState, submitRoundDecision } = useOnlineGame();
    const { t } = useTranslation();
    const [myVote, setMyVote] = useState<'go_vote' | 'another_round' | null>(null);
    const [countdown, setCountdown] = useState(DECISION_TIMEOUT_S);
    const progressAnim = useRef(new Animated.Value(1)).current;
    const prevStatusRef = useRef<string | null>(null);

    const room = gameState.room;
    const me = gameState.playerId && room?.players ? room.players[gameState.playerId] : undefined;
    const isEliminated = me?.isEliminated === true;
    const isVisible = room?.status === 'deciding' && !isEliminated;
    const clueRound = room?.clueRound || 1;

    useEffect(() => {
        if (room?.status !== prevStatusRef.current) {
            if (room?.status === 'deciding' && !isEliminated) {
                setMyVote(null);
                setCountdown(DECISION_TIMEOUT_S);
                progressAnim.setValue(1);
                Animated.timing(progressAnim, {
                    toValue: 0,
                    duration: DECISION_TIMEOUT_S * 1000,
                    easing: Easing.linear,
                    useNativeDriver: false,
                }).start();
            }
            prevStatusRef.current = room?.status || null;
        }
    }, [room?.status, isEliminated]);

    useEffect(() => {
        if (!isVisible) return;
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible || !room) return null;

    const eligiblePlayers = Object.values(room.players).filter(p => !p.isEliminated && p.isConnected !== false);
    const votes = room.roundDecisionVotes || {};
    const goVoteCount = Object.values(votes).filter(v => v === 'go_vote').length;
    const anotherRoundCount = Object.values(votes).filter(v => v === 'another_round').length;
    const totalEligible = eligiblePlayers.length;

    const handleVote = (decision: 'go_vote' | 'another_round') => {
        if (myVote) return;
        setMyVote(decision);
        submitRoundDecision(decision);
    };

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const roundLabel = clueRound === 1
        ? `1 ${t.online.round_decision.subtitle_single}`
        : `${clueRound} ${t.online.round_decision.subtitle_multi}`;

    return (
        <Modal visible={isVisible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>{t.online.round_decision.title}</Text>
                    <Text style={styles.subtitle}>{roundLabel}</Text>

                    <View style={styles.timerContainer}>
                        <View style={styles.timerBg}>
                            <Animated.View style={[styles.timerFill, { width: progressWidth }]} />
                        </View>
                        <Text style={styles.timerText}>{countdown}s</Text>
                    </View>

                    <View style={styles.buttonsRow}>
                        <TouchableOpacity
                            style={[
                                styles.voteButton,
                                styles.voteButtonVote,
                                myVote === 'go_vote' && styles.voteButtonSelected,
                                myVote && myVote !== 'go_vote' && styles.voteButtonDimmed,
                            ]}
                            onPress={() => handleVote('go_vote')}
                            activeOpacity={0.7}
                            disabled={!!myVote}
                        >
                            <Text style={styles.voteButtonText}>{t.online.round_decision.go_vote}</Text>
                            <View style={styles.voteCountBadge}>
                                <Text style={styles.voteCountText}>{goVoteCount}/{totalEligible}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.voteButton,
                                styles.voteButtonRound,
                                myVote === 'another_round' && styles.voteButtonSelected,
                                myVote && myVote !== 'another_round' && styles.voteButtonDimmed,
                            ]}
                            onPress={() => handleVote('another_round')}
                            activeOpacity={0.7}
                            disabled={!!myVote}
                        >
                            <Text style={styles.voteButtonText}>{t.online.round_decision.another_round}</Text>
                            <View style={styles.voteCountBadge}>
                                <Text style={styles.voteCountText}>{anotherRoundCount}/{totalEligible}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {myVote && (
                        <Text style={styles.waitingText}>{t.online.round_decision.waiting}</Text>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    card: {
        backgroundColor: '#1A1A2E',
        borderRadius: 24,
        padding: 28,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginBottom: 20,
    },
    timerContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 24,
    },
    timerBg: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    timerFill: {
        height: '100%',
        backgroundColor: '#F6E05E',
        borderRadius: 4,
    },
    timerText: {
        color: '#F6E05E',
        fontSize: 16,
        fontWeight: '800',
        width: 35,
        textAlign: 'right',
    },
    buttonsRow: {
        width: '100%',
        gap: 12,
    },
    voteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 2,
    },
    voteButtonVote: {
        backgroundColor: 'rgba(72, 187, 120, 0.15)',
        borderColor: 'rgba(72, 187, 120, 0.4)',
    },
    voteButtonRound: {
        backgroundColor: 'rgba(91, 127, 219, 0.15)',
        borderColor: 'rgba(91, 127, 219, 0.4)',
    },
    voteButtonSelected: {
        borderColor: '#FFF',
        borderWidth: 3,
    },
    voteButtonDimmed: {
        opacity: 0.4,
    },
    voteButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
    voteCountBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    voteCountText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    waitingText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        marginTop: 16,
        fontStyle: 'italic',
    },
});
