import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Image,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGame } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';
import { Player } from '../types';

import { getAvatarSource } from '../utils/avatarAssets';
import { Confetti } from '../components/Confetti';
import { GameModal } from '../components/GameModal';

type VotingScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Voting'>;
};

// Removed local AVATAR_IMAGES logic

export default function VotingScreen({ navigation }: VotingScreenProps) {
    const { state, resetGame, eliminatePlayer, playClick, playSuccess, playFailure, setGamePhase } = useGame();
    const { t } = useTranslation();
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(state.settings.gameDuration); // Usar duración configurada
    const [gameFinished, setGameFinished] = useState(false);
    const [resultMessage, setResultMessage] = useState('');
    const [winner, setWinner] = useState<'civilians' | 'impostor' | null>(null);
    const [eliminatedImpostors, setEliminatedImpostors] = useState<string[]>([]);
    const [showTimerExpiredAlert, setShowTimerExpiredAlert] = useState(false);

    // Set Phase to Voting on Mount
    useEffect(() => {
        setGamePhase('voting');
        return () => {
            // Cleanup if needed, but usually handled by navigation or next screen
        };
    }, []);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        title: string;
        message: string;
        type: 'success' | 'danger' | 'info' | 'warning';
        buttonText: string;
        onClose: () => void;
    }>({
        title: '',
        message: '',
        type: 'info',
        buttonText: 'OK',
        onClose: () => setModalVisible(false),
    });

    const showGameModal = (
        title: string,
        message: string,
        type: 'success' | 'danger' | 'info' | 'warning',
        buttonText: string,
        onPress?: () => void
    ) => {
        setModalConfig({
            title,
            message,
            type,
            buttonText,
            onClose: () => {
                setModalVisible(false);
                if (onPress) onPress();
            },
        });
        setModalVisible(true);
    };

    // Filter active players (not eliminated)
    const activePlayers = state.settings.players.filter((p: Player) => !p.isEliminated);

    // Timer logic
    useEffect(() => {
        if (gameFinished || timeLeft === null) return;

        const timer = setInterval(() => {
            setTimeLeft((prev: number | null) => {
                if (prev === null) return null; // Safe check for TS
                if (prev <= 1) {
                    clearInterval(timer);
                    setShowTimerExpiredAlert(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameFinished]);

    // Format timer
    const formatTime = (seconds: number | null) => {
        if (seconds === null) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Show alert when timer expires
    useEffect(() => {
        if (showTimerExpiredAlert && !gameFinished) {
            Alert.alert(
                t.voting.discussion_time,
                t.voting.vote_title,
                [
                    {
                        text: t.setup.unlimited,
                        onPress: () => {
                            playClick();
                            setTimeLeft(state.settings.gameDuration);
                            setShowTimerExpiredAlert(false);
                        }
                    },
                    {
                        text: t.voting.eliminate,
                        onPress: () => {
                            playClick();
                            setShowTimerExpiredAlert(false);
                        }
                    }
                ],
                { cancelable: false }
            );
        }
    }, [showTimerExpiredAlert, gameFinished]);

    const handleVote = () => {
        if (!selectedPlayerId) {
            Alert.alert(t.voting.vote_title, '');
            return;
        }

        const isImpostor = state.currentImpostors.includes(selectedPlayerId);

        if (isImpostor) {
            eliminatePlayer(selectedPlayerId);
            const newEliminatedImpostors = [...eliminatedImpostors, selectedPlayerId];
            setEliminatedImpostors(newEliminatedImpostors);

            // Check if ALL impostors are eliminated
            if (newEliminatedImpostors.length >= state.settings.impostorCount) {
                setWinner('civilians');
                setResultMessage(t.voting.impostor_found);
                playSuccess();
                setResultMessage(t.voting.impostor_found);
                playSuccess();
                setGameFinished(true);
                setGamePhase('results');
            } else {
                const remaining = state.settings.impostorCount - newEliminatedImpostors.length;
                showGameModal(
                    t.voting.impostor_found,
                    `${t.voting.remaining_impostors}: ${remaining}`,
                    'success',
                    'OK',
                    () => {
                        playClick();
                        setSelectedPlayerId(null);
                        setTimeLeft(state.settings.gameDuration);
                    }
                );
            }
        } else {
            const playerToEliminate = state.settings.players.find((p: Player) => p.id === selectedPlayerId)?.name || 'Jugador';
            playFailure();

            showGameModal(
                t.voting.civilian_eliminated,
                `${playerToEliminate}`,
                'danger',
                'Continuar',
                () => {
                    playClick();
                    if (selectedPlayerId) {
                        eliminatePlayer(selectedPlayerId);
                    }

                    const remainingPlayersCount = activePlayers.length - 1;
                    if (remainingPlayersCount < 3) {
                        setWinner('impostor');
                        setResultMessage(t.voting.winner_impostors);
                        playFailure();
                        setGameFinished(true);
                        setGamePhase('results');
                        return;
                    }

                    setSelectedPlayerId(null);
                    setTimeLeft(state.settings.gameDuration);
                }
            );
        }
    };

    const handleReveal = () => {
        playClick();
        showGameModal(
            t.voting.game_over,
            '',
            'warning',
            'Ver Resultado',
            () => {
                setWinner(null);
                setResultMessage(t.voting.game_over);
                setGameFinished(true);
                setGamePhase('results');
            }
        );
    };

    const handlePlayAgain = () => {
        playClick();
        resetGame();
        setGamePhase('setup');
        navigation.reset({
            index: 0,
            routes: [{ name: 'Setup' }],
        });
    };

    const handleClose = () => {
        playClick();
        showGameModal(
            t.voting.game_over,
            t.voting.exit_confirm || '¿Estás seguro de que quieres salir?',
            'warning',
            'Salir',
            handlePlayAgain
        );
    };

    const impostorNames = state.settings.players
        .filter((p: Player) => state.currentImpostors.includes(p.id))
        .map((p: Player) => p.name)
        .join(', ');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close-circle-outline" size={32} color="#666" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {!gameFinished ? (
                    <>
                        {timeLeft !== null && (
                            <View style={styles.timerContainer}>
                                <Text style={styles.timerLabel}>
                                    {t.voting.discussion_time}
                                </Text>
                                <Text style={[
                                    styles.timer,
                                    timeLeft !== null && timeLeft < 30 && styles.timerWarning
                                ]}>
                                    {formatTime(timeLeft)}
                                </Text>
                            </View>
                        )}

                        <Text style={styles.question}>
                            {t.voting.vote_title}
                        </Text>

                        <View style={styles.playersGrid}>
                            {activePlayers.map((player) => {
                                const avatarImage = getAvatarSource(player.avatar);

                                return (
                                    <TouchableOpacity
                                        key={player.id}
                                        style={[
                                            styles.playerCard,
                                            { backgroundColor: '#F0F4FF' },
                                            selectedPlayerId === player.id && styles.playerCardSelected
                                        ]}
                                        onPress={() => {
                                            playClick();
                                            setSelectedPlayerId(player.id);
                                        }}
                                    >
                                        <Image source={avatarImage} style={styles.avatarImage} resizeMode="contain" />

                                        <View style={styles.namePill}>
                                            <Text style={[
                                                styles.playerName,
                                                selectedPlayerId === player.id && styles.playerNameSelected
                                            ]} numberOfLines={1}>
                                                {player.name}
                                            </Text>
                                        </View>

                                        {selectedPlayerId === player.id && (
                                            <View style={styles.checkBadge}>
                                                <Ionicons name="checkmark" size={12} color="#FFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.voteButton,
                                !selectedPlayerId && styles.voteButtonDisabled
                            ]}
                            onPress={handleVote}
                            disabled={!selectedPlayerId}
                        >
                            <Text style={styles.voteButtonText}>{t.voting.eliminate}</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={handleReveal}
                        >
                            <Text style={styles.secondaryButtonText}>REVELAR</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.tertiaryButton}
                            onPress={handlePlayAgain}
                        >
                            <Text style={styles.tertiaryButtonText}>{t.voting.back_home}</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.resultContainer}>
                        <Text style={styles.resultTitle}>{resultMessage}</Text>

                        <View style={[
                            styles.impostorRevealBox,
                            winner === 'civilians' && styles.impostorRevealBoxWin
                        ]}>
                            <Text style={[
                                styles.impostorLabel,
                                winner === 'civilians' && styles.impostorLabelWin
                            ]}>
                                {t.voting.game_over}
                            </Text>
                            <Text style={[
                                styles.impostorNameBig,
                                winner === 'civilians' && styles.impostorNameBigWin
                            ]}>{impostorNames}</Text>
                        </View>

                        <View style={styles.wordRevealBox}>
                            <Text style={styles.wordLabel}>{t.reveal.your_word}</Text>
                            <Text style={styles.wordBig}>{state.currentWord?.word}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.playAgainButton}
                            onPress={handlePlayAgain}
                        >
                            <Text style={styles.playAgainText}>{t.voting.back_home}</Text>
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>
            {gameFinished && winner === 'civilians' && <Confetti />}

            <GameModal
                visible={modalVisible}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                buttonText={modalConfig.buttonText}
                onClose={modalConfig.onClose}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 10,
        alignItems: 'flex-end',
        zIndex: 10,
    },
    closeButton: {
        padding: 5,
    },
    content: {
        padding: 24,
        flexGrow: 1,
        alignItems: 'center',
    },
    // Timer
    timerContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    timerLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    timer: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#333',
    },
    timerWarning: {
        color: '#E53E3E',
    },
    question: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    // Players
    playersGrid: {
        width: '100%',
        marginBottom: 30,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 12,
    },
    playerCard: {
        width: '30.5%',
        aspectRatio: 1,
        borderRadius: 15,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 12,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    playerCardSelected: {
        borderColor: '#5B7FDB',
        borderWidth: 3,
        transform: [{ scale: 1.05 }],
    },
    avatarImage: {
        width: '80%',
        height: '80%',
        position: 'absolute',
        top: 10,
    },
    namePill: {
        backgroundColor: '#FFF',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 5,
    },
    playerName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    playerNameSelected: {
        color: '#5B7FDB',
        fontWeight: 'bold',
    },
    checkBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#5B7FDB',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    // Vote Button
    voteButton: {
        backgroundColor: '#E53E3E',
        paddingVertical: 18,
        paddingHorizontal: 40,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    voteButtonDisabled: {
        backgroundColor: '#CBD5E0',
    },
    voteButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Divider
    divider: {
        height: 1,
        backgroundColor: '#DDD',
        width: '100%',
        marginVertical: 20,
    },
    // Extra Buttons
    secondaryButton: {
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: '#5B7FDB',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12,
    },
    secondaryButtonText: {
        color: '#5B7FDB',
        fontSize: 14,
        fontWeight: 'bold',
    },
    tertiaryButton: {
        paddingVertical: 14,
        width: '100%',
        alignItems: 'center',
    },
    tertiaryButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    // Results
    resultContainer: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 40,
    },
    resultTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#333',
        textAlign: 'center',
        marginBottom: 40,
    },
    impostorRevealBox: {
        backgroundColor: '#FEE',
        padding: 24,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#E53E3E',
    },
    impostorLabel: {
        fontSize: 16,
        color: '#E53E3E',
        marginBottom: 8,
    },
    impostorLabelWin: {
        color: '#2F855A',
    },
    impostorNameBig: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#E53E3E',
        textAlign: 'center',
    },
    impostorNameBigWin: {
        color: '#2F855A',
    },
    impostorRevealBoxWin: {
        backgroundColor: '#F0FFF4',
        borderColor: '#48BB78',
    },
    wordRevealBox: {
        backgroundColor: '#F0F4FF',
        padding: 24,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        marginBottom: 40,
        borderWidth: 2,
        borderColor: '#5B7FDB',
    },
    wordLabel: {
        fontSize: 16,
        color: '#5B7FDB',
        marginBottom: 8,
    },
    wordBig: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    playAgainButton: {
        backgroundColor: '#5B7FDB',
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
    },
    playAgainText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});