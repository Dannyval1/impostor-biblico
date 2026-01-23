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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGame } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { Category, Player, CustomCategory } from '../types';
import { getAvatarSource, TOTAL_AVATARS } from '../utils/avatarAssets';
import { GameModal } from '../components/GameModal';
import { SettingsModal } from '../components/SettingsModal';
import { HowToPlayModal } from '../components/HowToPlayModal';
import { ScaleButton } from '../components/ScaleButton';
import { CreateCategoryModal } from '../components/CreateCategoryModal';

type SetupScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Setup'>;
};

const CATEGORY_IMAGES: Record<Category, any> = {
    'personajes_biblicos': require('../../assets/cat_personajes_biblicos.png'),
    'libros_biblicos': require('../../assets/cat_libros_biblicos.png'),
    'objetos_biblicos': require('../../assets/cat_objetos_biblicos.png'),
    'oficios_biblicos': require('../../assets/cat_oficios_biblicos.png'),
    'lugares_biblicos': require('../../assets/cat_lugares_biblicos.png'),
    'conceptos_teologicos': require('../../assets/cat_conceptos_teologicos.png'),
};

const CATEGORY_COLORS: Record<Category, string> = {
    'personajes_biblicos': '#FFB74D',
    'libros_biblicos': '#F06292',
    'objetos_biblicos': '#7986CB',
    'oficios_biblicos': '#81C784',
    'lugares_biblicos': '#4DD0E1',
    'conceptos_teologicos': '#9575CD',
};

const CATEGORIES: { id: Category; label: string }[] = [
    { id: 'personajes_biblicos', label: 'Personajes bíblicos' },
    { id: 'libros_biblicos', label: 'Libros bíblicos' },
    { id: 'objetos_biblicos', label: 'Objetos bíblicos' },
    { id: 'oficios_biblicos', label: 'Oficios bíblicos' },
    { id: 'lugares_biblicos', label: 'Lugares bíblicos' },
    { id: 'conceptos_teologicos', label: 'Conceptos teológicos' },
];

export default function SetupScreen({ navigation }: SetupScreenProps) {
    const { t } = useTranslation();
    const {
        state,
        addPlayer,
        removePlayer,
        toggleCategory,
        setImpostorCount,
        setGameDuration,
        startGame,
        loadNewWord,
        playClick,
        deleteCustomCategory,
    } = useGame();
    const [playerName, setPlayerName] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const [showDurationPicker, setShowDurationPicker] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
    const [showHowToPlay, setShowHowToPlay] = useState(false);
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
            showGameModal('Error', t.setup.name_required_alert, 'warning', 'OK');
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
            showGameModal('Error', t.setup.min_players_alert, 'danger', 'OK', () => {
                triggerBounce();
            });
            return;
        }

        if (state.settings.selectedCategories.length === 0) {
            showGameModal('Error', t.setup.category_required_alert || 'Selecciona al menos una categoría', 'danger', 'OK');
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
            showGameModal('Error', t.setup.min_players_alert, 'warning', 'OK', () => {
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
            showGameModal('Error', t.setup.min_players_alert, 'warning', 'OK', () => {
                triggerBounce();
            });
            return;
        }

        if (state.settings.impostorCount >= maxImpostors) {
            return;
        }
        setImpostorCount(state.settings.impostorCount + 1);
    };

    const maxImpostors = Math.max(1, state.settings.players.length - 1);
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
                        <TouchableOpacity
                            style={styles.settingsButton}
                            onPress={() => {
                                playClick();
                                setShowSettings(true);
                            }}
                        >
                            <Ionicons name="settings-outline" size={26} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t.setup.mode}</Text>
                            <TouchableOpacity
                                style={styles.helpButtonInternal}
                                onPress={() => {
                                    playClick();
                                    setShowHowToPlay(true);
                                }}
                            >
                                <Ionicons name="help-circle-outline" size={24} color="#5B7FDB" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modeContainer}>
                            <TouchableOpacity
                                style={[styles.modeCard, styles.modeCardSelected]}
                                activeOpacity={0.8}
                            >
                                <Image source={require('../../assets/mode_1.png')} style={styles.modeImageStickOut} resizeMode="contain" />
                                <View style={styles.modeContent}>
                                    <Text style={styles.modeTitle}>{t.setup.classic}</Text>
                                    <Text style={styles.modeSubtitle}>{t.setup.classic_desc}</Text>
                                </View>
                                <View style={styles.checkmark}>
                                    <Ionicons name="checkmark" size={14} color="#FFF" />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modeCard}
                                activeOpacity={0.8}
                                onPress={() => showGameModal(t.setup.online, t.setup.coming_soon, 'info', 'OK')}
                            >
                                <Image source={require('../../assets/mode_2.png')} style={styles.modeImageStickOut} resizeMode="contain" />
                                <View style={styles.modeContent}>
                                    <Text style={styles.modeTitle}>{t.setup.online}</Text>
                                    <Text style={styles.modeSubtitle}>{t.setup.online_desc}</Text>
                                </View>
                                <View style={styles.comingSoonBadge}>
                                    <Text style={styles.comingSoonText}>{t.setup.coming_soon}</Text>
                                </View>
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
                            <View style={styles.playersGrid}>
                                {state.settings.players.map((player: Player) => {
                                    const avatarImage = getAvatarSource(player.avatar);

                                    return (
                                        <View key={player.id} style={[styles.playerCard, { backgroundColor: '#F0F4FF' }]}>
                                            <TouchableOpacity
                                                style={styles.removeButtonPosition}
                                                onPress={() => {
                                                    playClick();
                                                    removePlayer(player.id);
                                                }}
                                            >
                                                <Text style={styles.removeButton}>×</Text>
                                            </TouchableOpacity>

                                            <Image source={avatarImage} style={styles.avatarImage} resizeMode="contain" />

                                            <View style={styles.namePill}>
                                                <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
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
                        <Text style={styles.sectionTitle}>{t.setup.categories}</Text>
                        <View style={styles.categoriesGrid}>
                            {CATEGORIES.map((category) => {
                                const isSelected = state.settings.selectedCategories.includes(category.id);
                                const isPremiumCategory = ['oficios_biblicos', 'lugares_biblicos', 'conceptos_teologicos'].includes(category.id);
                                const isLocked = isPremiumCategory && !state.isPremium;

                                return (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[
                                            styles.categoryCard,
                                            { backgroundColor: isLocked ? '#E2E8F0' : CATEGORY_COLORS[category.id] },
                                            isSelected && styles.categoryCardSelected,
                                        ]}
                                        onPress={() => {
                                            if (isLocked) {
                                                playClick();
                                                navigation.navigate('Paywall');
                                                return;
                                            }
                                            playClick();
                                            toggleCategory(category.id);
                                        }}
                                        activeOpacity={isLocked ? 1 : 0.8}
                                    >
                                        <Image
                                            source={CATEGORY_IMAGES[category.id]}
                                            style={[
                                                styles.categoryImage,
                                                isLocked && { opacity: 0.3 }
                                            ]}
                                            resizeMode="contain"
                                        />

                                        {(!isSelected && !isLocked) && (
                                            <View style={styles.inactiveOverlay} />
                                        )}

                                        <View style={styles.categoryNamePill}>
                                            <Text style={styles.categoryNameText} numberOfLines={2}>
                                                {t.setup.categories_list[category.id as keyof typeof t.setup.categories_list]}
                                            </Text>
                                        </View>

                                        {isSelected && (
                                            <View style={styles.categoryCheckBadge}>
                                                <Ionicons name="checkmark" size={12} color="#FFF" />
                                            </View>
                                        )}

                                        {(!isSelected || isLocked) && (
                                            <View style={styles.inactiveOverlay} />
                                        )}

                                        {isLocked && (
                                            <Image
                                                source={require('../../assets/blocked_level_1.png')}
                                                style={styles.lockedIcon}
                                                resizeMode="contain"
                                            />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}

                            {state.customCategories.map((category) => {
                                const isSelected = state.settings.selectedCategories.includes(category.id);
                                return (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[
                                            styles.categoryCard,
                                            { backgroundColor: '#A0AEC0' }, // Different color for customization
                                            isSelected && styles.categoryCardSelected,
                                            // Removed opacity from style to avoid pill artifacts
                                        ]}
                                        onPress={() => {
                                            playClick();
                                            toggleCategory(category.id as any);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.customIconContainer}>
                                            <Text style={styles.customIconText}>{category.name.charAt(0).toUpperCase()}</Text>
                                        </View>

                                        {!isSelected && (
                                            <View style={styles.inactiveOverlay} />
                                        )}

                                        <View style={styles.categoryNamePill}>
                                            <Text style={styles.categoryNameText} numberOfLines={2}>
                                                {category.name} ({category.words.length})
                                            </Text>
                                        </View>

                                        {isSelected && (
                                            <View style={styles.categoryCheckBadge}>
                                                <Ionicons name="checkmark" size={12} color="#FFF" />
                                            </View>
                                        )}

                                        <TouchableOpacity
                                            style={styles.deleteCategoryButton}
                                            onPress={() => {
                                                playClick();
                                                showGameModal(
                                                    'Borrar Categoría',
                                                    `¿Estás seguro que quieres borrar "${category.name}"?`,
                                                    'danger',
                                                    'Borrar',
                                                    () => deleteCustomCategory(category.id)
                                                );
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={16} color="#FFF" />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.editCategoryButton}
                                            onPress={() => {
                                                playClick();
                                                setEditingCategory(category);
                                                setShowCreateCategoryModal(true);
                                            }}
                                        >
                                            <Ionicons name="pencil" size={16} color="#FFF" />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                );
                            })}

                            <TouchableOpacity
                                style={[styles.categoryCard, styles.addCategoryCard]}
                                onPress={() => {
                                    playClick();
                                    const isPro = state.isPremium;

                                    if (!isPro && state.customCategories.length >= 1) {
                                        navigation.navigate('Paywall');
                                        return;
                                    }

                                    setShowCreateCategoryModal(true);
                                }}
                            >
                                <Ionicons name="add-circle-outline" size={40} color="#CBD5E0" />
                                <Text style={styles.addCategoryText}>{t.setup.add}</Text>
                                {!state.isPremium && state.customCategories.length >= 1 && (
                                    <Image
                                        source={require('../../assets/blocked_level_1.png')}
                                        style={styles.miniLockedIcon}
                                        resizeMode="contain"
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t.setup.duration}</Text>
                        <TouchableOpacity
                            style={styles.durationSelector}
                            onPress={() => setShowDurationPicker(true)}
                        >
                            <Text style={styles.durationSelectorText}>{durationLabel}</Text>
                            <Ionicons name="chevron-down" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t.setup.impostors}</Text>
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

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom Sticky Button Container */}
            <View style={styles.bottomContainer}>
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
            <CreateCategoryModal
                visible={showCreateCategoryModal}
                onClose={() => {
                    setShowCreateCategoryModal(false);
                    setEditingCategory(null);
                }}
                initialCategory={editingCategory}
            />

            <HowToPlayModal
                visible={showHowToPlay}
                onClose={() => setShowHowToPlay(false)}
            />
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
    helpButton: {
        padding: 4,
    },
    helpButtonInternal: {
        padding: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    modeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20, // Space for the sticking out image
    },
    modeCard: {
        width: '48%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        paddingTop: 40,
        paddingBottom: 16,
        paddingHorizontal: 12,
        alignItems: 'center',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    modeCardSelected: {
        borderColor: '#5B7FDB',
        backgroundColor: '#fdf6cd',
    },
    modeImageStickOut: {
        width: 80,
        height: 80,
        position: 'absolute',
        top: -40,
        alignSelf: 'center',
        zIndex: 1,
    },
    modeContent: {
        alignItems: 'center',
        marginTop: 10,
    },
    modeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
        textAlign: 'center',
    },
    modeSubtitle: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
        lineHeight: 14,
    },
    checkmark: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#5B7FDB',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    comingSoonBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#E53E3E',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        zIndex: 20,
    },
    comingSoonText: {
        color: '#FFF',
        fontSize: 8,
        fontWeight: 'bold',
    },
    playersHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 0,
    },
    playersGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 12,
        marginBottom: 16,
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
    },
    removeButtonPosition: {
        position: 'absolute',
        top: 4,
        right: 4,
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButton: {
        fontSize: 14,
        color: '#E53E3E',
        fontWeight: 'bold',
        marginTop: -1,
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
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    categoryCard: {
        width: '48%',
        aspectRatio: 1,
        borderRadius: 20,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 40,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    categoryCardSelected: {
        borderColor: '#5B7FDB',
        borderWidth: 3,
        transform: [{ scale: 1.02 }],
    },
    categoryCardUnselected: {},
    inactiveOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 20,
        zIndex: 1,
    },
    categoryImage: {
        width: '90%',
        height: '90%',
        position: 'absolute',
        top: 20,
    },
    categoryNamePill: {
        position: 'absolute',
        bottom: -20,
        backgroundColor: '#FFF',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 10, // Ensure it sits above the overlay
        minHeight: 44,
    },
    categoryNameText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    categoryCheckBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#5B7FDB',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    customIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    customIconText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    addCategoryCard: {
        backgroundColor: '#F7FAFC',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 0,
    },
    addCategoryText: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#A0AEC0',
    },
    deleteCategoryButton: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#E53E3E',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    editCategoryButton: {
        position: 'absolute',
        top: 8,
        left: 44, // Offset from delete button
        backgroundColor: '#4299E1',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    miniLockedIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        zIndex: 10,
    },
    lockedIcon: {
        position: 'absolute',
        top: '20%',
        width: '50%',
        height: '50%',
        zIndex: 10,
        opacity: 0.9,
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
        backgroundColor: '#FFF',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    // Impostors
    impostorControlContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 8,
    },
    impostorControlButton: {
        backgroundColor: '#E53E3E',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    impostorControlButtonDisabled: {
        backgroundColor: '#CCC',
        opacity: 0.5,
    },
    impostorControlButtonText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
    },
    impostorCountDisplay: {
        backgroundColor: '#FFF',
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#E53E3E',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    impostorCountText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#E53E3E',
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