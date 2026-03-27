import { useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePurchase } from '../context/PurchaseContext';

const ONLINE_AD_KEY = 'lastOnlineAdSeen';
const AD_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours

export function useOnlineAd() {
    const { isPremium } = usePurchase();
    const showingAdRef = useRef(false);

    const shouldShowAd = useCallback(async (isPremiumRoom?: boolean): Promise<boolean> => {
        if (Platform.OS === 'web') return false;
        if (isPremium) return false;
        if (isPremiumRoom) return false;

        try {
            const lastSeen = await AsyncStorage.getItem(ONLINE_AD_KEY);
            if (lastSeen) {
                const elapsed = Date.now() - parseInt(lastSeen, 10);
                if (elapsed < AD_COOLDOWN_MS) return false;
            }
        } catch {
            return false;
        }

        return true;
    }, [isPremium]);

    const markAdSeen = useCallback(async () => {
        try {
            await AsyncStorage.setItem(ONLINE_AD_KEY, Date.now().toString());
        } catch { /* ignore */ }
    }, []);

    const showInterstitialIfNeeded = useCallback(async (
        isPremiumRoom: boolean | undefined,
        onComplete: () => void,
    ) => {
        const needed = await shouldShowAd(isPremiumRoom);
        if (!needed || Platform.OS === 'web') {
            onComplete();
            return;
        }

        if (showingAdRef.current) {
            onComplete();
            return;
        }

        try {
            const { InterstitialAd, AdEventType, TestIds } = require('react-native-google-mobile-ads');
            const adUnitId = __DEV__
                ? TestIds.INTERSTITIAL
                : Platform.OS === 'ios'
                    ? 'ca-app-pub-4782245353460263/8334790472'
                    : 'ca-app-pub-4782245353460263/7142735566';

            const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
                requestNonPersonalizedAdsOnly: true,
            });

            showingAdRef.current = true;

            const unsubLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
                interstitial.show();
            });

            const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
                cleanup();
                markAdSeen();
                onComplete();
            });

            const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
                cleanup();
                onComplete();
            });

            const cleanup = () => {
                showingAdRef.current = false;
                unsubLoaded();
                unsubClosed();
                unsubError();
            };

            interstitial.load();

            setTimeout(() => {
                if (showingAdRef.current) {
                    cleanup();
                    onComplete();
                }
            }, 8000);
        } catch {
            showingAdRef.current = false;
            onComplete();
        }
    }, [shouldShowAd, markAdSeen]);

    return { shouldShowAd, markAdSeen, showInterstitialIfNeeded };
}
