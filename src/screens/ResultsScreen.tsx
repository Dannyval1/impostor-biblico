import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { ScaleButton } from '../components/ScaleButton';
import { useGame } from '../context/GameContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Results'>;

export default function ResultsScreen() {
    const { t } = useTranslation();
    const { nextRound, resetGame, playClick } = useGame();
    const navigation = useNavigation<NavigationProp>();

    const handleNextRound = () => {
        playClick();
        nextRound();
        navigation.reset({
            index: 0,
            routes: [{ name: 'Setup' }],
        });
    };

    const handleExit = () => {
        playClick();
        resetGame();
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t.voting.game_over || 'Game Over'}</Text>

            <View style={styles.buttonContainer}>
                <ScaleButton onPress={handleNextRound} style={[styles.button, styles.primaryButton]}>
                    <Text style={styles.buttonText}>{t.common.play_again || 'Play Again'}</Text>
                </ScaleButton>

                <ScaleButton onPress={handleExit} style={[styles.button, styles.secondaryButton]}>
                    <Text style={[styles.buttonText, styles.secondaryButtonText]}>{t.common.exit || 'Exit'}</Text>
                </ScaleButton>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 40,
    },
    buttonContainer: {
        width: '100%',
        gap: 16,
    },
    button: {
        width: '100%',
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: '#6C63FF',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#6C63FF',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    secondaryButtonText: {
        color: '#6C63FF',
    },
});