import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomCategory } from '../types';

const CUSTOM_CATEGORIES_KEY = '@impostor_custom_categories';
const GAMES_PLAYED_KEY = '@impostor_games_played';
const REWARDED_UNLOCK_KEY = '@impostor_rewarded_unlock';

export const saveCustomCategories = async (categories: CustomCategory[]): Promise<void> => {
    try {
        const jsonValue = JSON.stringify(categories);
        await AsyncStorage.setItem(CUSTOM_CATEGORIES_KEY, jsonValue);
    } catch (e) {
        console.error('Error saving custom categories:', e);
    }
};

export const loadCustomCategories = async (): Promise<CustomCategory[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Error loading custom categories:', e);
        return [];
    }
};

export const saveGamesPlayed = async (count: number): Promise<void> => {
    try {
        await AsyncStorage.setItem(GAMES_PLAYED_KEY, count.toString());
    } catch (e) {
        console.error('Error saving games played:', e);
    }
};

export const loadGamesPlayed = async (): Promise<number> => {
    try {
        const value = await AsyncStorage.getItem(GAMES_PLAYED_KEY);
        return value != null ? parseInt(value, 10) : 0;
    } catch (e) {
        console.error('Error loading games played:', e);
        return 0;
    }
};

// ─── Active unlock (single category at a time) ─────────────────────────────

/** The currently active ad-unlocked category */
export interface RewardedUnlock {
    categoryId: string;
    expiryTimestamp: number;
}

export const saveRewardedUnlock = async (unlock: RewardedUnlock): Promise<void> => {
    try {
        await AsyncStorage.setItem(REWARDED_UNLOCK_KEY, JSON.stringify(unlock));
    } catch (e) {
        console.error('Error saving rewarded unlock:', e);
    }
};

export const loadRewardedUnlock = async (): Promise<RewardedUnlock | null> => {
    try {
        const value = await AsyncStorage.getItem(REWARDED_UNLOCK_KEY);
        return value != null ? JSON.parse(value) : null;
    } catch (e) {
        console.error('Error loading rewarded unlock:', e);
        return null;
    }
};

export const clearRewardedUnlock = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(REWARDED_UNLOCK_KEY);
    } catch (e) {
        console.error('Error clearing rewarded unlock:', e);
    }
};

// ─── Per-category unlock history (cooldown model) ───────────────────────────

/** History record for a single category */
export interface CategoryUnlockRecord {
    /** How many times unlocked via ad (max 2) */
    count: number;
    /** Epoch ms after which the next ad unlock is available (0 = immediately) */
    cooldownUntil: number;
}

/** Map of categoryId → its unlock history */
export type RewardedUnlockHistory = Record<string, CategoryUnlockRecord>;

const REWARDED_HISTORY_KEY = '@impostor_rewarded_history';

export const loadRewardedHistory = async (): Promise<RewardedUnlockHistory> => {
    try {
        const value = await AsyncStorage.getItem(REWARDED_HISTORY_KEY);
        return value != null ? JSON.parse(value) : {};
    } catch (e) {
        console.error('Error loading rewarded history:', e);
        return {};
    }
};

export const saveRewardedHistory = async (history: RewardedUnlockHistory): Promise<void> => {
    try {
        await AsyncStorage.setItem(REWARDED_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Error saving rewarded history:', e);
    }
};
