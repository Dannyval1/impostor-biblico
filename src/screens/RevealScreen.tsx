import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ImageBackground,
    Animated,
    PanResponder,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGame } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';
import { Player } from '../types';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const HALF_SCREEN = SCREEN_HEIGHT * 0.52;
const PEEK_THRESHOLD = HALF_SCREEN * 0.35;

type RevealScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Reveal'>;
};

export default function RevealScreen({ navigation }: RevealScreenProps) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { state, markPlayerSeenWord, loadNewWord, playClick } = useGame();
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [hasPeeked, setHasPeeked] = useState(false);

    const players = state.settings.players;
    const currentPlayer = players[currentPlayerIndex];
    const isImpostor = currentPlayer?.role === 'impostor';

    // Bouncing arrow animation
    const bounceAnim = useRef(new Animated.Value(0)).current;
    // Buttons slide-up animation - Start offscreen (300)
    const buttonsAnim = useRef(new Animated.Value(300)).current;
    // Curtain position — stored as a plain number ref + Animated.Value
    const curtainY = useRef(new Animated.Value(0)).current;
    const curtainPos = useRef(0);

    useEffect(() => {
        const bounce = Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, {
                    toValue: -12,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(bounceAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        );
        bounce.start();
        return () => bounce.stop();
    }, [currentPlayerIndex]);

    // Animate buttons in/out when peeked state changes
    useEffect(() => {
        if (hasPeeked) {
            Animated.sequence([
                Animated.delay(300),
                Animated.spring(buttonsAnim, {
                    toValue: 0,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.timing(buttonsAnim, {
                toValue: 300,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [hasPeeked]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 8,
            onPanResponderMove: (_, gs) => {
                // Only upward, hard clamped to HALF_SCREEN
                const dy = gs.dy;
                if (dy < 0) {
                    const val = Math.max(dy, -HALF_SCREEN);
                    curtainPos.current = val;
                    // Reset buttons if they start dragging curtain down significantly?
                    // No, let's keep it simple.
                    curtainY.setValue(val);
                } else {
                    curtainPos.current = 0;
                    curtainY.setValue(0);
                }
            },
            onPanResponderRelease: (_, gs) => {
                const shouldPeek = gs.dy < -PEEK_THRESHOLD;

                curtainPos.current = 0;
                // Use spring for a bouncy return, but clamp overshoot to avoid "jumping" the view down
                Animated.spring(curtainY, {
                    toValue: 0,
                    friction: 7,
                    tension: 40,
                    overshootClamping: true, // Prevent bouncing past zero (positive Y)
                    useNativeDriver: true,
                }).start(() => {
                    // Only show buttons AFTER curtain has bounced back down
                    if (shouldPeek) {
                        setHasPeeked(true);
                    }
                });
            },
        })
    ).current;

    const handleNext = () => {
        playClick();
        markPlayerSeenWord(currentPlayer.id);

        if (currentPlayerIndex === players.length - 1) {
            navigation.replace('Voting');
        } else {
            setCurrentPlayerIndex(currentPlayerIndex + 1);
            setHasPeeked(false);
            curtainY.setValue(0);
            curtainPos.current = 0;
            // Force reset buttons anim immediately to hidden state to prevent flash
            buttonsAnim.setValue(300);
        }
    };

    if (!currentPlayer) {
        return (
            <SafeAreaView style={styles.container}>
                <Text>{t.error}</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <View style={styles.layerContainer}>
                {/* ─── BASE LAYER: Word info in bottom half ─── */}
                <View style={styles.baseLayer}>
                    <View style={styles.bottomHalf}>
                        {isImpostor ? (
                            <View style={styles.wordRevealArea}>
                                <Text style={styles.impostorIcon}>🎭</Text>
                                <Text style={styles.impostorLabel}>{t.reveal.shout_is}</Text>
                                <Text style={styles.impostorTitle}>{t.reveal.shout_impostor}</Text>
                                <Text style={styles.impostorSecret}>{t.reveal.impostor_secret}</Text>

                                {state.settings.impostorHintEnabled && state.currentWord?.impostorHint && (
                                    <Text style={styles.impostorHintText}>
                                        <Text style={{ fontWeight: 'bold' }}>{t.reveal.hint}:</Text> {state.currentWord.impostorHint}
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <View style={styles.wordRevealArea}>
                                <Text style={styles.wordLabel}>{t.reveal.your_word}</Text>
                                <Text style={styles.word}>{state.currentWord?.word}</Text>

                                <View style={styles.categoryPill}>
                                    <Text style={styles.categoryText}>
                                        📚 {t.setup.categories_list[(state.currentWord?.category || '') as keyof typeof t.setup.categories_list]}
                                    </Text>
                                </View>

                                {state.currentWord?.hint && (
                                    <Text style={styles.hintText}>
                                        💡 {t.reveal.hint}: <Text style={styles.hintValue}>{state.currentWord.hint}</Text>
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* ─── CURTAIN LAYER ─── */}
                <Animated.View
                    style={[styles.curtain, { transform: [{ translateY: curtainY }] }]}
                    {...panResponder.panHandlers}
                >
                    <ImageBackground
                        source={require('../../assets/impostor_home_x.webp')}
                        style={styles.curtainImage}
                        resizeMode="cover"
                    >
                        <View style={styles.blueOverlay} />

                        <View style={styles.curtainContent}>
                            {/* Header: progress + close */}
                            <View style={[styles.curtainHeader, { marginTop: insets.top + 8 }]}>
                                <Text style={styles.progressText}>
                                    {currentPlayerIndex + 1} / {players.length}
                                </Text>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => navigation.replace('Setup')}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
                                </TouchableOpacity>
                            </View>

                            {/* Player name center - Absolute to prevent jumps */}
                            <View style={styles.centerArea}>
                                <Text style={styles.playerLabel}>{t.reveal.player}</Text>
                                <Text style={styles.playerName}>{currentPlayer.name}</Text>
                            </View>

                            {/* Footer Area - Absolute bottom */}
                            <View style={[styles.footerArea, { paddingBottom: 12 + insets.bottom }]}>
                                {/* BUTTONS: Appear above swipe text */}
                                <Animated.View style={[
                                    styles.buttonsArea,
                                    {
                                        transform: [{ translateY: buttonsAnim }],
                                        opacity: buttonsAnim.interpolate({
                                            inputRange: [0, 150],
                                            outputRange: [1, 0],
                                            extrapolate: 'clamp',
                                        })
                                    }
                                ]}>
                                    {currentPlayerIndex === 0 && !isImpostor && (
                                        <TouchableOpacity
                                            style={styles.changeWordButton}
                                            onPress={() => {
                                                playClick();
                                                loadNewWord();
                                                setHasPeeked(false);
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.changeWordButtonText}>{t.reveal.change_word}</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={styles.nextButton}
                                        onPress={handleNext}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.nextButtonText}>
                                            {currentPlayerIndex === players.length - 1
                                                ? t.reveal.start_game
                                                : `${t.reveal.next_player} →`}
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>

                                {/* Swipe prompt - Fade out when buttons appear */}
                                <Animated.View style={[
                                    styles.swipeArea,
                                    {
                                        opacity: buttonsAnim.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: [0, 1],
                                            extrapolate: 'clamp',
                                        })
                                    }
                                ]}>
                                    <Text style={styles.swipeText}>
                                        {t.reveal.swipe_to_reveal}
                                    </Text>
                                    <Animated.Text style={[styles.swipeArrow, { transform: [{ translateY: bounceAnim }] }]}>
                                        ▲
                                    </Animated.Text>
                                </Animated.View>

                                {/* Warning */}
                                <Text style={styles.warningFooter}>
                                    ⚠️ {t.reveal.warning_title}
                                </Text>
                            </View>
                        </View>
                    </ImageBackground>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    // ─── LAYERS ──────────────────────────────────────────
    layerContainer: {
        flex: 1,
        position: 'relative',
    },
    baseLayer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
    },
    bottomHalf: {
        height: SCREEN_HEIGHT / 2,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    curtain: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    curtainImage: {
        flex: 1,
        width: '100%',
    },
    blueOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(59, 89, 152, 0.85)',
    },
    curtainContent: {
        flex: 1,
        // Paddings removed to allow absolute positioning of children to edges
    },
    curtainHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
        paddingHorizontal: 24,
    },
    closeButton: {
        position: 'absolute',
        right: 10,
        padding: 6,
    },

    // ─── CURTAIN: PLAYER & SWIPE ─────────────────────────
    progressText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        letterSpacing: 1,
    },
    centerArea: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 0,
    },
    footerArea: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        alignItems: 'center',
        zIndex: 5,
    },
    playerLabel: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 4,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    playerName: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    swipeArea: {
        alignItems: 'center',
        paddingBottom: 4,
    },
    swipeText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        letterSpacing: 1.2,
        lineHeight: 18,
        marginBottom: 10,
    },
    swipeArrow: {
        fontSize: 26,
        color: '#FFFFFF',
    },
    warningFooter: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        marginTop: 8,
    },

    // ─── BUTTONS (inside curtain, bottom) ────────────────
    buttonsArea: {
        position: 'absolute',
        bottom: 80, // Position above the swipe text
        left: 24,
        right: 24,
        alignItems: 'center',
        zIndex: 10,
    },
    nextButton: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    nextButtonText: {
        color: '#5B7FDB',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    changeWordButton: {
        width: '100%',
        backgroundColor: '#000000ff',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    changeWordButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },

    // ─── BASE: WORD ──────────────────────────────────────
    wordRevealArea: {
        alignItems: 'center',
        width: '100%',
    },
    wordLabel: {
        fontSize: 14,
        color: '#999',
        marginBottom: 10,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    word: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#222',
        textAlign: 'center',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    categoryPill: {
        backgroundColor: '#EEEEEE',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginBottom: 12,
    },
    categoryText: {
        fontSize: 13,
        color: '#777',
    },
    hintText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    hintValue: {
        color: '#555',
        fontWeight: '600',
    },

    // ─── BASE: IMPOSTOR ──────────────────────────────────
    impostorIcon: {
        fontSize: 56,
        marginBottom: 8,
    },
    impostorLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#555',
        marginBottom: 2,
    },
    impostorTitle: {
        fontSize: 38,
        fontWeight: 'bold',
        color: '#E53E3E',
        marginBottom: 14,
        letterSpacing: 1,
    },
    impostorSecret: {
        fontSize: 15,
        fontWeight: '600',
        color: '#E53E3E',
        textAlign: 'center',
        marginBottom: 8,
    },
    impostorHintText: {
        fontSize: 16,
        color: '#777',
        textAlign: 'center',
        marginTop: 12,
        fontStyle: 'italic',
    },
    impostorStrategy: {
        fontSize: 13,
        color: '#777',
        textAlign: 'center',
        lineHeight: 19,
    },
});