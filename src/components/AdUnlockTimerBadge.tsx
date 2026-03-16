import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePurchase } from '../context/PurchaseContext';

export function AdUnlockTimerBadge({ categoryId }: { categoryId: string }) {
    const { rewardedUnlock, isCategoryUnlockedByAd } = usePurchase();
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!isCategoryUnlockedByAd(categoryId) || !rewardedUnlock) return;

        const updateTimer = () => {
            const left = Math.max(0, rewardedUnlock.expiryTimestamp - Date.now());
            setTimeLeft(left);
        };

        updateTimer();
        // Update every minute (60000ms) for production
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [categoryId, rewardedUnlock, isCategoryUnlockedByAd]);

    if (!isCategoryUnlockedByAd(categoryId) || timeLeft <= 0) return null;

    const hours = Math.floor(timeLeft / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);

    let formatTime;
    if (hours > 0) {
        formatTime = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        formatTime = `${minutes}m`;
    } else {
        formatTime = `< 1m`;
    }

    return (
        <View style={styles.badge}>
            <Ionicons name="time-outline" size={11} color="#FFF" />
            <Text style={styles.text}>{formatTime}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: 6,
        left: 6,
        backgroundColor: 'rgba(91,127,219,0.95)',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 3,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    text: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
        marginLeft: 4,
    },
});
