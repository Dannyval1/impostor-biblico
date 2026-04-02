import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useOnlineGame } from '../context/OnlineGameContext';
import { OnlineReaction } from '../types';

const EMOJIS = ['😂', '🥲', '🤔', '🫣', '😱', '😎', '👏'];

interface FloatingReaction {
    id: string;
    emoji: string;
    playerName: string;
    anim: Animated.Value;
    opacity: Animated.Value;
    x: number;
}

export function EmojiReactionBar() {
    const { sendReaction, gameState } = useOnlineGame();
    const [floaters, setFloaters] = useState<FloatingReaction[]>([]);
    const seenReactionsRef = useRef<Set<string>>(new Set());

    const reactions = gameState.room?.reactions;

    useEffect(() => {
        if (!reactions) return;

        Object.entries(reactions).forEach(([id, reaction]) => {
            if (seenReactionsRef.current.has(id)) return;
            if (reaction.playerId === gameState.playerId) {
                seenReactionsRef.current.add(id);
                return;
            }
            seenReactionsRef.current.add(id);

            const anim = new Animated.Value(0);
            const opacity = new Animated.Value(1);
            const x = 30 + Math.random() * 250;

            const floater: FloatingReaction = { id, emoji: reaction.emoji, playerName: reaction.playerName, anim, opacity, x };
            setFloaters(prev => [...prev, floater]);

            Animated.parallel([
                Animated.timing(anim, { toValue: 1, duration: 2500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 2500, delay: 500, useNativeDriver: true }),
            ]).start(() => {
                setFloaters(prev => prev.filter(f => f.id !== id));
            });
        });
    }, [reactions]);

    const handlePress = (emoji: string) => {
        const anim = new Animated.Value(0);
        const opacity = new Animated.Value(1);
        const x = 30 + Math.random() * 250;
        const localId = `local_${Date.now()}`;

        const floater: FloatingReaction = { id: localId, emoji, playerName: '', anim, opacity, x };
        setFloaters(prev => [...prev, floater]);

        Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 2500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 2500, delay: 500, useNativeDriver: true }),
        ]).start(() => {
            setFloaters(prev => prev.filter(f => f.id !== localId));
        });

        sendReaction(emoji);
    };

    return (
        <>
            {floaters.map(f => (
                <Animated.View
                    key={f.id}
                    pointerEvents="none"
                    style={[
                        styles.floater,
                        {
                            left: f.x,
                            opacity: f.opacity,
                            transform: [{ translateY: f.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -200] }) }],
                        },
                    ]}
                >
                    <Text style={styles.floaterEmoji}>{f.emoji}</Text>
                    {f.playerName ? <Text style={styles.floaterName}>{f.playerName}</Text> : null}
                </Animated.View>
            ))}
            <View style={styles.bar}>
                {EMOJIS.map(emoji => (
                    <TouchableOpacity key={emoji} style={styles.emojiBtn} onPress={() => handlePress(emoji)} activeOpacity={0.6}>
                        <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 24,
        alignSelf: 'center',
        marginBottom: 8,
    },
    emojiBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiText: {
        fontSize: 22,
    },
    floater: {
        position: 'absolute',
        bottom: 80,
        alignItems: 'center',
        zIndex: 999,
    },
    floaterEmoji: {
        fontSize: 36,
    },
    floaterName: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 2,
    },
});
