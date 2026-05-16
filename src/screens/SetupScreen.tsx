import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    Modal,
    StatusBar,
    Animated,
    Switch,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGame } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { Player } from '../types';
import { getAvatarSource, TOTAL_AVATARS } from '../utils/avatarAssets';
import { GameModal } from '../components/GameModal';
import { SettingsModal } from '../components/SettingsModal';
import { HowToPlayModal } from '../components/HowToPlayModal';
import { ScaleButton } from '../components/ScaleButton';
import { usePurchase } from '../context/PurchaseContext';

type SetupScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Setup'>;
};

export default function SetupScreen({ navigation }: SetupScreenProps) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const {
        state,
        addPlayer,
        removePlayer,
        setImpostorCount,
        setGameDuration,
        startGame,
        loadNewWord,
        playClick,
        updatePlayerName,
        toggleImpostorHint,
    } = useGame();
    const { isPremium } = usePurchase();

    const [playerName, setPlayerName] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const [showDurationPicker, setShowDurationPicker] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHowToPlay, setShowHowToPlay] = useState(false);

    // Player Name Editing
    const [showEditNameModal, setShowEditNameModal] = useState(false);
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
    const [editingPlayerName, setEditingPlayerName] = useState('');
    const bounceAnim = useRef(new Animated.Value(1)).current;
    const playersSectionY = useRef<number>(0);

    const triggerBounce = () => {
        // Scroll to the top
        scrollViewRef.current?.scrollTo({
            y: 0,
            animated: true,
        });

        // Add a small delay for the scroll to start before bouncing
        setTimeout(() => {
            Animated.sequence([
                Animated.timing(bounceAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
                Animated.timing(bounceAnim, { toValue: 1.0, duration: 150, useNativeDriver: true }),
                Animated.timing(bounceAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
                Animated.timing(bounceAnim, { toValue: 1.0, duration: 150, useNativeDriver: true }),
            ]).start();
        }, 300);
    };

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

    useEffect(() => {
        if (state.settings.selectedCategories.length > 0 && !state.currentWord) {
            loadNewWord();
        }
    }, [state.settings.selectedCategories]);



    const handleAddPlayer = () => {
        if (!playerName.trim()) {
            showGameModal(t.error, t.setup.name_required_alert, 'warning', t.ok);
            return;
        }

        if (state.settings.players.length >= TOTAL_AVATARS) {
            return;
        }

        addPlayer(playerName.trim());
        setPlayerName('');
        Keyboard.dismiss();
        playClick();
    };

    const handleStartGame = () => {
        if (state.settings.players.length < 3) {
            showGameModal(t.error, t.setup.min_players_alert, 'danger', t.ok, () => {
                triggerBounce();
            });
            return;
        }

        if (state.settings.selectedCategories.length === 0) {
            showGameModal(t.error, t.setup.category_required_alert || 'Selecciona al menos una categoría', 'danger', t.ok);
            return;
        }

        // Ad Logic: Check every 3 games (Only if NOT Premium)
        if (!state.isPremium && state.gamesPlayed >= 3) {
            navigation.navigate('Ad');
            return;
        }

        startGame();
        playClick();
        navigation.navigate('Reveal');
    };

    const handleDecreaseImpostors = () => {
        playClick();
        if (state.settings.players.length < 3) {
            showGameModal(t.error, t.setup.min_players_alert, 'warning', t.ok, () => {
                triggerBounce();
            });
            return;
        }

        if (state.settings.impostorCount <= 1) {
            return;
        }
        setImpostorCount(state.settings.impostorCount - 1);
    };

    const handleIncreaseImpostors = () => {
        playClick();
        if (state.settings.players.length < 3) {
            showGameModal(t.error, t.setup.min_players_alert, 'warning', t.ok, () => {
                triggerBounce();
            });
            return;
        }

        if (state.settings.impostorCount >= maxImpostors) {
            return;
        }
        setImpostorCount(state.settings.impostorCount + 1);
    };

    const maxImpostors = Math.max(1, Math.min(2, Math.floor(state.settings.players.length / 2)));
    const DURATION_OPTIONS = [
        { value: null, label: t.setup.unlimited },
        { value: 60, label: `1 ${t.setup.minute}` },
        { value: 120, label: `2 ${t.setup.minutes}` },
        { value: 180, label: `3 ${t.setup.minutes}` },
        { value: 300, label: `5 ${t.setup.minutes}` },
        { value: 420, label: `7 ${t.setup.minutes}` },
        { value: 600, label: `10 ${t.setup.minutes}` },
    ];
    const selectedDuration = DURATION_OPTIONS.find(opt => opt.value === state.settings.gameDuration);
    const durationLabel = selectedDuration?.label || t.setup.unlimited;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => {
                                playClick();
                                if (navigation.canGoBack()) {
                                    navigation.goBack();
                                } else {
                                    navigation.replace('Home');
                                }
                            }}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={28} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{t.setup.title}</Text>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.helpButtonInternal}
                                onPress={() => { playClick(); setShowHowToPlay(true); }}
                            >
                                <Ionicons name="help-circle-outline" size={26} color="#5B7FDB" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.settingsButton}
                                onPress={() => { playClick(); setShowSettings(true); }}
                            >
                                <Ionicons name="settings-outline" size={26} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Animated.View
                        style={[styles.section, { transform: [{ scale: bounceAnim }] }]}
                        onLayout={(event) => {
                            playersSectionY.current = event.nativeEvent.layout.y;
                        }}
                    >
                        <View style={styles.playersHeader}>
                            <Text style={styles.sectionTitle}>{t.setup.players}</Text>
                            <Text style={styles.playerCount}>
                                {state.settings.players.length}/{TOTAL_AVATARS}
                            </Text>
                        </View>

                        {state.settings.players.length > 0 && (
                            <View style={styles.playersList}>
                                {state.settings.players.map((player: Player, index: number) => (
                                    <View key={player.id} style={styles.playerRow}>
                                        <View style={styles.playerRowLeft}>
                                            <Text style={styles.playerNumber}>{index + 1}.</Text>
                                            <TouchableOpacity
                                                style={styles.playerNameContainer}
                                                onPress={() => {
                                                    playClick();
                                                    setEditingPlayerId(player.id);
                                                    setEditingPlayerName(player.name);
                                                    setShowEditNameModal(true);
                                                }}
                                            >
                                                <Text style={styles.playerNameText} numberOfLines={1}>
                                                    {player.name}
                                                </Text>
                                                <Ionicons name="pencil" size={14} color="#666" style={styles.editIcon} />
                                            </TouchableOpacity>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => {
                                                playClick();
                                                removePlayer(player.id);
                                            }}
                                        >
                                            <Ionicons name="close-circle" size={24} color="#E53E3E" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        {state.settings.players.length < TOTAL_AVATARS && (
                            <View style={styles.addPlayerContainer}>
                                <TextInput
                                    style={styles.playerInput}
                                    placeholder={t.setup.add_player_placeholder}
                                    value={playerName}
                                    onChangeText={setPlayerName}
                                    onSubmitEditing={handleAddPlayer}
                                    returnKeyType="done"
                                    maxLength={15}
                                />
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={handleAddPlayer}
                                >
                                    <Text style={styles.addButtonText}>+ {t.setup.add}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animated.View>

                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.settingRow}
                            activeOpacity={0.7}
                            onPress={() => { playClick(); navigation.navigate('Categories'); }}
                        >
                            <Text style={styles.settingTitle}>{t.setup.categories}</Text>
                            <View style={styles.categoriesTriggerRight}>
                                {state.settings.selectedCategories.length > 0 && (
                                    <View style={styles.categoriesCountBadge}>
                                        <Text style={styles.categoriesCountText}>
                                            {state.settings.selectedCategories.length}
                                        </Text>
                                    </View>
                                )}
                                <Ionicons name="chevron-forward" size={20} color="#666" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.settingRow}>
                            <Text style={styles.settingTitle}>{t.setup.impostors}</Text>
                            <View style={styles.impostorControlContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.impostorControlButton,
                                        state.settings.impostorCount <= 1 && styles.impostorControlButtonDisabled
                                    ]}
                                    onPress={handleDecreaseImpostors}
                                >
                                    <Text style={styles.impostorControlButtonText}>−</Text>
                                </TouchableOpacity>

                                <View style={styles.impostorCountDisplay}>
                                    <Text style={styles.impostorCountText}>{state.settings.impostorCount}</Text>
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.impostorControlButton,
                                        state.settings.impostorCount >= maxImpostors && styles.impostorControlButtonDisabled
                                    ]}
                                    onPress={handleIncreaseImpostors}
                                >
                                    <Text style={styles.impostorControlButtonText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.settingRow}>
                            <Text style={styles.settingTitle}>{t.setup.impostor_hint}</Text>
                            <Switch
                                value={state.settings.impostorHintEnabled}
                                onValueChange={(val) => {
                                    playClick();
                                    toggleImpostorHint(val);
                                }}
                                trackColor={{ false: '#767577', true: '#5B7FDB' }}
                                thumbColor={state.settings.impostorHintEnabled ? '#FFF' : '#f4f3f4'}
                                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], alignSelf: 'center' }}
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.settingRow}>
                            <Text style={styles.settingTitle}>{t.setup.duration}</Text>
                            <TouchableOpacity
                                style={styles.durationSelector}
                                onPress={() => setShowDurationPicker(true)}
                            >
                                <Text style={styles.durationSelectorText}>{durationLabel}</Text>
                                <Ionicons name="chevron-down" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom Sticky Button Container */}
            <View style={[styles.bottomContainer, { paddingBottom: Math.max(12, insets.bottom + 4) }]}>
                <ScaleButton
                    style={[
                        styles.startButton,
                        state.settings.players.length < 3 && styles.startButtonDisabled,
                    ]}
                    onPress={handleStartGame}
                >
                    <Text style={styles.startButtonText}>{t.setup.start_game}</Text>
                </ScaleButton>
            </View>


            {/* Duration Picker Modal */}
            <Modal
                visible={showDurationPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDurationPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowDurationPicker(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t.setup.duration}</Text>
                        {DURATION_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.label}
                                style={[
                                    styles.modalOption,
                                    state.settings.gameDuration === option.value && styles.modalOptionSelected
                                ]}
                                onPress={() => {
                                    playClick();
                                    setGameDuration(option.value);
                                    setShowDurationPicker(false);
                                }}
                            >
                                <Text style={[
                                    styles.modalOptionText,
                                    state.settings.gameDuration === option.value && styles.modalOptionTextSelected
                                ]}>
                                    {option.label}
                                </Text>
                                {state.settings.gameDuration === option.value && (
                                    <Ionicons name="checkmark" size={20} color="#5B7FDB" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
            <GameModal
                visible={modalVisible}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                buttonText={modalConfig.buttonText}
                onClose={modalConfig.onClose}
            />
            <SettingsModal
                visible={showSettings}
                onClose={() => setShowSettings(false)}
            />
            <HowToPlayModal
                visible={showHowToPlay}
                onClose={() => setShowHowToPlay(false)}
            />


            <Modal
                visible={showEditNameModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowEditNameModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => {
                        setShowEditNameModal(false);
                        Keyboard.dismiss();
                    }}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContent}
                    >
                        <Text style={styles.modalTitle}>{t.setup.edit_name_title}</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editingPlayerName}
                            onChangeText={setEditingPlayerName}
                            autoFocus={true}
                            maxLength={15}
                            placeholder={t.setup.edit_name_placeholder}
                            placeholderTextColor="#A0AEC0"
                            onSubmitEditing={() => {
                                if (editingPlayerId && editingPlayerName.trim()) {
                                    updatePlayerName(editingPlayerId, editingPlayerName.trim());
                                    setShowEditNameModal(false);
                                    playClick();
                                }
                            }}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowEditNameModal(false);
                                    playClick();
                                }}
                                style={styles.modalButtonCancel}
                            >
                                <Text style={styles.modalButtonCancelText}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    if (editingPlayerId && editingPlayerName.trim()) {
                                        updatePlayerName(editingPlayerId, editingPlayerName.trim());
                                        setShowEditNameModal(false);
                                        playClick();
                                    }
                                }}
                                style={styles.modalButtonSave}
                            >
                                <Text style={styles.modalButtonSaveText}>{t.setup.save_button}</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </TouchableOpacity>
            </Modal>

        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 20 : 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    settingsButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 16,
        color: '#000',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    helpButtonInternal: {
        padding: 4,
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12, // Use padding instead of fixed height for better alignment
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        minHeight: 56, // Ensure minimum height
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    playersHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 0,
    },
    playersList: {
        marginBottom: 16,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    playerRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    playerNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#A0AEC0',
        width: 30,
    },
    playerNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    playerNameText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginRight: 8,
    },
    editIcon: {
        opacity: 0.5,
    },
    removeButton: {
        padding: 4,
    },
    addPlayerContainer: {
        flexDirection: 'row',
        marginTop: 8,
    },
    playerInput: {
        flex: 1,
        backgroundColor: '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        fontSize: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    addButton: {
        backgroundColor: '#F9E675',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    addButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    playerCount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    categoriesTriggerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoriesCountBadge: {
        backgroundColor: '#5B7FDB',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 24,
        alignItems: 'center',
    },
    categoriesCountText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
    },
    // Word Preview

    wordPreviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F4FF',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    refreshButtonText: {
        color: '#5B7FDB',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    wordPreviewCard: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#5B7FDB',
    },
    wordPreviewWord: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 12,
    },
    wordPreviewHint: {
        backgroundColor: '#F0F4FF',
        padding: 12,
        borderRadius: 8,
    },
    wordPreviewHintLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5B7FDB',
        marginBottom: 4,
    },
    wordPreviewHintText: {
        fontSize: 14,
        color: '#666',
    },
    // Duration
    durationSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    durationSelectorText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#F5F5F5',
    },
    modalOptionSelected: {
        backgroundColor: '#F0F4FF',
        borderWidth: 2,
        borderColor: '#5B7FDB',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#333',
    },
    modalOptionTextSelected: {
        fontWeight: '600',
        color: '#5B7FDB',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 24,
        gap: 12,
        marginBottom: 8,
    },
    modalButtonCancel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    modalButtonCancelText: {
        color: '#718096',
        fontWeight: '600',
        fontSize: 16,
    },
    modalButtonSave: {
        backgroundColor: '#5B7FDB',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 10,
        shadowColor: '#5B7FDB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    modalButtonSaveText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalInput: {
        backgroundColor: '#F7FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 18,
        color: '#2D3748',
        marginBottom: 8,
    },
    // Impostors
    impostorControlContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
    },
    impostorControlButton: {
        backgroundColor: '#5B7FDB',
        width: 30, // Reduced from 36
        height: 30, // Reduced from 36
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    impostorControlButtonDisabled: {
        backgroundColor: '#CCC',
        opacity: 0.5,
    },
    impostorControlButtonText: {
        fontSize: 18, // Reduced from 20
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: -2,
    },
    impostorCountDisplay: {
        minWidth: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    impostorCountText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#333',
    },
    impostorHint: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
    startButton: {
        backgroundColor: '#F9E675',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    startButtonDisabled: {
        backgroundColor: '#CCC',
    },
    startButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '600',
    },
});