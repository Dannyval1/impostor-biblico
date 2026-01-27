import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGame } from '../context/GameContext';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { useTranslation } from '../hooks/useTranslation';

type AdScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Ad'>;
};

const adUnitId = __DEV__
    ? TestIds.INTERSTITIAL
    : Platform.OS === 'ios'
        ? 'ca-app-pub-4782245353460263/8334790472'
        : 'ca-app-pub-4782245353460263/7142735566'; // Android

const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
});

export default function AdScreen({ navigation }: AdScreenProps) {
    const { t } = useTranslation();
    const { startGame, resetGamesPlayed } = useGame();
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
            setLoaded(true);
            interstitial.show();
        });

        const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            handleComplete();
        });

        const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (err) => {
            console.log('Ad Error:', err);
            setError('Failed to load ad');
            // If ad fails, we should just let user proceed
            handleComplete();
        });

        // Start loading the ad straight away
        interstitial.load();

        return () => {
            unsubscribeLoaded();
            unsubscribeClosed();
            unsubscribeError();
        };
    }, []);

    const handleComplete = () => {
        if (resetGamesPlayed) {
            resetGamesPlayed();
        }
        startGame();
        navigation.replace('Reveal');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <ActivityIndicator size="large" color="#5B7FDB" />
                <Text style={styles.text}>{t.ads.loading}</Text>
                {error && <Text style={styles.errorText}>{t.ads.wait}</Text>}
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
    },
    errorText: {
        color: '#999',
        fontSize: 14,
        marginTop: 10,
    }
});
