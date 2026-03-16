import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGame } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';

type AdScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Ad'>;
};

export default function AdScreen({ navigation }: AdScreenProps) {
    const { t } = useTranslation();
    const { startGame, resetGamesPlayed } = useGame();

    useEffect(() => {
        // Ads are disabled on the web. Instantly proceed.
        const timer = setTimeout(() => {
            if (resetGamesPlayed) {
                resetGamesPlayed();
            }
            startGame();
            navigation.replace('Reveal');
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <ActivityIndicator size="large" color="#5B7FDB" />
                <Text style={styles.text}>{t.ads.loading}</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        gap: 20,
    },
    text: {
        marginTop: 20,
        fontSize: 18,
        color: '#666',
    }
});
