import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    StatusBar,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useGame } from '../context/GameContext';
import { usePurchase } from '../context/PurchaseContext';
import { CATEGORY_IMAGES, CATEGORY_COLORS, CATEGORIES_BIBLICAL, CATEGORIES_GENERAL, ONLINE_STANDARD_CATEGORY_IDS } from '../utils/categoryMetadata';
import { Category, CustomCategory } from '../types';
import { isPremiumCategory } from '../data/categories';
import { GameModal } from '../components/GameModal';
import { CreateCategoryModal } from '../components/CreateCategoryModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAT_CARD_WIDTH = Math.floor((SCREEN_WIDTH - 48) / 3);

function isCustomCategoryId(id: Category): boolean {
    return !ONLINE_STANDARD_CATEGORY_IDS.has(id as string);
}

type OnlineCategoriesScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'OnlineCategories'>;
};

export default function OnlineCategoriesScreen({ navigation }: OnlineCategoriesScreenProps) {
    const { t } = useTranslation();
    const { gameState, settingsDraft, updateSettingsDraft } = useOnlineGame();
    const { state: globalState, deleteCustomCategory } = useGame();
    const { isCategoryUnlockedByAd } = usePurchase();

    const [activeTab, setActiveTab] = useState<'biblical' | 'general'>('biblical');
    const [migratedModal, setMigratedModal] = useState(false);
    const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
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

    const selectedCategories = settingsDraft?.categories ?? ['personajes_biblicos'];

    const mergedCustomDefs = useMemo(() => {
        const map = new Map<string, CustomCategory>();
        for (const c of settingsDraft?.customCategories || gameState.room?.settings.customCategories || []) {
            map.set(c.id, c);
        }
        for (const c of globalState.customCategories || []) {
            if (!map.has(c.id)) map.set(c.id, c);
        }
        return Array.from(map.values());
    }, [settingsDraft?.customCategories, gameState.room?.settings.customCategories, globalState.customCategories]);

    const toggleCategory = (categoryId: Category) => {
        if (selectedCategories.includes(categoryId)) {
            const nextCategories = selectedCategories.filter(id => id !== categoryId);
            const nextCustom = isCustomCategoryId(categoryId)
                ? (settingsDraft?.customCategories || []).filter(c => c.id !== categoryId)
                : (settingsDraft?.customCategories || []);
            updateSettingsDraft({ categories: nextCategories, customCategories: nextCustom });
        } else {
            const nextCategories = [...selectedCategories, categoryId];
            let nextCustom = settingsDraft?.customCategories || [];
            if (isCustomCategoryId(categoryId)) {
                const def = mergedCustomDefs.find(c => c.id === categoryId);
                if (def && !nextCustom.some(c => c.id === categoryId)) {
                    nextCustom = [...nextCustom, def];
                }
            }
            updateSettingsDraft({ categories: nextCategories, customCategories: nextCustom });
        }
    };

    const handleDeleteCustomCategory = (categoryId: string, categoryName: string) => {
        showGameModal(
            t.custom_category.delete_title,
            t.custom_category.delete_confirm.replace('%{name}', categoryName),
            'danger',
            t.custom_category.delete_button,
            () => {
                deleteCustomCategory(categoryId);
                const nextCategories = selectedCategories.filter(id => id !== categoryId);
                const nextCustom = (settingsDraft?.customCategories || []).filter(c => c.id !== categoryId);
                updateSettingsDraft({ categories: nextCategories, customCategories: nextCustom });
            }
        );
    };

    const biblicalSelectedCount =
        CATEGORIES_BIBLICAL.filter(c => selectedCategories.includes(c.id)).length +
        mergedCustomDefs.filter(c => selectedCategories.includes(c.id as Category) && (c.type === 'biblical' || !c.type)).length;

    const genericSelectedCount =
        CATEGORIES_GENERAL.filter(c => selectedCategories.includes(c.id)).length +
        mergedCustomDefs.filter(c => selectedCategories.includes(c.id as Category) && c.type === 'general').length;

    const room = gameState.room;
    const isPremiumRoom = room?.settings.isPremiumRoom;
    const isOriginalHost = room?.originalHostId === gameState.playerId;
    const snapshot = room?.premiumCategoriesSnapshot || [];

    const currentList = activeTab === 'biblical' ? CATEGORIES_BIBLICAL : CATEGORIES_GENERAL;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.setup.categories}</Text>
                <View style={styles.headerRight} />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'biblical' && styles.activeTab]}
                    onPress={() => setActiveTab('biblical')}
                >
                    <Text style={[styles.tabText, activeTab === 'biblical' && styles.activeTabText]}>
                        {t.setup.biblical_tab}
                    </Text>
                    <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{biblicalSelectedCount}</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'general' && styles.activeTab]}
                    onPress={() => setActiveTab('general')}
                >
                    <Text style={[styles.tabText, activeTab === 'general' && styles.activeTabText]}>
                        {t.setup.general_tab}
                    </Text>
                    <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{genericSelectedCount}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.grid}>
                {currentList.map(category => {
                    const isSelected = selectedCategories.includes(category.id);
                    const isPremium = isPremiumCategory(category.id);
                    const lockedForMigratedHost = isPremium && isPremiumRoom && !isOriginalHost && !snapshot.includes(category.id) && !isSelected;
                    const canUsePremiumHere =
                        isPremiumRoom ||
                        globalState.isPremium ||
                        (isPremium && isCategoryUnlockedByAd(category.id));
                    const isLocked = (isPremium && !canUsePremiumHere) || lockedForMigratedHost;

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
                                    if (lockedForMigratedHost) {
                                        setMigratedModal(true);
                                    } else {
                                        navigation.navigate('Paywall');
                                    }
                                    return;
                                }
                                toggleCategory(category.id);
                            }}
                            activeOpacity={0.8}
                        >
                            <Image
                                source={CATEGORY_IMAGES[category.id]}
                                style={[styles.categoryImage, isLocked && { opacity: 0.3 }]}
                                resizeMode="contain"
                            />
                            {!isSelected && !isLocked && <View style={styles.inactiveOverlay} />}
                            {isLocked && <View style={styles.inactiveOverlay} />}
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

                {mergedCustomDefs
                    .filter(c => activeTab === 'biblical' ? (c.type === 'biblical' || !c.type) : c.type === 'general')
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
                                <TouchableOpacity
                                    style={styles.deleteCategoryButton}
                                    onPress={() => handleDeleteCustomCategory(category.id, category.name)}
                                >
                                    <Ionicons name="trash-outline" size={16} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.editCategoryButton}
                                    onPress={() => { setEditingCategory(category); setShowCreateCategoryModal(true); }}
                                >
                                    <Ionicons name="pencil" size={16} color="#FFF" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })}

                <TouchableOpacity
                    style={[styles.categoryCard, styles.addCategoryCard]}
                    onPress={() => {
                        const isLocked = activeTab === 'biblical'
                            ? !globalState.isPremium && mergedCustomDefs.length >= 1
                            : !globalState.isPremium;
                        if (isLocked) {
                            navigation.navigate('Paywall');
                            return;
                        }
                        setShowCreateCategoryModal(true);
                    }}
                >
                    <Ionicons
                        name="add-circle-outline"
                        size={36}
                        color={(!globalState.isPremium && (activeTab === 'general' || mergedCustomDefs.length >= 1)) ? '#A0AEC0' : '#CBD5E0'}
                    />
                    <Text style={styles.addCategoryText}>{t.setup.add}</Text>
                    {!globalState.isPremium && (activeTab === 'general' || mergedCustomDefs.length >= 1) && (
                        <Image
                            source={require('../../assets/blocked_level_1.png')}
                            style={styles.miniLockedIcon}
                            resizeMode="contain"
                        />
                    )}
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                    <Text style={styles.doneButtonText}>{t.common.done}</Text>
                </TouchableOpacity>
            </View>

            <CreateCategoryModal
                visible={showCreateCategoryModal}
                onClose={() => {
                    setShowCreateCategoryModal(false);
                    setEditingCategory(null);
                }}
                initialCategory={editingCategory}
                categoryType={activeTab}
            />

            <GameModal
                visible={migratedModal}
                type="info"
                title={t.online.premium_category_modal_title}
                message={t.online.premium_migrated_category_note}
                buttonText={t.common.ok}
                onClose={() => setMigratedModal(false)}
            />

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
        backgroundColor: '#FFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3748',
    },
    headerRight: {
        width: 36,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F0F4FF',
        borderRadius: 12,
        padding: 4,
        margin: 16,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontWeight: '600',
        color: '#718096',
        fontSize: 14,
    },
    activeTabText: {
        color: '#5B7FDB',
        fontWeight: '700',
    },
    tabBadge: {
        backgroundColor: '#E53E3E',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
        minWidth: 20,
        alignItems: 'center',
    },
    tabBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    categoryCard: {
        width: CAT_CARD_WIDTH,
        aspectRatio: 1,
        borderRadius: 16,
        padding: 6,
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 34,
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
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 16,
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
        bottom: -18,
        backgroundColor: '#FFF',
        paddingVertical: 4,
        paddingHorizontal: 6,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 10,
        minHeight: 36,
    },
    categoryNameText: {
        fontSize: 11,
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
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    lockedIcon: {
        position: 'absolute',
        top: '20%',
        width: '50%',
        height: '50%',
        zIndex: 10,
        opacity: 0.9,
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
    miniLockedIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        zIndex: 10,
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
        left: 44,
        backgroundColor: '#4299E1',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    doneButton: {
        backgroundColor: '#5B7FDB',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    doneButtonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: 'bold',
    },
});
