import React, { useRef } from 'react';
import {
    TouchableOpacity,
    Animated,
    StyleProp,
    ViewStyle,
    GestureResponderEvent
} from 'react-native';

type ScaleButtonProps = {
    onPress: (event: GestureResponderEvent) => void;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
    activeScale?: number;
};

export function ScaleButton({
    onPress,
    children,
    style,
    disabled = false,
    activeScale = 0.95
}: ScaleButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: activeScale,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10,
        }).start();
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            activeOpacity={1} // Disable default opacity change since we are scaling
            style={{ width: '100%' }} // Ensure it takes width if wrapped
        >
            <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
}
