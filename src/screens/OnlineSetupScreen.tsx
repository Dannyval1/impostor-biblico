import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useGame } from '../context/GameContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { OnlineRoomPlaceholder } from '../components/OnlineRoomPlaceholder';

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
    const { gameState, updateSettings, startGame, settingsDraft, updateSettingsDraft } = useOnlineGame();
    const { state: globalState } = useGame();

    // Read settings from the persistent draft in context (survives back-navigation)
    const impostorCount = settingsDraft?.impostorCount ?? 1;
    const gameDuration = settingsDraft?.gameDuration ?? null;
    const selectedCategories = settingsDraft?.categories ?? ['personajes_biblicos'];
    const impostorHint = settingsDraft?.impostorHint ?? false;
    const discussionMode = settingsDraft?.discussionMode ?? 'turns';
    const clueDuration = settingsDraft?.clueDuration ?? 30;

    useEffect(() => {
        if (!gameState.roomCode) return;
        const status = gameState.room?.status;
        if (!status || status === 'waiting' || status === 'ready_check') return;

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
    }, [gameState.roomCode, gameState.room?.status, navigation]);

    const handleSaveAndStart = async () => {
        if (selectedCategories.length === 0) {
            Alert.alert(t.common.error, t.setup.category_required_alert);
            return;
        }
        const draftCustomDefs = settingsDraft?.customCategories || [];
        const hasPlayableCategory = selectedCategories.some(cat => {
            const def = draftCustomDefs.find(c => c.id === cat);
            return def ? def.words.length > 0 : true; // standard categories are always playable
        });
        if (!hasPlayableCategory) {
            Alert.alert(t.common.error, t.setup.category_required_alert);
            return;
        }

        try {
            const customDefsToSave = draftCustomDefs.filter(c => selectedCategories.includes(c.id as any));
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
            await startGame(settingsPayload);
        } catch (error) {
            console.error('Failed to update settings and start', error);
        }
    };

    if (!gameState.room) {
        return <OnlineRoomPlaceholder />;
    }

    const playerCount = Object.keys(gameState.room.players).length;
    const maxImpostors = Math.max(1, Math.min(2, Math.floor(playerCount / 2)));

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
                            onPress={() => updateSettingsDraft({ impostorCount: Math.max(1, impostorCount - 1) })}
                            disabled={impostorCount <= 1}
                        >
                            <Text style={styles.impostorControlButtonText}>-</Text>
                        </TouchableOpacity>

                        <View style={styles.impostorCountDisplay}>
                            <Text style={styles.impostorCountText}>{impostorCount}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.impostorControlButton, impostorCount >= maxImpostors && styles.impostorControlButtonDisabled]}
                            onPress={() => updateSettingsDraft({ impostorCount: Math.min(maxImpostors, impostorCount + 1) })}
                            disabled={impostorCount >= maxImpostors}
                        >
                            <Text style={styles.impostorControlButtonText}>+</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.impostorHint}>
                        {(t.setup as any).max_impostors || `Máximo ${maxImpostors} impostores`}
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
                            onValueChange={v => updateSettingsDraft({ impostorHint: v })}
                            trackColor={{ false: '#CBD5E0', true: '#48BB78' }}
                            thumbColor="#FFF"
                        />
                    </View>
                </View>


                {/* Discussion Mode */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t.online.discussion_mode}</Text>
                    <TouchableOpacity
                        style={[styles.modeOptionCard, discussionMode === 'turns' && styles.modeOptionCardSelected]}
                        onPress={() => updateSettingsDraft({ discussionMode: 'turns', clueDuration: 30 })}
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
                        onPress={() => updateSettingsDraft({ discussionMode: 'simultaneous', clueDuration: 60 })}
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
                    <TouchableOpacity
                        style={styles.categoriesRow}
                        onPress={() => navigation.navigate('OnlineCategories')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t.setup.categories}</Text>
                        <View style={styles.categoriesTriggerRight}>
                            {selectedCategories.length > 0 && (
                                <View style={styles.categoriesCountBadge}>
                                    <Text style={styles.categoriesCountText}>{selectedCategories.length}</Text>
                                </View>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#666" />
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.footer}>
                {(() => {
                    const connectedPlayers = gameState.room
                        ? Object.values(gameState.room.players).filter(p => p.isConnected !== false)
                        : [];
                    const readyPlayers = connectedPlayers.filter(p => (p.joinState || 'ready') === 'ready');
                    const hasCategories = selectedCategories.length > 0;
                    const allReady = readyPlayers.length === connectedPlayers.length;
                    const canStart = connectedPlayers.length >= 3 && hasCategories && allReady;
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
                                    {t.online.need_three_players_progress.replace(
                                        '{current}',
                                        String(connectedPlayers.length)
                                    )}
                                </Text>
                            )}
                            {hasCategories && connectedPlayers.length >= 3 && !allReady && (
                                <Text style={styles.minPlayersWarning}>
                                    {t.online.lobby_waiting_ready_hint}
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
    categoriesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F7FAFF',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
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
