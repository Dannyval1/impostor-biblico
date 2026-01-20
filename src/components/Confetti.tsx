import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const CONFETTI_COLORS = ['#fdf6cd', '#5B7FDB', '#E53E3E', '#81C784', '#F06292', '#4DD0E1'];
const CONFETTI_COUNT = 40;

interface ConfettiPieceProps {
    index: number;
}

const ConfettiPiece = ({ index }: ConfettiPieceProps) => {
    const initialX = useRef(Math.random() * width).current;
    const fallAnim = useRef(new Animated.Value(-20)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const driftAnim = useRef(new Animated.Value(initialX)).current;

    useEffect(() => {
        const fallDuration = 3000 + Math.random() * 2000;
        const driftDistance = Math.random() * 100 - 50;
        const delay = index * 100;

        const animation = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(fallAnim, {
                        toValue: height + 20,
                        duration: fallDuration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rotateAnim, {
                        toValue: 1,
                        duration: fallDuration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(driftAnim, {
                        toValue: initialX + driftDistance,
                        duration: fallDuration,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(fallAnim, {
                        toValue: -20,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rotateAnim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(driftAnim, {
                        toValue: initialX,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [index, initialX]);

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '720deg'],
    });

    const backgroundColor = CONFETTI_COLORS[index % CONFETTI_COLORS.length];

    return (
        <Animated.View
            style={[
                styles.confetti,
                {
                    backgroundColor,
                    transform: [
                        { translateY: fallAnim },
                        { translateX: driftAnim },
                        { rotate: rotation },
                    ],
                },
            ]}
        />
    );
};

export const Confetti = () => {
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
                <ConfettiPiece key={i} index={i} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    confetti: {
        width: 10,
        height: 10,
        position: 'absolute',
        borderRadius: 2,
    },
});
