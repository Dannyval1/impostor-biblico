import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGame } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';
import { Player } from '../types';

type RevealScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Reveal'>;
};

export default function RevealScreen({ navigation }: RevealScreenProps) {
    const { t } = useTranslation();
    const { state, markPlayerSeenWord, loadNewWord, playClick } = useGame();
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);

    const players = state.settings.players;
    const currentPlayer = players[currentPlayerIndex];
    const isImpostor = currentPlayer?.role === 'impostor';

    const playersWhoSaw = players.filter((p: Player) => p.hasSeenWord).length;

    const handleReveal = () => {
        playClick();
        setIsRevealed(true);
    };

    const handleNext = () => {
        playClick();
        markPlayerSeenWord(currentPlayer.id);

        if (currentPlayerIndex === players.length - 1) {
            navigation.replace('Voting');
        } else {
            setCurrentPlayerIndex(currentPlayerIndex + 1);
            setIsRevealed(false);
        }
    };

    if (!currentPlayer) {
        return (
            <SafeAreaView style={styles.container}>
                <Text>Error</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.roundText}>{t.reveal.round} {state.roundNumber}</Text>
                    <Text style={styles.progressText}>
                        {playersWhoSaw}/{players.length} {t.reveal.players}
                    </Text>
                </View>

                <View style={styles.mainContent}>
                    {!isRevealed ? (
                        <>
                            <Text style={styles.playerName}>{t.reveal.player}:</Text>
                            <Text style={styles.playerNameBig}>{currentPlayer.name}</Text>

                            <View style={styles.warningBox}>
                                <Text style={styles.warningIcon}>⚠️</Text>
                                <Text style={styles.warningText}>
                                    {t.reveal.warning_title}{'\n'}{t.reveal.warning_subtitle}
                                </Text>
                            </View>

                            <Text style={styles.instructionText}>
                                {t.reveal.tap_to_see}
                            </Text>

                            <TouchableOpacity
                                style={styles.revealButton}
                                onPress={handleReveal}
                            >
                                <Text style={styles.revealButtonIcon}>👁️</Text>
                                <Text style={styles.revealButtonText}>{t.reveal.show_word}</Text>
                            </TouchableOpacity>

                            <Text style={styles.footerText}>
                                {currentPlayerIndex + 1} de {players.length}
                            </Text>
                        </>
                    ) : (
                        <>
                            {isImpostor ? (
                                <View style={styles.impostorContainer}>
                                    <Text style={styles.impostorIcon}>🎭</Text>
                                    <Text style={styles.impostorTitle}>{t.reveal.shout_is}</Text>
                                    <Text style={styles.impostorTitleBig}>{t.reveal.shout_impostor}</Text>

                                    <View style={styles.impostorInfoBox}>
                                        <Text style={styles.impostorInfoText}>
                                            {t.reveal.impostor_secret}
                                        </Text>
                                        <Text style={styles.impostorInfoSubtext}>
                                            {t.reveal.impostor_strategy}
                                        </Text>

                                        {state.settings.impostorCount > 1 && (
                                            <View style={styles.teamInfoBox}>
                                                <Text style={styles.teamInfoText}>
                                                    🤝 {t.reveal.impostor_team.replace('%{count}', state.settings.impostorCount.toString())}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.wordContainer}>
                                    <Text style={styles.wordLabel}>{t.reveal.your_word}</Text>

                                    <View style={styles.wordBox}>
                                        <Text style={styles.wordIcon}>🎯</Text>
                                        <Text style={styles.word}>{state.currentWord?.word}</Text>
                                    </View>

                                    {state.currentWord?.hint && (
                                        <View style={styles.hintBox}>
                                            <Text style={styles.hintLabel}>{t.reveal.hint}:</Text>
                                            <Text style={styles.hintText}>{state.currentWord.hint}</Text>
                                        </View>
                                    )}

                                    <View style={styles.categoryBox}>
                                        <Text style={styles.categoryText}>
                                            📚 {t.setup.categories_list[(state.currentWord?.category || '') as keyof typeof t.setup.categories_list]}
                                        </Text>
                                    </View>

                                    <View style={styles.reminderBox}>
                                        <Text style={styles.reminderText}>
                                            ⚠️ {t.reveal.memorize}
                                        </Text>
                                        {state.settings.impostorCount > 1 && (
                                            <Text style={styles.reminderSubtext}>
                                                {t.reveal.watch_out.replace('%{count}', state.settings.impostorCount.toString())}
                                            </Text>
                                        )}
                                    </View>

                                    {currentPlayerIndex === 0 && (
                                        <TouchableOpacity
                                            style={styles.changeWordButton}
                                            onPress={() => {
                                                loadNewWord();
                                            }}
                                        >
                                            <Text style={styles.changeWordButtonText}>🔄 {t.reveal.change_word}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={handleNext}
                            >
                                <Text style={styles.nextButtonText}>
                                    {currentPlayerIndex === players.length - 1
                                        ? t.reveal.start_game
                                        : `${t.reveal.next_player} →`}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    content: {
        flexGrow: 1,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    roundText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    progressText: {
        fontSize: 14,
        color: '#999',
    },
    mainContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ANTES DE REVELAR
    playerName: {
        fontSize: 18,
        color: '#666',
        marginBottom: 8,
    },
    playerNameBig: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 30,
    },
    warningBox: {
        backgroundColor: '#FFF3CD',
        borderWidth: 2,
        borderColor: '#FFC107',
        borderRadius: 12,
        padding: 20,
        marginBottom: 30,
        alignItems: 'center',
        width: '100%',
    },
    warningIcon: {
        fontSize: 40,
        marginBottom: 10,
    },
    warningText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#856404',
        textAlign: 'center',
        lineHeight: 24,
    },
    instructionText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    revealButton: {
        backgroundColor: '#5B7FDB',
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 20,
        minWidth: 250,
    },
    revealButtonIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    revealButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footerText: {
        fontSize: 14,
        color: '#999',
    },

    impostorContainer: {
        alignItems: 'center',
        width: '100%',
    },
    impostorIcon: {
        fontSize: 80,
        marginBottom: 20,
    },
    impostorTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    impostorTitleBig: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#E53E3E',
        marginBottom: 30,
    },
    impostorInfoBox: {
        backgroundColor: '#FEE',
        borderWidth: 2,
        borderColor: '#E53E3E',
        borderRadius: 12,
        padding: 20,
        marginBottom: 30,
        width: '100%',
    },
    impostorInfoText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#E53E3E',
        marginBottom: 12,
        textAlign: 'center',
    },
    impostorInfoSubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    teamInfoBox: {
        backgroundColor: '#FFDEDE',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
    },
    teamInfoText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#C92A2A',
        textAlign: 'center',
    },

    wordContainer: {
        alignItems: 'center',
        width: '100%',
    },
    wordLabel: {
        fontSize: 18,
        color: '#666',
        marginBottom: 16,
    },
    wordBox: {
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: '#5B7FDB',
        borderRadius: 16,
        padding: 30,
        marginBottom: 20,
        alignItems: 'center',
        width: '100%',
    },
    wordIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    word: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    hintBox: {
        backgroundColor: '#F0F4FF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        width: '100%',
    },
    hintLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5B7FDB',
        marginBottom: 4,
    },
    hintText: {
        fontSize: 16,
        color: '#333',
    },
    categoryBox: {
        backgroundColor: '#FFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 20,
    },
    categoryText: {
        fontSize: 14,
        color: '#666',
    },
    reminderBox: {
        backgroundColor: '#FFF3CD',
        borderRadius: 12,
        padding: 12,
        marginBottom: 30,
    },
    reminderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#856404',
        textAlign: 'center',
    },
    reminderSubtext: {
        fontSize: 12,
        color: '#856404',
        textAlign: 'center',
        marginTop: 4,
    },

    nextButton: {
        backgroundColor: '#5B7FDB',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 12,
        minWidth: 250,
        alignItems: 'center',
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    changeWordButton: {
        marginTop: 10,
        marginBottom: 20,
        padding: 10,
    },
    changeWordButtonText: {
        color: '#5B7FDB',
        fontSize: 16,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
});