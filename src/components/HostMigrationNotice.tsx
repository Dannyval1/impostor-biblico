import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useOnlineGame } from '../context/OnlineGameContext';
import { Ionicons } from '@expo/vector-icons';

export function HostMigrationNotice() {
    const { hostMigrationNotice, clearHostMigrationNotice } = useOnlineGame();
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!hostMigrationNotice) return;

        Animated.parallel([
            Animated.spring(slideAnim, { toValue: 50, tension: 80, friction: 12, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start(() => clearHostMigrationNotice());
        }, 5000);

        return () => clearTimeout(timer);
    }, [hostMigrationNotice]);

    if (!hostMigrationNotice) return null;

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }], opacity }]}>
            <Ionicons name="swap-horizontal" size={18} color="#FFF" />
            <Text style={styles.text}>{hostMigrationNotice}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        backgroundColor: '#5B7FDB',
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
