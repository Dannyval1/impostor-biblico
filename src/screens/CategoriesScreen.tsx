import React, { useState, useEffect, useRef } from 'react';
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
import { useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGame } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { Category, CustomCategory, GenericCategory } from '../types';
import { CATEGORY_IMAGES, CATEGORY_COLORS } from '../utils/categoryMetadata';
import { GameModal } from '../components/GameModal';
import { CreateCategoryModal } from '../components/CreateCategoryModal';
import { RewardedCategoryModal } from '../components/RewardedCategoryModal';
import { ExpiredAdUnlockModal } from '../components/ExpiredAdUnlockModal';
import { AdUnlockTimerBadge } from '../components/AdUnlockTimerBadge';
import { usePurchase } from '../context/PurchaseContext';
import { CATEGORIES } from '../data/categories';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAT_CARD_WIDTH = Math.floor((SCREEN_WIDTH - 48) / 3);

type CategoriesScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Categories'>;
};

export default function CategoriesScreen({ navigation }: CategoriesScreenProps) {
    const isFocused = useIsFocused();
    const { t } = useTranslation();
    const {
        state,
        playClick,
        toggleCategory,
        deleteCustomCategory,
        forceRemoveCategory,
    } = useGame();
    const {
        isPremium,
        rewardedUnlock,
        isCategoryUnlockedByAd,
        activateRewardedUnlock,
        clearExpiredUnlock,
    } = usePurchase();

    const [activeTab, setActiveTab] = useState<'biblical' | 'general'>('biblical');
    const [rewardedModalVisible, setRewardedModalVisible] = useState(false);
    const [rewardedModalCategory, setRewardedModalCategory] = useState<{ id: string; label: string } | null>(null);
    const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
    const [expiredCategoryInfo, setExpiredCategoryInfo] = useState<{ id: string; name: string } | null>(null);

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

    const prevRewardedUnlock = useRef(rewardedUnlock);

    useEffect(() => {
        if (prevRewardedUnlock.current && !rewardedUnlock && isFocused) {
            const expired = prevRewardedUnlock.current;
            if (Date.now() >= expired.expiryTimestamp) {
                const expiredCat = CATEGORIES.find(c => c.id === expired.categoryId);
                const label = expiredCat
                    ? (t.setup.categories_list as any)[expired.categoryId] || expiredCat.label
                    : expired.categoryId;
                setExpiredCategoryInfo({ id: expired.categoryId, name: label });
                if (state.settings.selectedCategories.includes(expired.categoryId as any)) {
                    forceRemoveCategory(expired.categoryId as any);
                }
            }
        }
        prevRewardedUnlock.current = rewardedUnlock;
    }, [rewardedUnlock, isFocused]);

    const getExistingUnlockLabel = (): string | null => {
        if (!rewardedUnlock) return null;
        if (Date.now() >= rewardedUnlock.expiryTimestamp) return null;
        const cat = CATEGORIES.find(c => c.id === rewardedUnlock.categoryId);
        return cat
            ? (t.setup.categories_list as any)[rewardedUnlock.categoryId] || cat.label
            : rewardedUnlock.categoryId;
    };

    const handleLockedCategoryPress = (categoryId: string, categoryLabel: string) => {
        playClick();
        setRewardedModalCategory({ id: categoryId, label: categoryLabel });
        setRewardedModalVisible(true);
    };

    const CATEGORIES_BIBLICAL: { id: Category; label: string }[] = [
        { id: 'personajes_biblicos', label: t.setup.categories_list.personajes_biblicos },
        { id: 'libros_biblicos', label: t.setup.categories_list.libros_biblicos },
        { id: 'objetos_biblicos', label: t.setup.categories_list.objetos_biblicos },
        { id: 'oficios_biblicos', label: t.setup.categories_list.oficios_biblicos },
        { id: 'lugares_biblicos', label: t.setup.categories_list.lugares_biblicos },
        { id: 'mujeres_biblicas', label: t.setup.categories_list.mujeres_biblicas },
        { id: 'conceptos_teologicos', label: t.setup.categories_list.conceptos_teologicos },
        { id: 'milagros_biblicos', label: t.setup.categories_list.milagros_biblicos },
        { id: 'parabolas_jesus', label: t.setup.categories_list.parabolas_jesus },
    ];

    const CATEGORIES_GENERAL: { id: GenericCategory; label: string }[] = [
        { id: 'acciones', label: t.setup.categories_list.acciones },
        { id: 'objetos', label: t.setup.categories_list.objetos },
        { id: 'deportes', label: t.setup.categories_list.deportes },
        { id: 'animales', label: t.setup.categories_list.animales },
        { id: 'comida', label: t.setup.categories_list.comida },
        { id: 'profesiones', label: t.setup.categories_list.profesiones },
        { id: 'herramientas', label: t.setup.categories_list.herramientas },
        { id: 'marcas', label: t.setup.categories_list.marcas },
        { id: 'famosos', label: t.setup.categories_list.famosos },
    ];

    const biblicalSelectedCount =
        CATEGORIES_BIBLICAL.filter(c => state.settings.selectedCategories.includes(c.id)).length +
        state.customCategories.filter(c => state.settings.selectedCategories.includes(c.id) && (c.type === 'biblical' || !c.type)).length;

    const genericSelectedCount =
        CATEGORIES_GENERAL.filter(c => state.settings.selectedCategories.includes(c.id)).length +
        state.customCategories.filter(c => state.settings.selectedCategories.includes(c.id) && c.type === 'general').length;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => { playClick(); navigation.goBack(); }}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.setup.categories}</Text>
                <View style={styles.headerRight} />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'biblical' && styles.tabButtonActive]}
                    onPress={() => { playClick(); setActiveTab('biblical'); }}
                >
                    <Text style={[styles.tabText, activeTab === 'biblical' && styles.tabTextActive]}>
                        {t.setup.biblical_tab}
                    </Text>
                    <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{biblicalSelectedCount}</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'general' && styles.tabButtonActive]}
                    onPress={() => { playClick(); setActiveTab('general'); }}
                >
                    <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>
                        {t.setup.general_tab}
                    </Text>
                    <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{genericSelectedCount}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.grid}>
                {activeTab === 'biblical' ? (
                    <>
                        {CATEGORIES_BIBLICAL.map((category) => {
                            const isSelected = state.settings.selectedCategories.includes(category.id);
                            const isPremiumCategory = ['oficios_biblicos', 'lugares_biblicos', 'conceptos_teologicos', 'mujeres_biblicas', 'milagros_biblicos', 'parabolas_jesus'].includes(category.id);
                            const isLocked = isPremiumCategory && !state.isPremium && !isCategoryUnlockedByAd(category.id);
                            return (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[styles.categoryCard, { backgroundColor: isLocked ? '#E2E8F0' : CATEGORY_COLORS[category.id] }, isSelected && styles.categoryCardSelected]}
                                    onPress={() => {
                                        if (isLocked) {
                                            handleLockedCategoryPress(category.id, t.setup.categories_list[category.id as keyof typeof t.setup.categories_list] || category.id);
                                            return;
                                        }
                                        playClick();
                                        toggleCategory(category.id);
                                    }}
                                    activeOpacity={isLocked ? 1 : 0.8}
                                >
                                    <Image source={CATEGORY_IMAGES[category.id]} style={[styles.categoryImage, isLocked && { opacity: 0.3 }]} resizeMode="contain" />
                                    {(!isSelected || isLocked) && <View style={styles.inactiveOverlay} />}
                                    <View style={styles.categoryNamePill}>
                                        <Text style={styles.categoryNameText} numberOfLines={2}>
                                            {t.setup.categories_list[category.id as keyof typeof t.setup.categories_list] || category.label}
                                        </Text>
                                    </View>
                                    {isSelected && <View style={styles.categoryCheckBadge}><Ionicons name="checkmark" size={12} color="#FFF" /></View>}
                                    {isLocked && <Image source={require('../../assets/blocked_level_1.png')} style={styles.lockedIcon} resizeMode="contain" />}
                                    {isPremiumCategory && !state.isPremium && isCategoryUnlockedByAd(category.id) && <AdUnlockTimerBadge categoryId={category.id} />}
                                </TouchableOpacity>
                            );
                        })}
                        {state.customCategories.filter(c => c.type === 'biblical' || !c.type).map((category) => {
                            const isSelected = state.settings.selectedCategories.includes(category.id);
                            return (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[styles.categoryCard, { backgroundColor: '#A0AEC0' }, isSelected && styles.categoryCardSelected]}
                                    onPress={() => { playClick(); toggleCategory(category.id as any); }}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.customIconContainer}><Text style={styles.customIconText}>{category.name.charAt(0).toUpperCase()}</Text></View>
                                    {!isSelected && <View style={styles.inactiveOverlay} />}
                                    <View style={styles.categoryNamePill}><Text style={styles.categoryNameText} numberOfLines={2}>{category.name} ({category.words.length})</Text></View>
                                    {isSelected && <View style={styles.categoryCheckBadge}><Ionicons name="checkmark" size={12} color="#FFF" /></View>}
                                    <TouchableOpacity style={styles.deleteCategoryButton} onPress={() => { playClick(); showGameModal(t.custom_category.delete_title, t.custom_category.delete_confirm.replace('%{name}', category.name), 'danger', t.custom_category.delete_button, () => deleteCustomCategory(category.id)); }}>
                                        <Ionicons name="trash-outline" size={16} color="#FFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.editCategoryButton} onPress={() => { playClick(); setEditingCategory(category); setShowCreateCategoryModal(true); }}>
                                        <Ionicons name="pencil" size={16} color="#FFF" />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity
                            style={[styles.categoryCard, styles.addCategoryCard]}
                            onPress={() => {
                                playClick();
                                if (!state.isPremium && state.customCategories.length >= 1) {
                                    navigation.navigate('Paywall');
                                    return;
                                }
                                setShowCreateCategoryModal(true);
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={36} color="#CBD5E0" />
                            <Text style={styles.addCategoryText}>{t.setup.add}</Text>
                            {!state.isPremium && state.customCategories.length >= 1 && (
                                <Image source={require('../../assets/blocked_level_1.png')} style={styles.miniLockedIcon} resizeMode="contain" />
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        {CATEGORIES_GENERAL.map((category) => {
                            const isSelected = state.settings.selectedCategories.includes(category.id);
                            const isPremiumCategory = !['acciones', 'objetos', 'deportes'].includes(category.id);
                            const isLocked = isPremiumCategory && !state.isPremium && !isCategoryUnlockedByAd(category.id);
                            return (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[styles.categoryCard, { backgroundColor: isLocked ? '#E2E8F0' : CATEGORY_COLORS[category.id] }, isSelected && styles.categoryCardSelected]}
                                    onPress={() => {
                                        if (isLocked) {
                                            handleLockedCategoryPress(category.id, t.setup.categories_list[category.id as keyof typeof t.setup.categories_list] || category.id);
                                            return;
                                        }
                                        playClick();
                                        toggleCategory(category.id);
                                    }}
                                    activeOpacity={isLocked ? 1 : 0.8}
                                >
                                    <Image source={CATEGORY_IMAGES[category.id]} style={[styles.categoryImage, isLocked && { opacity: 0.3 }]} resizeMode="contain" />
                                    {(!isSelected || isLocked) && <View style={styles.inactiveOverlay} />}
                                    <View style={styles.categoryNamePill}><Text style={styles.categoryNameText} numberOfLines={2}>{t.setup.categories_list[category.id as keyof typeof t.setup.categories_list] || category.label}</Text></View>
                                    {isSelected && <View style={styles.categoryCheckBadge}><Ionicons name="checkmark" size={12} color="#FFF" /></View>}
                                    {isLocked && <Image source={require('../../assets/blocked_level_1.png')} style={styles.lockedIcon} resizeMode="contain" />}
                                    {isPremiumCategory && !state.isPremium && isCategoryUnlockedByAd(category.id) && <AdUnlockTimerBadge categoryId={category.id} />}
                                </TouchableOpacity>
                            );
                        })}
                        {state.customCategories.filter(c => c.type === 'general').map((category) => {
                            const isSelected = state.settings.selectedCategories.includes(category.id);
                            return (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[styles.categoryCard, { backgroundColor: '#A0AEC0' }, isSelected && styles.categoryCardSelected]}
                                    onPress={() => { playClick(); toggleCategory(category.id as any); }}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.customIconContainer}><Text style={styles.customIconText}>{category.name.charAt(0).toUpperCase()}</Text></View>
                                    {!isSelected && <View style={styles.inactiveOverlay} />}
                                    <View style={styles.categoryNamePill}><Text style={styles.categoryNameText} numberOfLines={2}>{category.name} ({category.words.length})</Text></View>
                                    {isSelected && <View style={styles.categoryCheckBadge}><Ionicons name="checkmark" size={12} color="#FFF" /></View>}
                                    <TouchableOpacity style={styles.deleteCategoryButton} onPress={() => { playClick(); showGameModal(t.custom_category.delete_title, t.custom_category.delete_confirm.replace('%{name}', category.name), 'danger', t.custom_category.delete_button, () => deleteCustomCategory(category.id)); }}>
                                        <Ionicons name="trash-outline" size={16} color="#FFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.editCategoryButton} onPress={() => { playClick(); setEditingCategory(category); setShowCreateCategoryModal(true); }}>
                                        <Ionicons name="pencil" size={16} color="#FFF" />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity
                            style={[styles.categoryCard, styles.addCategoryCard]}
                            onPress={() => {
                                playClick();
                                if (!state.isPremium) {
                                    navigation.navigate('Paywall');
                                    return;
                                }
                                setShowCreateCategoryModal(true);
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={36} color={!state.isPremium ? '#A0AEC0' : '#CBD5E0'} />
                            <Text style={styles.addCategoryText}>{t.setup.add}</Text>
                            {!state.isPremium && <Image source={require('../../assets/blocked_level_1.png')} style={styles.miniLockedIcon} resizeMode="contain" />}
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            <CreateCategoryModal
                visible={showCreateCategoryModal}
                onClose={() => {
                    setShowCreateCategoryModal(false);
                    setEditingCategory(null);
                }}
                initialCategory={editingCategory}
                categoryType={activeTab}
            />

            {rewardedModalCategory && (
                <RewardedCategoryModal
                    visible={rewardedModalVisible}
                    categoryId={rewardedModalCategory.id}
                    categoryLabel={rewardedModalCategory.label}
                    existingUnlockCategoryLabel={
                        rewardedUnlock && rewardedModalCategory && rewardedUnlock.categoryId !== rewardedModalCategory.id
                            ? getExistingUnlockLabel()
                            : null
                    }
                    onUnlockGranted={async () => {
                        if (rewardedModalCategory) {
                            await activateRewardedUnlock(rewardedModalCategory.id);
                            if (!state.settings.selectedCategories.includes(rewardedModalCategory.id as any)) {
                                toggleCategory(rewardedModalCategory.id as any);
                            }
                        }
                        setRewardedModalVisible(false);
                    }}
                    onBuyPremium={() => {
                        setRewardedModalVisible(false);
                        navigation.navigate('Paywall');
                    }}
                    onClose={() => setRewardedModalVisible(false)}
                />
            )}

            {expiredCategoryInfo && (
                <ExpiredAdUnlockModal
                    visible={!!expiredCategoryInfo}
                    categoryName={expiredCategoryInfo.name}
                    onClose={() => setExpiredCategoryInfo(null)}
                    onBuyPremium={() => {
                        setExpiredCategoryInfo(null);
                        navigation.navigate('Paywall');
                    }}
                />
            )}

            <GameModal
                visible={modalVisible}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                buttonText={modalConfig.buttonText}
                onClose={modalConfig.onClose}
            />

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => { playClick(); navigation.goBack(); }}
                    activeOpacity={0.8}
                >
                    <Text style={styles.doneButtonText}>{t.common.done}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
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
        backgroundColor: '#E2E8F0',
        borderRadius: 12,
        padding: 4,
        marginHorizontal: 16,
        marginBottom: 16,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    tabButtonActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#718096',
    },
    tabTextActive: {
        color: '#2D3748',
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
        left: 44,
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
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        backgroundColor: '#F5F5F5',
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
