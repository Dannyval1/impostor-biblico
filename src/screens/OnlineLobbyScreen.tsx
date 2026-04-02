import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useOnlineGame } from '../context/OnlineGameContext';
import { AVATAR_ASSETS } from '../utils/avatarAssets';
import { GameModal } from '../components/GameModal';
import { useTranslation } from '../hooks/useTranslation';
import { OnlinePlayer } from '../types';
import { PremiumRoomBanner } from '../components/PremiumRoomBanner';
import { useOnlineAd } from '../hooks/useOnlineAd';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';

export default function OnlineLobbyScreen() {
    const navigation = useNavigation<any>(); // type appropriately
    const { gameState, createRoom, joinRoom, leaveRoom } = useOnlineGame();
    const { t } = useTranslation();
    const { showInterstitialIfNeeded } = useOnlineAd();

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
    useEffect(() => {
        if (!gameState.roomCode) return;
        if (gameState.room?.status === 'playing') {
            navigation.replace('OnlineReveal');
        }
    }, [gameState.roomCode, gameState.room?.status]);

    const handleCreateRoom = async () => {
        if (!playerName.trim()) {
            showGameModal(t.online.errors.missing_info, t.online.errors.name_required, 'warning', 'OK');
            return;
        }
        setIsLoading(true);
        showInterstitialIfNeeded(false, async () => {
            try {
                await createRoom(playerName.trim());
            } catch (error) {
                showGameModal(t.common.error, t.online.errors.room_create_error, 'danger', 'OK');
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }).catch(err => {
            console.error(err);
            setIsLoading(false);
        });
    };

    const handleJoinRoom = async () => {
        if (!playerName.trim() || !roomCodeInput.trim()) {
            showGameModal(t.online.errors.missing_info, t.online.errors.name_and_code_required, 'warning', 'OK');
            return;
        }

        const code = roomCodeInput.trim().toUpperCase();
        const nameToCheck = playerName.trim().toLowerCase();
        try {
            const snap = await get(ref(database, `rooms/${code}/players`));
            if (snap.exists()) {
                const players = snap.val();
                const nameExists = Object.values(players).some(
                    (p: any) => p.name?.toLowerCase() === nameToCheck && p.id !== gameState.playerId
                );
                if (nameExists) {
                    showGameModal(
                        t.online.errors.missing_info,
                        t.online.errors.name_taken || 'Ya existe un jugador con ese nombre en la sala. Elige otro nombre.',
                        'warning', 'OK'
                    );
                    return;
                }
            }
        } catch { /* proceed anyway */ }

        setIsLoading(true);
        // Ad shows before joining (room premium status unknown yet, pass undefined)
        showInterstitialIfNeeded(undefined, async () => {
            try {
                const success = await joinRoom(roomCodeInput.trim().toUpperCase(), playerName.trim());
                if (!success) {
                    showGameModal(t.common.error, t.online.errors.room_not_found, 'danger', 'OK');
                }
            } catch (error: any) {
                if (error.message === 'Game already started') {
                    showGameModal(t.common.error, t.online.errors.game_started_desc || t.online.errors.game_started, 'danger', 'OK');
                } else if (error.message === 'Room full') {
                    showGameModal(t.common.error, t.online.errors.room_full || 'Sala llena.', 'warning', 'OK');
                } else {
                    showGameModal(t.common.error, t.online.errors.room_join_error, 'danger', 'OK');
                }
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }).catch(err => {
            console.error(err);
            setIsLoading(false);
        });
    };

    const handleLeaveRoom = async () => {
        await leaveRoom();
        if (!gameState.roomCode) {
            // Already handled by context state update, just UI update effectively
        }
    };

    const shareCode = async () => {
        const code = gameState.roomCode || '';
        try {
            await Share.share({
                message: code,
            });
        } catch {
            // fallback
        }
    };

    const renderPlayerItem = ({ item }: { item: OnlinePlayer }) => {
        const isDisconnected = item.isConnected === false;
        return (
            <View style={[styles.playerCard, isDisconnected && styles.playerCardDisconnected]}>
                <View style={styles.avatarWrapper}>
                    <View style={styles.avatarContainer}>
                        <Image source={AVATAR_ASSETS[item.avatar]} style={[styles.avatarImage, isDisconnected && { opacity: 0.4 }]} />
                    </View>
                    <View style={[styles.connectionDot, { backgroundColor: isDisconnected ? '#E53E3E' : '#48BB78' }]} />
                </View>
                <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{item.name} {item.id === gameState.playerId && t.online.you}</Text>
                    {item.isHost && <Text style={styles.hostBadge}>{t.online.host_badge}</Text>}
                    {isDisconnected && <Text style={styles.disconnectedText}>{t.online.reconnecting}</Text>}
                </View>
                {!isDisconnected && <Ionicons name="checkmark-circle" size={24} color="#48BB78" />}
                {isDisconnected && <Ionicons name="wifi-outline" size={22} color="#E53E3E" />}
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
        const playersList = Object.values(gameState.room.players);

        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleLeaveRoom} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t.online.lobby_title}</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.roomCodeContainer}>
                    <Text style={styles.roomCodeLabel}>{t.online.room_code}</Text>
                    <TouchableOpacity onPress={shareCode} style={styles.codeBox}>
                        <Text selectable style={styles.roomCodeText}>{gameState.roomCode}</Text>
                        <Ionicons name="share-outline" size={20} color="#5B7FDB" />
                    </TouchableOpacity>
                    <Text style={styles.shareHint}>{t.online.share_hint}</Text>
                </View>

                <PremiumRoomBanner />

                <View style={styles.playersListContainer}>
                    <Text style={styles.sectionTitle}>
                        {t.online.players_list} ({playersList.length}/{gameState.room.settings.maxPlayers || 6})
                    </Text>
                    <FlatList
                        data={playersList}
                        keyExtractor={item => item.id}
                        renderItem={renderPlayerItem}
                        contentContainerStyle={styles.listContent}
                    />
                </View>

                <View style={styles.footer}>
                    {gameState.isHost ? (
                        <View>
                            <TouchableOpacity
                                style={[styles.actionButton, playersList.length < 3 && styles.actionButtonDisabled]}
                                onPress={() => navigation.navigate('OnlineSetup')}
                                disabled={playersList.length < 3}
                            >
                                <Text style={styles.actionButtonText}>{t.online.configure_game}</Text>
                            </TouchableOpacity>
                            {playersList.length < 3 && (
                                <Text style={styles.minPlayersHint}>
                                    {t.online.min_players_hint} ({playersList.length}/3)
                                </Text>
                            )}
                        </View>
                    ) : (
                        <View style={styles.waitingMessage}>
                            <Text style={styles.waitingText}>{t.online.waiting_host}</Text>
                            <ActivityIndicator size="small" color="#FFF" style={{ marginTop: 8 }} />
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
            </SafeAreaView>
        );
    }

    // 2. JOIN/CREATE VIEW
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
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
                            value={playerName}
                            onChangeText={setPlayerName}
                            maxLength={12}
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
                            value={roomCodeInput}
                            onChangeText={text => setRoomCodeInput(text.toUpperCase())}
                            maxLength={6}
                            autoCapitalize="characters"
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
        padding: 20,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
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
    connectionDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    disconnectedText: {
        fontSize: 10,
        color: '#E53E3E',
        fontWeight: '600',
        fontStyle: 'italic',
        marginTop: 1,
    },
});
