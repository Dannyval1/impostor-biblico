import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useOnlineGame } from '../context/OnlineGameContext';
import { getAvatarSource } from '../utils/avatarAssets';
import { GameModal } from '../components/GameModal';
import { useTranslation } from '../hooks/useTranslation';
import { OnlinePlayer } from '../types';
import { PremiumRoomBanner } from '../components/PremiumRoomBanner';
import { OnlineOnboardingModal } from '../components/OnlineOnboardingModal';
import { useOnlineAd } from '../hooks/useOnlineAd';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logOnlineAnalytics } from '../utils/onlineAnalytics';

const LOBBY_STALE_CLEANUP_SAMPLE_RATE = 0.1;
const LOBBY_STALE_CLEANUP_THROTTLE_MS = 8 * 60 * 60 * 1000;
const LOBBY_STALE_CLEANUP_LAST_RUN_KEY = 'online_lobby_stale_cleanup_last_run_at';

export default function OnlineLobbyScreen() {
    const navigation = useNavigation<any>(); // type appropriately
    const { gameState, createRoom, joinRoom, leaveRoom, kickPlayer, kickedFromRoom, clearKickedFromRoom, updateMyJoinState, cleanupStaleRooms } = useOnlineGame();
    const { t } = useTranslation();
    const { showInterstitialIfNeeded } = useOnlineAd();

    const isPremium = gameState.room?.settings.isPremiumRoom ?? false;

    // Premium palette — warm dark theme with muted amber tones (not neon gold).
    const P = isPremium ? {
        bg:            '#1C1308' as const,
        cardBg:        '#261A0A' as const,
        listBg:        'rgba(210,160,60,0.06)' as const,
        gold:          '#D4A84B' as const,
        goldMuted:     'rgba(212,168,75,0.75)' as const,
        goldSubtle:    'rgba(212,168,75,0.12)' as const,
        goldBorder:    'rgba(212,168,75,0.22)' as const,
        actionBtn:     '#A07830' as const,
        actionBtnText: '#FDF0D5' as const,
    } : null;

    const [playerName, setPlayerName] = useState('');
    const [roomCodeInput, setRoomCodeInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
    const [leaveModalVisible, setLeaveModalVisible] = useState(false);

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

    // Navigation logic based on game state (sin roomCode = sesión terminada; no navegar con snapshot conservado)
    // Handles all mid-game statuses so reconnecting after screen-off lands on the correct screen.
    useEffect(() => {
        if (!gameState.roomCode) return;
        const status = gameState.room?.status;
        if (!status || status === 'waiting') return;

        if (status === 'playing') {
            navigation.replace('OnlineReveal');
        } else if (
            status === 'clues' ||
            status === 'simultaneous_reveal' ||
            status === 'clue_review' ||
            status === 'deciding'
        ) {
            navigation.replace('OnlineClue');
        } else if (status === 'voting') {
            navigation.replace('OnlineVoting');
        } else if (
            status === 'results' ||
            status === 'elimination_choice' ||
            status === 'finished'
        ) {
            navigation.replace('OnlineResults');
        }
    }, [gameState.roomCode, gameState.room?.status]);

    // Limpieza pasiva híbrida: muestreo + throttle + ejecución diferida en background.
    useEffect(() => {
        const timer = setTimeout(() => {
            void (async () => {
                if (Math.random() >= LOBBY_STALE_CLEANUP_SAMPLE_RATE) return;
                try {
                    const now = Date.now();
                    const lastRaw = await AsyncStorage.getItem(LOBBY_STALE_CLEANUP_LAST_RUN_KEY);
                    const lastRun = lastRaw ? Number(lastRaw) : 0;
                    if (Number.isFinite(lastRun) && lastRun > 0 && now - lastRun < LOBBY_STALE_CLEANUP_THROTTLE_MS) {
                        return;
                    }
                    await cleanupStaleRooms();
                    await AsyncStorage.setItem(LOBBY_STALE_CLEANUP_LAST_RUN_KEY, String(now));
                } catch {
                    // Silencioso por diseño: no impactar UX del lobby.
                }
            })();
        }, 2000);

        return () => clearTimeout(timer);
    }, [cleanupStaleRooms]);

    // Al entrar al lobby en espera, el propio jugador pasa joining -> watching_ad/ready.
    useEffect(() => {
        const room = gameState.room;
        const myId = gameState.playerId;
        if (!room || !gameState.roomCode || !myId) {
            return;
        }
        if (room.status !== 'waiting') {
            return;
        }
        const me = room.players[myId];
        if (!me) return;
        if (me.joinState === 'ready' || me.joinState === 'watching_ad') return;

        const run = async () => {
            try {
                await updateMyJoinState('watching_ad');
                await showInterstitialIfNeeded(room.settings.isPremiumRoom, () => {
                    void updateMyJoinState('ready');
                });
            } catch {
                await updateMyJoinState('ready');
            }
        };
        void run();
    }, [
        gameState.roomCode,
        gameState.playerId,
        gameState.room?.status,
        gameState.room?.players,
        gameState.room?.settings?.isPremiumRoom,
        showInterstitialIfNeeded,
        updateMyJoinState,
    ]);

    const handleCreateRoom = async () => {
        if (!playerName.trim()) {
            showGameModal(t.online.errors.missing_info, t.online.errors.name_required, 'warning', 'OK');
            return;
        }
        setIsLoading(true);
        try {
            await createRoom(playerName.trim());
            logOnlineAnalytics('online_room_created');
        } catch (error) {
            showGameModal(t.common.error, t.online.errors.room_create_error, 'danger', 'OK');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!playerName.trim() || !roomCodeInput.trim()) {
            showGameModal(t.online.errors.missing_info, t.online.errors.name_and_code_required, 'warning', 'OK');
            return;
        }

        const code = roomCodeInput.trim().toUpperCase();

        setIsLoading(true);
        try {
            const success = await joinRoom(code, playerName.trim());
            if (!success) {
                showGameModal(t.common.error, t.online.errors.room_not_found, 'danger', 'OK');
            } else {
                logOnlineAnalytics('online_room_joined');
            }
        } catch (error: any) {
            if (error.message === 'Game already started') {
                showGameModal(t.common.error, t.online.errors.game_started_desc || t.online.errors.game_started, 'danger', 'OK');
            } else if (error.message === 'Room full') {
                showGameModal(t.common.error, t.online.errors.room_full || 'Sala llena.', 'warning', 'OK');
            } else if (error.message === 'Name taken') {
                showGameModal(t.online.errors.missing_info, t.online.errors.name_taken, 'warning', 'OK');
            } else {
                showGameModal(t.common.error, t.online.errors.room_join_error, 'danger', 'OK');
            }
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveRoom = () => {
        setLeaveModalVisible(true);
    };

    const shareCode = async () => {
        const code = gameState.roomCode || '';
        try {
            await Share.share({ message: code });
        } catch {
            // fallback
        }
    };

    const renderPlayerItem = ({ item }: { item: OnlinePlayer }) => {
        const isDisconnected = item.isConnected === false;
        const joinState = item.joinState || 'ready';
        const stateColor = isDisconnected
            ? '#E53E3E'
            : joinState === 'ready'
                ? '#48BB78'
                : joinState === 'watching_ad'
                    ? '#F6AD55'
                    : '#A0AEC0';
        const stateText = isDisconnected
            ? t.online.reconnecting
            : joinState === 'ready'
                ? t.online.lobby_state_ready
                : joinState === 'watching_ad'
                    ? t.online.lobby_state_watching_ad
                    : t.online.lobby_state_joining;
        return (
            <View style={[
                styles.playerCard,
                isDisconnected && styles.playerCardDisconnected,
                P && { backgroundColor: P.cardBg, borderWidth: 1, borderColor: P.goldBorder },
            ]}>
                <View style={styles.avatarWrapper}>
                    <View style={[styles.avatarContainer, P && { backgroundColor: '#2E1F0A' }]}>
                        <Image source={getAvatarSource(item.avatar)} style={[styles.avatarImage, isDisconnected && { opacity: 0.4 }]} />
                    </View>
                </View>
                <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, P && { color: '#F5E6C0' }]}>{item.name} {item.id === gameState.playerId && t.online.you}</Text>
                    {item.isHost && <Text style={[styles.hostBadge, P && { color: P.gold }]}>{t.online.host_badge}</Text>}
                </View>
                <View style={styles.playerCardRight}>
                    <Ionicons
                        name={isDisconnected ? 'wifi-outline' : (joinState === 'ready' ? 'checkmark-circle' : 'time-outline')}
                        size={22}
                        color={stateColor}
                        accessibilityLabel={stateText}
                    />
                    {gameState.isHost &&
                        gameState.room?.status === 'waiting' &&
                        item.id !== gameState.playerId &&
                        !item.isHost && (
                        <TouchableOpacity
                            onPress={async () => {
                                const name = item.name.trim();
                                await kickPlayer(item.id);
                                showGameModal(
                                    t.online.kick_confirm_title,
                                    t.online.kick_confirm_msg.replace('{name}', name),
                                    'info',
                                    t.common.ok
                                );
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={styles.kickBtn}
                        >
                            <Ionicons name="close-circle" size={20} color="rgba(229,62,62,0.7)" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    // --- RENDER ---

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F9E675" />
                <Text style={styles.loadingText}>{t.home.loading}</Text>
            </View>
        );
    }

    // 1. LOBBY VIEW (Inside a room)
    if (gameState.roomCode && gameState.room) {
        const playersList = Object.values(gameState.room.players).filter(
            p =>
                p != null &&
                typeof p.id === 'string' &&
                p.id.length > 0 &&
                typeof p.name === 'string' &&
                p.name.trim().length > 0
        );
        const connectedPlayers = playersList.filter(p => p.isConnected !== false);
        const readyPlayers = connectedPlayers.filter(p => (p.joinState || 'ready') === 'ready');
        const watchingAdPlayers = connectedPlayers.filter(p => p.joinState === 'watching_ad');
        const canConfigure = connectedPlayers.length >= 3 && readyPlayers.length === connectedPlayers.length;

        return (
            <SafeAreaView style={[styles.container, P && { backgroundColor: P.bg }]}>
                <View style={[styles.header, P && { borderBottomWidth: 1, borderBottomColor: P.goldSubtle }]}>
                    <TouchableOpacity onPress={handleLeaveRoom} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={P ? P.gold : '#FFF'} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, P && { color: P.gold }]}>
                        {P ? `✨ ${t.online.lobby_title}` : t.online.lobby_title}
                    </Text>
                    <TouchableOpacity onPress={handleLeaveRoom} style={styles.leaveRoomTextBtn} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
                        <Text style={[styles.leaveRoomTextBtnLabel, P && { color: P.goldMuted }]}>{t.common.exit}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.roomCodeContainer}>
                    <Text style={[styles.roomCodeLabel, P && { color: P.goldMuted }]}>{t.online.room_code}</Text>
                    <TouchableOpacity onPress={shareCode} style={[
                        styles.codeBox,
                        P && {
                            backgroundColor: P.cardBg,
                            borderWidth: 1.5,
                            borderColor: P.gold,
                            shadowColor: P.gold,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.45,
                            shadowRadius: 10,
                            elevation: 8,
                        },
                    ]}>
                        <Text selectable style={[styles.roomCodeText, P && { color: P.gold }]}>{gameState.roomCode}</Text>
                        <Ionicons name="share-outline" size={20} color={P ? P.gold : '#5B7FDB'} />
                    </TouchableOpacity>
                    <Text style={[styles.shareHint, P && { color: P.goldMuted }]}>{t.online.share_hint}</Text>
                </View>

                <PremiumRoomBanner />

                <View style={[
                    styles.playersListContainer,
                    P && { backgroundColor: P.listBg, borderWidth: 1, borderColor: P.goldBorder },
                ]}>
                    <View style={styles.readinessSummary}>
                        <View style={styles.readinessRow}>
                            <Text style={[styles.readinessText, P && { color: P.goldMuted }]}>
                                {t.online.lobby_ready_progress
                                    .replace('{ready}', String(readyPlayers.length))
                                    .replace('{total}', String(connectedPlayers.length))}
                            </Text>
                            <Text style={[styles.readinessPlayerCount, P && { color: P.goldSubtle }]}>
                                {t.online.lobby_players_count
                                    .replace('{current}', String(connectedPlayers.length))
                                    .replace('{max}', String(gameState.room.settings.maxPlayers))}
                            </Text>
                        </View>
                        {watchingAdPlayers.length > 0 && (
                            <Text style={styles.readinessSubtext}>
                                {t.online.lobby_waiting_ads.replace('{count}', String(watchingAdPlayers.length))}
                            </Text>
                        )}
                        {(() => {
                            const notReady = connectedPlayers.filter(p => (p.joinState || 'ready') !== 'ready');
                            if (notReady.length === 0 || connectedPlayers.length < 2) return null;
                            return (
                                <Text style={[styles.notReadyHint, P && { color: P.goldMuted }]}>
                                    {t.online.lobby_not_ready_prefix ?? 'Falta: '}
                                    {notReady.map(p => p.name.trim()).join(', ')}
                                </Text>
                            );
                        })()}
                    </View>
                    <ScrollView
                        style={styles.playersScroll}
                        contentContainerStyle={styles.listContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {playersList.map(item => (
                            <View key={item.id}>{renderPlayerItem({ item })}</View>
                        ))}
                    </ScrollView>
                </View>

                <View style={[styles.footer, P && { backgroundColor: P.bg, borderTopWidth: 1, borderTopColor: P.goldSubtle }]}>
                    {gameState.isHost ? (
                        <View>
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    !canConfigure && styles.actionButtonDisabled,
                                    P && canConfigure && {
                                        backgroundColor: P.actionBtn,
                                        shadowColor: P.gold,
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.5,
                                        shadowRadius: 10,
                                        elevation: 8,
                                    },
                                ]}
                                onPress={() => navigation.navigate('OnlineSetup')}
                                disabled={!canConfigure}
                            >
                                <Text style={[styles.actionButtonText, P && canConfigure && { color: P.actionBtnText }]}>
                                    {canConfigure ? t.online.configure_game : t.online.lobby_waiting_ready_cta}
                                </Text>
                            </TouchableOpacity>
                            {connectedPlayers.length < 3 && (
                                <Text style={[styles.minPlayersHint, P && { color: P.goldMuted }]}>
                                    {t.online.min_players_hint} ({connectedPlayers.length}/3)
                                </Text>
                            )}
                            {connectedPlayers.length >= 3 && !canConfigure && (
                                <Text style={[styles.minPlayersHint, P && { color: P.goldMuted }]}>
                                    {t.online.lobby_waiting_ready_hint}
                                </Text>
                            )}
                        </View>
                    ) : (
                        <View style={styles.waitingMessage}>
                            <Text style={[styles.waitingText, P && { color: P.goldMuted }]}>{t.online.waiting_host}</Text>
                            <ActivityIndicator size="small" color={P ? P.gold : '#FFF'} style={{ marginTop: 8 }} />
                        </View>
                    )}
                </View>

                <GameModal
                    visible={modalVisible}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    type={modalConfig.type}
                    buttonText={modalConfig.buttonText}
                    onClose={modalConfig.onClose}
                />

                <GameModal
                    visible={kickedFromRoom}
                    title={t.online.you_were_kicked_title}
                    message={t.online.you_were_kicked_msg}
                    type="warning"
                    buttonText={t.common.ok}
                    onClose={() => {
                        clearKickedFromRoom();
                        void leaveRoom();
                    }}
                />

                <GameModal
                    visible={leaveModalVisible}
                    title={t.voting.exit_confirm}
                    message={gameState.isHost ? t.online.exit_host_confirm : t.online.exit_player_game_msg}
                    type="warning"
                    buttonText={t.common.exit}
                    onClose={() => {
                        setLeaveModalVisible(false);
                        void leaveRoom();
                    }}
                    secondaryButtonText={t.common.cancel}
                    onSecondaryPress={() => setLeaveModalVisible(false)}
                    onRequestClose={() => setLeaveModalVisible(false)}
                />
            </SafeAreaView>
        );
    }

    // 2. JOIN/CREATE VIEW
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{t.setup.online}</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <View style={styles.mainCard}>
                        {/* Player Name Input */}
                        <Text style={styles.label}>{t.online.your_name}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t.online.name_placeholder}
                            placeholderTextColor="#718096"
                            value={playerName}
                            onChangeText={setPlayerName}
                            maxLength={12}
                            returnKeyType="done"
                            onSubmitEditing={() => {
                                if (playerName.trim() && !roomCodeInput.trim()) handleCreateRoom();
                            }}
                        />

                        <View style={styles.divider} />

                        {/* Create Room Section */}
                        <Text style={styles.sectionHeader}>{t.online.create_new_room}</Text>
                        <Text style={styles.description}>{t.online.create_room_desc}</Text>
                        <TouchableOpacity
                            style={[styles.secondaryButton, !playerName.trim() && styles.disabledSecondaryButton]}
                            onPress={() => {
                                if (!playerName.trim()) {
                                    showGameModal(t.online.errors.missing_info, t.online.errors.name_required, 'warning', 'OK');
                                } else {
                                    handleCreateRoom();
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.secondaryButtonText, !playerName.trim() && styles.disabledSecondaryButtonText]}>{t.online.create_room_btn}</Text>
                        </TouchableOpacity>

                        <View style={styles.orContainer}>
                            <View style={styles.line} />
                            <Text style={styles.orText}>{t.online.or}</Text>
                            <View style={styles.line} />
                        </View>

                        {/* Join Room Section */}
                        <Text style={styles.sectionHeader}>{t.online.join_room_title}</Text>
                        <Text style={styles.description}>{t.online.join_room_desc}</Text>
                        <TextInput
                            style={[styles.input, styles.codeInput]}
                            placeholder={t.online.join_room_placeholder}
                            placeholderTextColor="#718096"
                            value={roomCodeInput}
                            onChangeText={text => setRoomCodeInput(text.toUpperCase())}
                            maxLength={6}
                            autoCapitalize="characters"
                            returnKeyType="go"
                            onSubmitEditing={() => {
                                if (playerName.trim() && roomCodeInput.trim()) handleJoinRoom();
                            }}
                        />
                        <TouchableOpacity
                            style={[styles.primaryButton, (!playerName.trim() || !roomCodeInput.trim()) && styles.disabledButton]}
                            onPress={() => {
                                if (!playerName.trim()) {
                                    showGameModal(t.online.errors.missing_info, t.online.errors.name_required, 'warning', 'OK');
                                } else if (!roomCodeInput.trim()) {
                                    showGameModal(t.online.errors.missing_info, t.online.errors.code_required, 'warning', 'OK');
                                } else {
                                    handleJoinRoom();
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>{t.online.join_room_btn}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <GameModal
                visible={modalVisible}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                buttonText={modalConfig.buttonText}
                onClose={modalConfig.onClose}
            />
            <OnlineOnboardingModal />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#2C1A0E', // Dark brown theme
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#2C1A0E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#F9E675',
        marginTop: 10,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        padding: 5,
    },
    leaveRoomTextBtn: {
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    leaveRoomTextBtnLabel: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 15,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
    },
    mainCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        marginTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F7FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        color: '#333',
        marginBottom: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 20,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C1A0E',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    secondaryButton: {
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: '#5B7FDB',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#5B7FDB',
        fontSize: 16,
        fontWeight: 'bold',
    },
    orContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    orText: {
        marginHorizontal: 10,
        color: '#999',
        fontWeight: 'bold',
    },
    codeInput: {
        textAlign: 'center',
        letterSpacing: 2,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    primaryButton: {
        backgroundColor: '#F9E675',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: "#F9E675",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 2,
    },
    primaryButtonText: {
        color: '#2C1A0E',
        fontSize: 18,
        fontWeight: 'bold',
    },

    // Lobby Styles
    roomCodeContainer: {
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    roomCodeLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    codeBox: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 15,
        alignItems: 'center',
        gap: 10,
    },
    roomCodeText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#2C1A0E',
        letterSpacing: 2,
    },
    shareHint: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginTop: 8,
    },
    playersListContainer: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        padding: 20,
        marginHorizontal: 20,
        overflow: 'visible',
    },
    playersScroll: {
        flex: 1,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    sectionTitleInRow: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        flexShrink: 1,
        marginBottom: 0,
        marginRight: 4,
    },
    readinessSummary: {
        marginBottom: 12,
    },
    readinessRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    readinessText: {
        color: '#E2E8F0',
        fontSize: 13,
        fontWeight: '700',
    },
    readinessPlayerCount: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 12,
        fontWeight: '600',
    },
    readinessSubtext: {
        color: '#F6AD55',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    notReadyHint: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
        fontStyle: 'italic',
    },
    listContent: {
        paddingBottom: 20,
    },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 12,
        marginBottom: 10,
    },
    playerCardRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 'auto',
    },
    kickBtn: {
        padding: 2,
    },
    avatarWrapper: {
        width: 50,
        height: 50,
        marginRight: 15,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F0F4FF',
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
    hostBadge: {
        fontSize: 12,
        color: '#5B7FDB',
        fontWeight: 'bold',
        marginTop: 2,
    },
    footer: {
        padding: 20,
        backgroundColor: '#2C1A0E',
    },
    actionButton: {
        backgroundColor: '#48BB78',
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
        backgroundColor: '#CCC',
        opacity: 1,
        shadowOpacity: 0.1,
        elevation: 1,
    },
    disabledSecondaryButton: {
        borderColor: '#CCC',
        backgroundColor: '#F5F5F5',
    },
    disabledSecondaryButtonText: {
        color: '#999',
    },
    actionButtonDisabled: {
        backgroundColor: '#555',
        opacity: 0.5,
        shadowOpacity: 0,
        elevation: 0,
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 1,
    },
    minPlayersHint: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
    minPlayersText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 4,
    },
    waitingMessage: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    waitingText: {
        color: '#FFF',
        fontSize: 16,
        fontStyle: 'italic',
    },
    playerCardDisconnected: {
        opacity: 0.6,
        borderWidth: 1,
        borderColor: '#E53E3E',
    },
    disconnectedText: {
        fontSize: 10,
        color: '#E53E3E',
        fontWeight: '600',
        fontStyle: 'italic',
        marginTop: 1,
    },
});
