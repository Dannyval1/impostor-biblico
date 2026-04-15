import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnlineGame } from '../context/OnlineGameContext';

export function PlayerPresenceNotice() {
    const { playerPresenceNotice, clearPlayerPresenceNotice } = useOnlineGame();
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!playerPresenceNotice) return;

        Animated.parallel([
            Animated.spring(slideAnim, { toValue: 50, tension: 80, friction: 12, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: -100, duration: 250, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]).start(() => clearPlayerPresenceNotice());
        }, 3500);

        return () => clearTimeout(timer);
    }, [playerPresenceNotice, clearPlayerPresenceNotice, slideAnim, opacity]);

    if (!playerPresenceNotice) return null;

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }], opacity }]}>
            <Ionicons name="wifi" size={18} color="#FFF" />
            <Text style={styles.text}>{playerPresenceNotice}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 56,
        left: 20,
        right: 20,
        backgroundColor: '#2D3748',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 10,
    },
    text: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
});
