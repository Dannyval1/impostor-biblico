import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, Alert, Switch } from 'react-native';
import { GameModal } from './GameModal';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useGame } from '../context/GameContext';
import { CATEGORY_IMAGES, CATEGORY_COLORS, CATEGORIES_BIBLICAL, CATEGORIES_GENERAL, ONLINE_STANDARD_CATEGORY_IDS } from '../utils/categoryMetadata';
import { Category, CustomCategory } from '../types';
import { isPremiumCategory } from '../data/categories';
import { usePurchase } from '../context/PurchaseContext';

function isCustomCategoryIdModal(id: Category): boolean {
    return !ONLINE_STANDARD_CATEGORY_IDS.has(id as string);
}

interface OnlineSettingsModalProps {
    visible: boolean;
    onClose: () => void;
}

const DURATIONS = [
    { value: null, label: 'setup.unlimited' },
    { value: 60, label: '1 setup.minute' },
    { value: 120, label: '2 setup.minutes' },
    { value: 180, label: '3 setup.minutes' },
    { value: 240, label: '4 setup.minutes' },
    { value: 300, label: '5 setup.minutes' }
];

export function OnlineSettingsModal({ visible, onClose }: OnlineSettingsModalProps) {
    const { t } = useTranslation();
    const { gameState, updateSettings } = useOnlineGame();
    const { state: globalState } = useGame();
    const { isCategoryUnlockedByAd } = usePurchase();

    const [premiumModal, setPremiumModal] = useState<'migrated' | 'paywall' | null>(null);

    const [impostorCount, setImpostorCount] = useState(1);
    const [gameDuration, setGameDuration] = useState<number | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<Category[]>(['personajes_biblicos']);
    const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
    const [impostorHint, setImpostorHint] = useState(false);

    const [activeTab, setActiveTab] = useState<'biblical' | 'general'>('biblical');

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

    const prevVisibleRef = useRef(false);
    useEffect(() => {
        if (visible && !prevVisibleRef.current && gameState.room) {
            setImpostorCount(gameState.room.settings.impostorCount || 1);
            setGameDuration(gameState.room.settings.gameDuration === undefined ? null : gameState.room.settings.gameDuration);
            setSelectedCategories(gameState.room.settings.categories || []);
            setCustomCategories(gameState.room.settings.customCategories || []);
            setImpostorHint(gameState.room.settings.impostorHint || false);
        }
        prevVisibleRef.current = visible;
    }, [visible, gameState.room]);

    const handleSave = async () => {
        if (selectedCategories.length === 0) {
            Alert.alert(t.common.error, t.setup.category_required_alert);
            return;
        }

        try {
            const customDefsToSave = mergedCustomDefs.filter(c => selectedCategories.includes(c.id as Category));
            await updateSettings({
                impostorCount,
                gameDuration,
                categories: selectedCategories,
                customCategories: customDefsToSave,
                impostorHint
            });
            onClose();
        } catch (error) {
            console.error('Failed to update settings', error);
        }
    };

    const toggleCategory = (categoryId: Category) => {
        if (selectedCategories.includes(categoryId)) {
            setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
            if (isCustomCategoryIdModal(categoryId)) {
                setCustomCategories(prev => prev.filter(c => c.id !== categoryId));
            }
        } else {
            setSelectedCategories([...selectedCategories, categoryId]);
            if (isCustomCategoryIdModal(categoryId)) {
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

    const biblicalSelectedCount =
        CATEGORIES_BIBLICAL.filter(c => selectedCategories.includes(c.id)).length +
        mergedCustomDefs.filter(
            c => selectedCategories.includes(c.id as Category) && (c.type === 'biblical' || !c.type)
        ).length;
    const genericSelectedCount =
        CATEGORIES_GENERAL.filter(c => selectedCategories.includes(c.id)).length +
        mergedCustomDefs.filter(
            c => selectedCategories.includes(c.id as Category) && c.type === 'general'
        ).length;

    return (
        <>
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{t.online.room_settings_title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
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
                                {t.online.room_settings_impostor_cap_hint.replace('{max}', String(maxImpostors))}
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
                            </View>

                            <View style={styles.categoriesGrid}>
                                {(activeTab === 'biblical' ? CATEGORIES_BIBLICAL : CATEGORIES_GENERAL).map(category => {
                                    const isSelected = selectedCategories.includes(category.id);

                                    const isPremiumCat = isPremiumCategory(category.id);
                                    const room = gameState.room;
                                    const isOriginalHost = room?.originalHostId === gameState.playerId;
                                    const isPremiumRoom = room?.settings.isPremiumRoom;
                                    const snapshot = room?.premiumCategoriesSnapshot || [];
                                    const lockedForMigrated = isPremiumCat && isPremiumRoom && !isOriginalHost && !snapshot.includes(category.id as any) && !isSelected;
                                    const canUsePremiumHere =
                                        isPremiumRoom ||
                                        globalState.isPremium ||
                                        (isPremiumCat && isCategoryUnlockedByAd(category.id));
                                    const isLocked = (isPremiumCat && !canUsePremiumHere) || lockedForMigrated;

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
                                                    setPremiumModal(lockedForMigrated ? 'migrated' : 'paywall');
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

                                {mergedCustomDefs
                                    .filter(c =>
                                        activeTab === 'biblical'
                                            ? c.type === 'biblical' || !c.type
                                            : c.type === 'general'
                                    )
                                    .map(category => {
                                        const isSelected = selectedCategories.includes(category.id as Category);
                                        return (
                                            <TouchableOpacity
                                                key={category.id}
                                                style={[
                                                    styles.categoryCard,
                                                    { backgroundColor: '#A0AEC0' },
                                                    isSelected && styles.categoryCardSelected,
                                                ]}
                                                onPress={() => toggleCategory(category.id as Category)}
                                                activeOpacity={0.8}
                                            >
                                                <View style={styles.customIconContainer}>
                                                    <Text style={styles.customIconText}>{category.name.charAt(0).toUpperCase()}</Text>
                                                </View>
                                                {!isSelected && <View style={styles.inactiveOverlay} />}
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
                                            </TouchableOpacity>
                                        );
                                    })}
                            </View>
                        </View>
                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>{t.setup.save_button}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        <GameModal
            visible={premiumModal !== null}
            type="info"
            title={t.online.premium_category_modal_title}
            message={
                premiumModal === 'migrated'
                    ? t.online.premium_migrated_category_note
                    : t.setup.premium_category_alert
            }
            buttonText={t.common.ok}
            onClose={() => setPremiumModal(null)}
        />
        </>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '85%',
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
    closeButton: {
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
    customIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    customIconText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
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
        borderRadius: 16,
        marginBottom: 16,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    categoryCardSelected: {
        borderWidth: 3,
        borderColor: '#48BB78',
    },
    categoryImage: {
        width: '70%',
        height: '70%',
    },
    categoryNamePill: {
        position: 'absolute',
        bottom: -10,
        backgroundColor: '#FFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 3,
        maxWidth: '110%',
        zIndex: 2,
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
    inactiveOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 16,
        zIndex: 1,
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
        paddingBottom: 40,
    },
    saveButton: {
        backgroundColor: '#5B7FDB',
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
