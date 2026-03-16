import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Platform, Alert, AppState } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import {
    saveRewardedUnlock,
    loadRewardedUnlock,
    clearRewardedUnlock,
    RewardedUnlock,
    loadRewardedHistory,
    saveRewardedHistory,
    RewardedUnlockHistory,
} from '../utils/storage';

const API_KEYS = {
    apple: 'appl_VEjFXaIepMokwHVqxdPTdpHalko',
    google: 'goog_BXcFKYvqJnBsFkSfNodPqFwQgEz'
};

// 3 hours unlock duration
const UNLOCK_DURATION_MS = 3 * 60 * 60 * 1000;
// 24 hours cooldown
const COOLDOWN_DURATION_MS = 24 * 60 * 60 * 1000;
/** Maximum ad unlocks allowed per category before the user must purchase */
const MAX_AD_UNLOCKS = 2;
/** Maximum number of DISTINCT premium categories a user can trial with ads */
const MAX_AD_CATEGORIES = 2;

// ─── Cooldown status for a single category ──────────────────────────────────
export type AdUnlockStatus =
    | 'available'       // can watch ad right now
    | 'active'          // currently unlocked and timer running
    | 'cooldown'        // unlocked before; must wait before watching again
    | 'maxed'           // used all ad unlocks for THIS category — only paywall
    | 'global_maxed'    // already trialed MAX_AD_CATEGORIES categories — only paywall
    | 'premium';        // user is paid premium, no restriction

interface PurchaseContextType {
    isPremium: boolean;
    packages: PurchasesPackage[];
    purchasePackage: (pack: PurchasesPackage) => Promise<void>;
    restorePurchases: () => Promise<void>;
    isLoading: boolean;
    hasShownInitialPaywall: boolean;
    setHasShownInitialPaywall: (shown: boolean) => void;
    // Rewarded unlock
    rewardedUnlock: RewardedUnlock | null;
    rewardedHistory: RewardedUnlockHistory;
    isCategoryUnlockedByAd: (categoryId: string) => boolean;
    getAdUnlockStatus: (categoryId: string) => AdUnlockStatus;
    getCooldownRemaining: (categoryId: string) => number; // ms remaining in cooldown
    activateRewardedUnlock: (categoryId: string) => Promise<void>;
    clearExpiredUnlock: () => void;
}

const PurchaseContext = createContext<PurchaseContextType | null>(null);

// ⚠️ TESTING ONLY — set to false before publishing!
const DEV_FORCE_PREMIUM = false;

export function PurchaseProvider({ children }: { children: ReactNode }) {
    const [isPremium, setIsPremium] = useState(DEV_FORCE_PREMIUM);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasShownInitialPaywall, setHasShownInitialPaywall] = useState(false);
    const [rewardedUnlock, setRewardedUnlock] = useState<RewardedUnlock | null>(null);
    const [rewardedHistory, setRewardedHistory] = useState<RewardedUnlockHistory>({});

    // ── Load persisted state on mount ────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            // Load active unlock
            const saved = await loadRewardedUnlock();
            if (saved && Date.now() < saved.expiryTimestamp) {
                setRewardedUnlock(saved);
            } else if (saved) {
                await clearRewardedUnlock();
            }
            // Load history
            const history = await loadRewardedHistory();
            setRewardedHistory(history);
        };
        init();
    }, []);

    // ── Auto-expire: Use precise timeout & AppState ────────
    useEffect(() => {
        if (!rewardedUnlock) return;

        let timeoutId: NodeJS.Timeout;

        const checkExpiration = async () => {
            if (Date.now() >= rewardedUnlock.expiryTimestamp) {
                // Unlock expired → record cooldown in history
                const history = await loadRewardedHistory();
                const record = history[rewardedUnlock.categoryId] ?? { count: 0, cooldownUntil: 0 };
                history[rewardedUnlock.categoryId] = {
                    count: record.count,
                    cooldownUntil: Date.now() + COOLDOWN_DURATION_MS,
                };
                await saveRewardedHistory(history);
                setRewardedHistory({ ...history });
                await clearRewardedUnlock();
                setRewardedUnlock(null);
            } else {
                // Not expired yet, schedule exactly when it will expire
                const timeRemaining = rewardedUnlock.expiryTimestamp - Date.now();
                timeoutId = setTimeout(checkExpiration, timeRemaining);
            }
        };

        // Check immediately or schedule
        checkExpiration();

        // Also check whenever the app comes back to the foreground
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                checkExpiration();
            }
        });

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            subscription.remove();
        };
    }, [rewardedUnlock]);

    // ── RevenueCat ────────────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                if (Platform.OS === 'ios') {
                    await Purchases.configure({ apiKey: API_KEYS.apple });
                } else if (Platform.OS === 'android') {
                    await Purchases.configure({ apiKey: API_KEYS.google });
                }
                const info = await Purchases.getCustomerInfo();
                checkPremiumStatus(info);
                await loadOfferings();
            } catch (e) {
                console.log('Error initializing RevenueCat:', e);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const loadOfferings = async () => {
        try {
            const offerings = await Purchases.getOfferings();
            if (offerings.current && offerings.current.availablePackages.length !== 0) {
                setPackages(offerings.current.availablePackages);
            }
        } catch (e) {
            console.log('Error loading offerings:', e);
        }
    };

    const checkPremiumStatus = (customerInfo: CustomerInfo) => {
        setIsPremium(!!customerInfo.entitlements.active['premium']);
    };

    const purchasePackage = async (pack: PurchasesPackage) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pack);
            checkPremiumStatus(customerInfo);
        } catch (e: any) {
            if (!e.userCancelled) Alert.alert('Error', e.message);
            throw e;
        }
    };

    const restorePurchases = async () => {
        try {
            const customerInfo = await Purchases.restorePurchases();
            checkPremiumStatus(customerInfo);
            if (customerInfo.entitlements.active['premium']) {
                Alert.alert('Success', 'Purchases restored successfully!');
            } else {
                Alert.alert('Info', 'No active purchases found to restore.');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    // ── Rewarded unlock helpers ───────────────────────────────────────────────

    /**
     * Returns the current ad-unlock status for a category.
     * Used by the UI to decide what to show (watch-ad / cooldown / paywall).
     */
    const getAdUnlockStatus = useCallback((categoryId: string): AdUnlockStatus => {
        if (isPremium) return 'premium';

        // Is it currently active?
        if (rewardedUnlock?.categoryId === categoryId && Date.now() < rewardedUnlock.expiryTimestamp) {
            return 'active';
        }

        const record = rewardedHistory[categoryId];
        const hasBeenUnlockedBefore = record && record.count > 0;

        // ── Per-category logic (for categories already in the user's trial slots) ──
        if (hasBeenUnlockedBefore) {
            // Per-category maxed out → only paywall
            if (record.count >= MAX_AD_UNLOCKS) return 'maxed';
            // In cooldown window
            if (Date.now() < record.cooldownUntil) return 'cooldown';
            // Cooldown passed, can unlock again
            return 'available';
        }

        // ── Brand-new category: check global category cap ──────────────────────
        // Count how many distinct categories the user has already trialed
        const trialedCategoryCount = Object.values(rewardedHistory).filter(
            (r) => r.count > 0
        ).length;

        if (trialedCategoryCount >= MAX_AD_CATEGORIES) {
            // User has used up all their free category trials
            return 'global_maxed';
        }

        // Brand new category within the global cap → available
        return 'available';
    }, [isPremium, rewardedUnlock, rewardedHistory]);

    /** Returns ms remaining in the cooldown (0 if not in cooldown). */
    const getCooldownRemaining = useCallback((categoryId: string): number => {
        const record = rewardedHistory[categoryId];
        if (!record) return 0;
        return Math.max(0, record.cooldownUntil - Date.now());
    }, [rewardedHistory]);

    /**
     * Call this after a rewarded ad is watched successfully.
     * Increments the history count and starts the active unlock window.
     */
    const activateRewardedUnlock = useCallback(async (categoryId: string) => {
        const expiryTimestamp = Date.now() + UNLOCK_DURATION_MS;

        // Update history: increment count, clear cooldown
        const history = await loadRewardedHistory();
        const record = history[categoryId] ?? { count: 0, cooldownUntil: 0 };
        history[categoryId] = {
            count: record.count + 1,
            cooldownUntil: 0, // will be set when the active period expires
        };
        await saveRewardedHistory(history);
        setRewardedHistory({ ...history });

        // Save & apply active unlock
        const unlock: RewardedUnlock = { categoryId, expiryTimestamp };
        await saveRewardedUnlock(unlock);
        setRewardedUnlock(unlock);
    }, []);

    /** Returns true if the given category is currently within its active unlock window. */
    const isCategoryUnlockedByAd = useCallback((categoryId: string): boolean => {
        if (!rewardedUnlock) return false;
        if (rewardedUnlock.categoryId !== categoryId) return false;
        return Date.now() < rewardedUnlock.expiryTimestamp;
    }, [rewardedUnlock]);

    /** Clear an expired unlock (called from SetupScreen when the expiry modal is shown). */
    const clearExpiredUnlock = useCallback(async () => {
        if (rewardedUnlock) {
            // Record cooldown in history
            const history = await loadRewardedHistory();
            const record = history[rewardedUnlock.categoryId] ?? { count: 1, cooldownUntil: 0 };
            history[rewardedUnlock.categoryId] = {
                count: record.count,
                cooldownUntil: Date.now() + COOLDOWN_DURATION_MS,
            };
            await saveRewardedHistory(history);
            setRewardedHistory({ ...history });
        }
        await clearRewardedUnlock();
        setRewardedUnlock(null);
    }, [rewardedUnlock]);

    return (
        <PurchaseContext.Provider value={{
            isPremium,
            packages,
            purchasePackage,
            restorePurchases,
            isLoading,
            hasShownInitialPaywall,
            setHasShownInitialPaywall,
            rewardedUnlock,
            rewardedHistory,
            isCategoryUnlockedByAd,
            getAdUnlockStatus,
            getCooldownRemaining,
            activateRewardedUnlock,
            clearExpiredUnlock,
        }}>
            {children}
        </PurchaseContext.Provider>
    );
}

export function usePurchase() {
    const context = useContext(PurchaseContext);
    if (!context) throw new Error('usePurchase must be used within PurchaseProvider');
    return context;
}
