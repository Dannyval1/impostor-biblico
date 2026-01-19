import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomCategory } from '../types';

const CUSTOM_CATEGORIES_KEY = '@impostor_custom_categories';
const GAMES_PLAYED_KEY = '@impostor_games_played';

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
