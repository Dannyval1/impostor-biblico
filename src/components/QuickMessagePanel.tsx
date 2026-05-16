import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Easing,
    ScrollView,
    Dimensions,
    Modal,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useTranslation } from '../hooks/useTranslation';

const BASE_KEYS = [
    'good_clue',
    'suspicious',
    'no_idea',
    'thinking',
    'i_know',
    'think_about_it',
    'jajaja',
    'who_is',
    'already_said',
] as const;
const ELIMINATED_KEYS = ['eliminated_angry', 'eliminated_innocent'] as const;
const MAX_FLOATERS = 5;

export type QuickMessageVariant = 'lobby' | 'clues' | 'voting';

type MessageKey =
    | (typeof BASE_KEYS)[number]
    | (typeof ELIMINATED_KEYS)[number];

function orderedKeys(variant: QuickMessageVariant, isEliminated: boolean): MessageKey[] {
    if (isEliminated) {
        return [...ELIMINATED_KEYS, ...orderedKeys(variant, false)];
    }
    switch (variant) {
        case 'lobby':
            return [
                'good_clue',
                'suspicious',
                'thinking',
                'i_know',
                'think_about_it',
                'no_idea',
                'who_is',
                'already_said',
                'jajaja',
            ];
        case 'clues':
            return [
                'good_clue',
                'suspicious',
                'i_know',
                'who_is',
                'already_said',
                'think_about_it',
                'no_idea',
                'thinking',
                'jajaja',
            ];
        case 'voting':
            return [
                'who_is',
                'already_said',
                'thinking',
                'suspicious',
                'no_idea',
                'i_know',
                'think_about_it',
                'good_clue',
                'jajaja',
            ];
    }
}

interface FloatingMessage {
    id: string;
    text: string;
    playerName: string;
    anim: Animated.Value;
    opacity: Animated.Value;
    baseLeft: number;
    slideX: number;
    animation?: Animated.CompositeAnimation;
    count: number;
    countAnim: Animated.Value;
}

export type QuickMessagePanelProps = {
    variant?: QuickMessageVariant;
    /** `header`: fila compacta (p. ej. junto al título “Jugadores”); `bottom`: barra centrada bajo el contenido */
    placement?: 'bottom' | 'header';
    /** Solo con `placement="header"`: nodo a la izquierda (título de sección) */
    headerLeft?: React.ReactNode;
    /** Modo espectador/eliminado: solo frases dramáticas. */
    isEliminated?: boolean;
};

export function QuickMessagePanel({
    variant = 'clues',
    placement = 'bottom',
    headerLeft,
    isEliminated = false,
}: QuickMessagePanelProps) {
    const { sendQuickMessage, gameState } = useOnlineGame();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [isOpen, setIsOpen] = useState(false);
    const [floaters, setFloaters] = useState<FloatingMessage[]>([]);
    const floatersRef = useRef<FloatingMessage[]>([]);
    const seenMessagesRef = useRef<Set<string>>(new Set());
    const hasOpenedOnceRef = useRef(false);
    const [showArrow, setShowArrow] = useState(false);
    const arrowAnim = useRef(new Animated.Value(0)).current;
    const arrowLoop = useRef<Animated.CompositeAnimation | null>(null);

    const messages = gameState.room?.messages;
    const qm = t.online.quick_messages;

    const keys = useMemo(() => orderedKeys(variant, isEliminated), [variant, isEliminated]);

    const getMessageText = (key: string): string =>
        (qm as Record<string, string>)[key] ?? key;

    // Keep floatersRef in sync for synchronous reads inside spawnFloater
    useEffect(() => { floatersRef.current = floaters; }, [floaters]);

    useEffect(() => {
        if (!messages) return;

        Object.entries(messages).forEach(([id, msg]) => {
            if (seenMessagesRef.current.has(id)) return;
            seenMessagesRef.current.add(id);
            if (msg.messageKey === 'free_text') return;
            if (msg.playerId === gameState.playerId) return;

            const resolvedText = msg.messageText?.trim() || getMessageText(msg.messageKey);
            spawnFloater(id, resolvedText, msg.playerName);
        });
    }, [messages, gameState.playerId]);

    const startFloaterAnimation = (floater: FloatingMessage) => {
        floater.animation?.stop();
        floater.anim.setValue(0);
        floater.opacity.setValue(1);
        const animation = Animated.parallel([
            Animated.timing(floater.anim, {
                toValue: 1,
                duration: 3000,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.sequence([
                Animated.delay(1500),
                Animated.timing(floater.opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
            ]),
        ]);
        floater.animation = animation;
        animation.start(({ finished }) => {
            if (!finished) return;
            setFloaters(prev => prev.filter(f => f.id !== floater.id));
        });
    };

    const spawnFloater = (id: string, text: string, playerName: string) => {
        // If an identical message is already visible, bump its count and bounce the badge
        const existing = floatersRef.current.find(f => f.text === text);
        if (existing) {
            startFloaterAnimation(existing);
            existing.countAnim.setValue(0);
            Animated.spring(existing.countAnim, {
                toValue: 1,
                useNativeDriver: true,
                speed: 40,
                bounciness: 18,
            }).start();
            setFloaters(prev =>
                prev.map(f => f.id === existing.id ? { ...f, count: f.count + 1 } : f)
            );
            return;
        }

        const anim = new Animated.Value(0);
        const opacity = new Animated.Value(1);
        const countAnim = new Animated.Value(1);
        const { width: W } = Dimensions.get('window');
        const margin = 14;
        const floaterSlot = 270;
        const maxLeft = Math.max(margin, W - floaterSlot - margin);
        const baseLeft = margin + Math.random() * Math.max(0, maxLeft - margin);
        const slideX = (Math.random() < 0.5 ? 1 : -1) * (32 + Math.random() * 44);

        const floater: FloatingMessage = {
            id,
            text,
            playerName,
            anim,
            opacity,
            baseLeft,
            slideX,
            count: 1,
            countAnim,
        };
        setFloaters(prev => {
            if (prev.length >= MAX_FLOATERS) {
                const evicted = prev[0];
                evicted.animation?.stop();
            }
            const trimmed = prev.length >= MAX_FLOATERS ? prev.slice(1) : prev;
            return [...trimmed, floater];
        });

        startFloaterAnimation(floater);
    };

    // Arrow hint: shown the first time the panel opens, dismissed on scroll or after 2s
    useEffect(() => {
        if (!isOpen) return;
        if (hasOpenedOnceRef.current) return;
        hasOpenedOnceRef.current = true;
        setShowArrow(true);
        arrowLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(arrowAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(arrowAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
            ])
        );
        arrowLoop.current.start();
        const timer = setTimeout(() => dismissArrow(), 2000);
        return () => clearTimeout(timer);
    }, [isOpen]);

    const dismissArrow = useCallback(() => {
        arrowLoop.current?.stop();
        setShowArrow(false);
    }, []);

    const handlePress = (key: MessageKey, explicitText?: string) => {
        setIsOpen(false);
        const localId = `local_${Date.now()}`;
        const displayText = explicitText || getMessageText(key);
        spawnFloater(localId, displayText, '');
        // Enviamos siempre texto explícito para que todos los clientes rendericen exactamente la misma burbuja.
        sendQuickMessage(key, displayText);
    };

    const panelInner = (
        <ScrollView
            style={styles.gridScroll}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
        >
            {keys.map(key => (
                <TouchableOpacity
                    key={key}
                    style={styles.msgBtn}
                    onPress={() => handlePress(key)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.msgText} numberOfLines={2}>{getMessageText(key)}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    /** Burbujas del lobby: ancladas al borde inferior de pantalla (como cuando el panel estaba sobre el footer) */
    const lobbyFloaterBottom = Math.max(insets.bottom, 8) + 88;

    const renderFloaterNodes = (bottomOffset: number) =>
        floaters.map(f => (
            <Animated.View
                key={f.id}
                pointerEvents="none"
                style={[
                    styles.floater,
                    { bottom: bottomOffset },
                    {
                        left: f.baseLeft,
                        opacity: f.opacity,
                        transform: [
                            {
                                translateX: f.anim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, f.slideX],
                                }),
                            },
                            {
                                translateY: f.anim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -200],
                                }),
                            },
                        ],
                    },
                ]}
            >
                {f.playerName ? <Text style={styles.floaterName}>{f.playerName}</Text> : null}
                <View style={styles.floaterBubble}>
                    <Text style={styles.floaterText}>{f.text}</Text>
                    {f.count > 1 && (
                        <Animated.View
                            style={[
                                styles.countBadge,
                                {
                                    transform: [
                                        {
                                            scale: f.countAnim.interpolate({
                                                inputRange: [0, 0.5, 1],
                                                outputRange: [0.6, 1.6, 1],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            <Text style={styles.countText}>×{f.count}</Text>
                        </Animated.View>
                    )}
                </View>
            </Animated.View>
        ));

    const toggleButton = (
        <TouchableOpacity
            style={[styles.toggleBtn, isOpen && styles.toggleBtnActive, placement === 'header' && styles.toggleBtnHeader]}
            onPress={() => setIsOpen(prev => !prev)}
            activeOpacity={0.7}
        >
            <Text style={styles.toggleText}>{qm.panel_label}</Text>
        </TouchableOpacity>
    );

    if (placement === 'header' && headerLeft != null) {
        return (
            <>
                <Modal
                    visible={floaters.length > 0}
                    transparent
                    animationType="none"
                    statusBarTranslucent
                    presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
                    onRequestClose={() => {}}
                >
                    <View style={styles.modalFloaterRoot} pointerEvents="box-none">
                        {renderFloaterNodes(lobbyFloaterBottom)}
                    </View>
                </Modal>

                <View style={styles.headerOuter}>
                    <View style={styles.headerTitleRow}>
                        {headerLeft}
                        {toggleButton}
                    </View>
                    {isOpen && (
                        <View style={[styles.panel, styles.panelBelowHeader]}>
                            {panelInner}
                        </View>
                    )}
                </View>
            </>
        );
    }

    return (
        <>
            {renderFloaterNodes(88)}

            <View style={styles.wrapper}>
                {isOpen && <View style={styles.panel}>{panelInner}</View>}
                {toggleButton}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    headerOuter: {
        width: '100%',
        marginBottom: 4,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    panelBelowHeader: {
        marginTop: 8,
        maxWidth: '100%',
        alignSelf: 'stretch',
        flexGrow: 0,
    },
    wrapper: {
        alignItems: 'center',
        marginBottom: 6,
        flexGrow: 0,
        alignSelf: 'stretch',
    },
    panel: {
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 16,
        marginBottom: 6,
        maxWidth: 360,
        overflow: 'hidden',
        alignSelf: 'center',
        width: '92%',
    },
    gridScroll: {
        maxHeight: 180,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 8,
        gap: 6,
    },
    msgBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        width: '31%',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 40,
    },
    msgText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    toggleBtn: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    toggleBtnHeader: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexShrink: 0,
    },
    toggleBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderColor: 'rgba(255,255,255,0.4)',
    },
    toggleText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
    modalFloaterRoot: {
        flex: 1,
        backgroundColor: 'transparent',
        pointerEvents: 'box-none',
    },
    floater: {
        position: 'absolute',
        alignItems: 'center',
        zIndex: 999,
        maxWidth: 280,
    },
    floaterName: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 3,
        textAlign: 'center',
    },
    floaterBubble: {
        backgroundColor: 'rgba(30,30,50,0.85)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        maxWidth: 280,
        overflow: 'visible',
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
    },
    floaterText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },
    countBadge: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        minWidth: 24,
        paddingHorizontal: 5,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    countText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
    },
});
