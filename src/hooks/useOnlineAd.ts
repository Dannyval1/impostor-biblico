import { useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { usePurchase } from '../context/PurchaseContext';

export function useOnlineAd() {
    const { isPremium } = usePurchase();
    const showingAdRef = useRef(false);

    const shouldShowAd = useCallback(async (isPremiumRoom?: boolean): Promise<boolean> => {
        if (Platform.OS === 'web') return false;
        if (isPremium) return false;
        if (isPremiumRoom) return false;
        return true;
    }, [isPremium]);

    const markAdSeen = useCallback(async () => {
        // Online interstitials are intentionally per-entry; no cooldown is persisted.
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
            let cleanedUp = false;
            let timeoutId: ReturnType<typeof setTimeout> | null = null;

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
                if (cleanedUp) return;
                cleanedUp = true;
                showingAdRef.current = false;
                if (timeoutId) clearTimeout(timeoutId);
                unsubLoaded();
                unsubClosed();
                unsubError();
            };

            interstitial.load();

            timeoutId = setTimeout(() => {
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
