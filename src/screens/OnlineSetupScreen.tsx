import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useGame } from '../context/GameContext';
import { CATEGORY_IMAGES, CATEGORY_COLORS, CATEGORIES_BIBLICAL, CATEGORIES_GENERAL, ONLINE_STANDARD_CATEGORY_IDS } from '../utils/categoryMetadata';
import { Category, CustomCategory } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { isPremiumCategory } from '../data/categories';

function isCustomCategoryId(id: Category): boolean {
    return !ONLINE_STANDARD_CATEGORY_IDS.has(id as string);
}

type OnlineSetupScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'OnlineSetup'>;
};

const DURATIONS = [
    { value: null, label: 'setup.unlimited' },
    { value: 60, label: '1 setup.minute' },
    { value: 120, label: '2 setup.minutes' },
    { value: 180, label: '3 setup.minutes' },
    { value: 240, label: '4 setup.minutes' },
    { value: 300, label: '5 setup.minutes' }
];

export default function OnlineSetupScreen({ navigation }: OnlineSetupScreenProps) {
    const { t } = useTranslation();
    const { gameState, updateSettings, startGame } = useOnlineGame();
    const { state: globalState } = useGame();

    const [impostorCount, setImpostorCount] = useState(1);
    const [gameDuration, setGameDuration] = useState<number | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<Category[]>(['personajes_biblicos']);
    const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
    const [impostorHint, setImpostorHint] = useState(false);
    const [discussionMode, setDiscussionMode] = useState<'turns' | 'simultaneous'>('turns');
    const [clueDuration, setClueDuration] = useState(30);

    const [activeTab, setActiveTab] = useState<'biblical' | 'general' | 'custom'>('biblical');

    const mergedCustomDefs = useMemo(() => {
        const map = new Map<string, CustomCategory>();
        for (const c of gameState.room?.settings.customCategories || []) {
            map.set(c.id, c);
        }
        for (const c of globalState.customCategories || []) {
            if (!map.has(c.id)) map.set(c.id, c);
        }
        return Array.from(map.values());
    }, [gameState.room?.settings.customCategories, globalState.customCategories]);

    const initializedRef = useRef(false);
    useEffect(() => {
        if (gameState.room && !initializedRef.current) {
            initializedRef.current = true;
            setImpostorCount(gameState.room.settings.impostorCount || 1);
            setGameDuration(gameState.room.settings.gameDuration === undefined ? null : gameState.room.settings.gameDuration);
            setSelectedCategories(gameState.room.settings.categories || []);
            setCustomCategories(gameState.room.settings.customCategories || []);
            setImpostorHint(gameState.room.settings.impostorHint || false);
            setDiscussionMode(gameState.room.settings.discussionMode || 'turns');
            setClueDuration(gameState.room.settings.clueDuration || 30);
        }
    }, [gameState.room]);

    const handleSaveAndStart = async () => {
        if (selectedCategories.length === 0) {
            Alert.alert(t.common.error, t.setup.category_required_alert);
            return;
        }
        const hasPlayableCategory = selectedCategories.some(cat => {
            const id = cat as string;
            const def = mergedCustomDefs.find(c => c.id === id);
            if (def) return def.words.length > 0;
            return ONLINE_STANDARD_CATEGORY_IDS.has(id);
        });
        if (!hasPlayableCategory) {
            Alert.alert(t.common.error, t.setup.category_required_alert);
            return;
        }

        try {
            const customDefsToSave = mergedCustomDefs.filter(c => selectedCategories.includes(c.id as Category));
            const settingsPayload = {
                impostorCount,
                gameDuration,
                categories: selectedCategories,
                customCategories: customDefsToSave,
                impostorHint,
                discussionMode,
                clueDuration,
                isConfigured: true,
            };
            await updateSettings(settingsPayload);
            // Misma instantánea que acaba de ir a Firebase: el listener puede aún no haber actualizado gameState.
            await startGame(settingsPayload);
        } catch (error) {
            console.error('Failed to update settings and start', error);
        }
    };

    const toggleCategory = (categoryId: Category) => {
        if (selectedCategories.includes(categoryId)) {
            setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
            if (isCustomCategoryId(categoryId)) {
                setCustomCategories(prev => prev.filter(c => c.id !== categoryId));
            }
        } else {
            setSelectedCategories([...selectedCategories, categoryId]);
            if (isCustomCategoryId(categoryId)) {
                const def = mergedCustomDefs.find(c => c.id === categoryId);
                if (def) {
                    setCustomCategories(prev =>
                        prev.some(c => c.id === categoryId) ? prev : [...prev, def]
                    );
                }
            }
        }
    };

    if (!gameState.room) return null;

    const playerCount = Object.keys(gameState.room.players).length;
    const maxImpostors = Math.floor(playerCount / 2);

    // Badges por pestaña: solo cuentan categorías de esa pestaña (custom ≠ “fantasma” en Bíblicas).
    const biblicalSelectedCount = CATEGORIES_BIBLICAL.filter(c => selectedCategories.includes(c.id)).length;
    const genericSelectedCount = CATEGORIES_GENERAL.filter(c => selectedCategories.includes(c.id)).length;
    const customSelectedCount = mergedCustomDefs.filter(c => selectedCategories.includes(c.id)).length;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.online.configure_game}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.scrollArea}>
                {/* Impostors */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t.setup.impostors}</Text>
                    <View style={styles.impostorControlContainer}>
                        <TouchableOpacity
                            style={[styles.impostorControlButton, impostorCount <= 1 && styles.impostorControlButtonDisabled]}
                            onPress={() => setImpostorCount(Math.max(1, impostorCount - 1))}
                            disabled={impostorCount <= 1}
                        >
                            <Text style={styles.impostorControlButtonText}>-</Text>
                        </TouchableOpacity>

                        <View style={styles.impostorCountDisplay}>
                            <Text style={styles.impostorCountText}>{impostorCount}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.impostorControlButton, impostorCount >= maxImpostors && styles.impostorControlButtonDisabled]}
                            onPress={() => setImpostorCount(Math.min(maxImpostors, impostorCount + 1))}
                            disabled={impostorCount >= maxImpostors}
                        >
                            <Text style={styles.impostorControlButtonText}>+</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.impostorHint}>
                        Máximo {maxImpostors} impostores (mitad de jugadores)
                    </Text>
                </View>

                {/* Impostor Hint Toggle */}
                <View style={styles.section}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingTextContainer}>
                            <Text style={styles.sectionTitle}>{t.setup.impostor_hint}</Text>
                            <Text style={styles.settingDescription}>{t.setup.impostor_hint_desc}</Text>
                        </View>
                        <Switch
                            value={impostorHint}
                            onValueChange={setImpostorHint}
                            trackColor={{ false: '#CBD5E0', true: '#48BB78' }}
                            thumbColor="#FFF"
                        />
                    </View>
                </View>

                {/* Duration */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t.setup.duration}</Text>
                    <View style={styles.durationTabs}>
                        {DURATIONS.map(dur => {
                            const isSelected = gameDuration === dur.value;
                            const label = dur.value === null ? t.setup.unlimited : dur.label.replace('setup.minutes', t.setup.minutes).replace('setup.minute', t.setup.minute);
                            return (
                                <TouchableOpacity
                                    key={dur.value || 'unlimited'}
                                    style={[styles.durationTab, isSelected && styles.durationTabSelected]}
                                    onPress={() => setGameDuration(dur.value)}
                                >
                                    <Text style={[styles.durationTabText, isSelected && styles.durationTabTextSelected]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Discussion Mode */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t.online.discussion_mode}</Text>
                    <TouchableOpacity
                        style={[styles.modeOptionCard, discussionMode === 'turns' && styles.modeOptionCardSelected]}
                        onPress={() => { setDiscussionMode('turns'); setClueDuration(30); }}
                        activeOpacity={0.8}
                    >
                        <View style={styles.modeOptionContent}>
                            <Text style={[styles.modeOptionTitle, discussionMode === 'turns' && styles.modeOptionTitleSelected]}>
                                {t.online.mode_turns}
                            </Text>
                            <Text style={styles.modeOptionDesc}>{t.online.mode_turns_desc}</Text>
                        </View>
                        {discussionMode === 'turns' && (
                            <Ionicons name="checkmark-circle" size={22} color="#5B7FDB" />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeOptionCard, discussionMode === 'simultaneous' && styles.modeOptionCardSelected]}
                        onPress={() => { setDiscussionMode('simultaneous'); setClueDuration(60); }}
                        activeOpacity={0.8}
                    >
                        <View style={styles.modeOptionContent}>
                            <Text style={[styles.modeOptionTitle, discussionMode === 'simultaneous' && styles.modeOptionTitleSelected]}>
                                {t.online.mode_simultaneous}
                            </Text>
                            <Text style={styles.modeOptionDesc}>{t.online.mode_simultaneous_desc}</Text>
                        </View>
                        {discussionMode === 'simultaneous' && (
                            <Ionicons name="checkmark-circle" size={22} color="#5B7FDB" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Categories */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t.setup.categories}</Text>

                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'biblical' && styles.activeTab]}
                            onPress={() => setActiveTab('biblical')}
                        >
                            <Text style={[styles.tabText, activeTab === 'biblical' && styles.activeTabText]}>{t.setup.biblical_tab}</Text>
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>{biblicalSelectedCount}</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'general' && styles.activeTab]}
                            onPress={() => setActiveTab('general')}
                        >
                            <Text style={[styles.tabText, activeTab === 'general' && styles.activeTabText]}>{t.setup.general_tab}</Text>
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>{genericSelectedCount}</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'custom' && styles.activeTab]}
                            onPress={() => setActiveTab('custom')}
                        >
                            <Text style={[styles.tabText, activeTab === 'custom' && styles.activeTabText]}>{t.setup.custom_tab}</Text>
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>{customSelectedCount}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'custom' && (
                        mergedCustomDefs.length === 0 ? (
                            <Text style={styles.emptyCustomHint}>{t.online.custom_categories_empty}</Text>
                        ) : (
                            <View style={styles.categoriesGrid}>
                                {mergedCustomDefs.map(category => {
                                    const isSelected = selectedCategories.includes(category.id as Category);
                                    return (
                                        <TouchableOpacity
                                            key={category.id}
                                            style={[
                                                styles.categoryCard,
                                                { backgroundColor: '#4A5568' },
                                                isSelected && styles.categoryCardSelected,
                                            ]}
                                            onPress={() => toggleCategory(category.id as Category)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.customCategoryIconWrap}>
                                                <Ionicons name="albums-outline" size={36} color="#E2E8F0" />
                                            </View>
                                            {!isSelected && <View style={styles.inactiveOverlay} />}
                                            <View style={styles.categoryNamePill}>
                                                <Text style={styles.categoryNameText} numberOfLines={2}>
                                                    {category.name}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <View style={styles.categoryCheckBadge}>
                                                    <Ionicons name="checkmark" size={12} color="#FFF" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )
                    )}

                    {(activeTab === 'biblical' || activeTab === 'general') && (
                    <View style={styles.categoriesGrid}>
                        {(activeTab === 'biblical' ? CATEGORIES_BIBLICAL : CATEGORIES_GENERAL).map(category => {
                            const isSelected = selectedCategories.includes(category.id);

                            const isPremium = isPremiumCategory(category.id);
                            const room = gameState.room;
                            const isOriginalHost = room?.originalHostId === gameState.playerId;
                            const isPremiumRoom = room?.settings.isPremiumRoom;

                            // Migrated free host: can't add new premium categories not in snapshot
                            const snapshot = room?.premiumCategoriesSnapshot || [];
                            const lockedForMigratedHost = isPremium && isPremiumRoom && !isOriginalHost && !snapshot.includes(category.id) && !isSelected;
                            const isLocked = (isPremium && !isPremiumRoom) || lockedForMigratedHost;

                            return (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[
                                        styles.categoryCard,
                                        { backgroundColor: isLocked ? '#E2E8F0' : CATEGORY_COLORS[category.id] },
                                        isSelected && styles.categoryCardSelected
                                    ]}
                                    onPress={() => {
                                        if (isLocked) {
                                            Alert.alert("Premium", lockedForMigratedHost
                                                ? "Esta categoría no estaba disponible al crear la sala."
                                                : t.setup.premium_category_alert);
                                            return;
                                        }
                                        toggleCategory(category.id);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Image source={CATEGORY_IMAGES[category.id]} style={[styles.categoryImage, isLocked && { opacity: 0.3 }]} resizeMode="contain" />
                                    {!isSelected && !isLocked && <View style={styles.inactiveOverlay} />}
                                    <View style={styles.categoryNamePill}>
                                        <Text style={styles.categoryNameText} numberOfLines={2}>
                                            {t.setup.categories_list[category.id as keyof typeof t.setup.categories_list] || category.label}
                                        </Text>
                                    </View>
                                    {isSelected && (
                                        <View style={styles.categoryCheckBadge}>
                                            <Ionicons name="checkmark" size={12} color="#FFF" />
                                        </View>
                                    )}
                                    {isLocked && <Image source={require('../../assets/blocked_level_1.png')} style={styles.lockedIcon} resizeMode="contain" />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    )}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.footer}>
                {(() => {
                    const connectedPlayers = gameState.room
                        ? Object.values(gameState.room.players).filter(p => p.isConnected !== false)
                        : [];
                    const hasCategories = selectedCategories.length > 0;
                    const canStart = connectedPlayers.length >= 3 && hasCategories;
                    return (
                        <>
                            <TouchableOpacity
                                style={[styles.saveButton, !canStart && styles.saveButtonDisabled]}
                                onPress={handleSaveAndStart}
                                disabled={!canStart}
                            >
                                <Text style={styles.saveButtonText}>{t.online.start_game}</Text>
                            </TouchableOpacity>
                            {!hasCategories && (
                                <Text style={styles.minPlayersWarning}>
                                    {t.setup.category_required_alert}
                                </Text>
                            )}
                            {hasCategories && connectedPlayers.length < 3 && (
                                <Text style={styles.minPlayersWarning}>
                                    {`Se necesitan al menos 3 jugadores (${connectedPlayers.length}/3)`}
                                </Text>
                            )}
                        </>
                    );
                })()}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2C1A0E',
    },
    backButton: {
        padding: 5,
    },
    scrollArea: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: 15,
    },
    // Impostors
    impostorControlContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 8,
    },
    impostorControlButton: {
        backgroundColor: '#E53E3E',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
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
    },
    impostorCountText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#E53E3E',
    },
    impostorHint: {
        textAlign: 'center',
        color: '#718096',
        fontSize: 12,
        marginTop: 5,
    },
    // Switch row
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F0F4FF',
        padding: 15,
        borderRadius: 16,
    },
    settingTextContainer: {
        flex: 1,
        marginRight: 10,
    },
    settingDescription: {
        color: '#718096',
        fontSize: 12,
        marginTop: 4,
    },
    // Duration
    durationTabs: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    durationTab: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: '#F0F4FF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#A0AEC0',
    },
    durationTabSelected: {
        backgroundColor: '#5B7FDB',
        borderColor: '#5B7FDB',
    },
    durationTabText: {
        color: '#4A5568',
        fontWeight: '600',
    },
    durationTabTextSelected: {
        color: '#FFF',
    },
    // Categories
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F0F4FF',
        borderRadius: 12,
        padding: 4,
        marginBottom: 15,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
        position: 'relative',
    },
    activeTab: {
        backgroundColor: '#FFF',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontWeight: '600',
        color: '#718096',
    },
    activeTabText: {
        color: '#5B7FDB',
    },
    tabBadge: {
        position: 'absolute',
        top: 2,
        right: 6,
        backgroundColor: '#E53E3E',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
    },
    tabBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyCustomHint: {
        color: '#718096',
        fontSize: 14,
        lineHeight: 20,
        marginTop: 8,
        marginBottom: 16,
        textAlign: 'center',
        paddingHorizontal: 12,
    },
    customCategoryIconWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 10,
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
        zIndex: 10,
        minHeight: 44,
    },
    categoryNameText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    categoryCheckBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#48BB78',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    lockedIcon: {
        position: 'absolute',
        width: 30,
        height: 30,
        top: 8,
        left: 8,
        opacity: 0.8,
        zIndex: 3,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    saveButton: {
        backgroundColor: '#E53E3E',
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    saveButtonDisabled: {
        backgroundColor: '#888',
        opacity: 0.5,
        shadowOpacity: 0,
        elevation: 0,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    minPlayersWarning: {
        color: '#E53E3E',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
    modeOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7FAFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    modeOptionCardSelected: {
        borderColor: '#5B7FDB',
        backgroundColor: '#EEF2FF',
    },
    modeOptionContent: {
        flex: 1,
    },
    modeOptionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2D3748',
        marginBottom: 2,
    },
    modeOptionTitleSelected: {
        color: '#5B7FDB',
    },
    modeOptionDesc: {
        fontSize: 12,
        color: '#718096',
    },
});
