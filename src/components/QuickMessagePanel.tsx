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
    'im_ready',
    'wait_me',
    'good_clue',
    'suspicious',
    'no_idea',
    'gg',
    'thinking',
    'i_know',
    'think_about_it',
    'jajaja',
] as const;
const ELIMINATED_KEYS = ['eliminated_angry', 'eliminated_innocent'] as const;
const DYNAMIC_KEYS = ['dynamic_name'] as const;
const MAX_FLOATERS = 5;

export type QuickMessageVariant = 'lobby' | 'clues' | 'voting';

type MessageKey =
    | (typeof BASE_KEYS)[number]
    | (typeof ELIMINATED_KEYS)[number]
    | (typeof DYNAMIC_KEYS)[number];

function orderedKeys(variant: QuickMessageVariant, isEliminated: boolean): MessageKey[] {
    if (isEliminated) {
        return [...ELIMINATED_KEYS, ...orderedKeys(variant, false)];
    }
    switch (variant) {
        case 'lobby':
            return [
                'im_ready',
                'wait_me',
                'good_clue',
                'suspicious',
                'thinking',
                'i_know',
                'think_about_it',
                'no_idea',
                'gg',
                'jajaja',
            ];
        case 'clues':
            return [
                'good_clue',
                'suspicious',
                'i_know',
                'think_about_it',
                'no_idea',
                'thinking',
                'gg',
                'wait_me',
                'im_ready',
                'jajaja',
            ];
        case 'voting':
            return [
                'thinking',
                'gg',
                'wait_me',
                'good_clue',
                'suspicious',
                'no_idea',
                'i_know',
                'think_about_it',
                'im_ready',
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
    const seenMessagesRef = useRef<Set<string>>(new Set());
    const hasOpenedOnceRef = useRef(false);
    const [showArrow, setShowArrow] = useState(false);
    const arrowAnim = useRef(new Animated.Value(0)).current;
    const arrowLoop = useRef<Animated.CompositeAnimation | null>(null);

    const messages = gameState.room?.messages;
    const qm = t.online.quick_messages;

    const keys = useMemo(() => orderedKeys(variant, isEliminated), [variant, isEliminated]);
    const playerNameOptions = useMemo(() => {
        const roomPlayers = Object.values(gameState.room?.players || {}).filter(
            p =>
                typeof p?.name === 'string' &&
                p.name.trim().length > 0 &&
                p.isConnected !== false
        );
        return roomPlayers.map(p => ({ id: `name:${p.id}`, label: p.name.trim() }));
    }, [gameState.room?.players]);

    const getMessageText = (key: string): string =>
        (qm as Record<string, string>)[key] ?? key;

    useEffect(() => {
        if (!messages) return;

        Object.entries(messages).forEach(([id, msg]) => {
            if (seenMessagesRef.current.has(id)) return;
            if (msg.playerId === gameState.playerId) {
                seenMessagesRef.current.add(id);
                return;
            }
            seenMessagesRef.current.add(id);

            const resolvedText = msg.messageText?.trim() || getMessageText(msg.messageKey);
            spawnFloater(id, resolvedText, msg.playerName);
        });
    }, [messages, gameState.playerId]);

    const spawnFloater = (id: string, text: string, playerName: string) => {
        const anim = new Animated.Value(0);
        const opacity = new Animated.Value(1);
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
        };
        setFloaters(prev => {
            if (prev.length >= MAX_FLOATERS) {
                const evicted = prev[0];
                evicted.animation?.stop();
            }
            const trimmed = prev.length >= MAX_FLOATERS ? prev.slice(1) : prev;
            return [...trimmed, floater];
        });

        const animation = Animated.parallel([
            Animated.timing(anim, {
                toValue: 1,
                duration: 3000,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.sequence([
                Animated.delay(1500),
                Animated.timing(opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
            ]),
        ]);
        floater.animation = animation;
        animation.start(() => {
            setFloaters(prev => prev.filter(f => f.id !== id));
        });
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
        <View style={styles.panelRow}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.scrollHorizontal}
                contentContainerStyle={styles.scrollContent}
                onScrollBeginDrag={dismissArrow}
            >
                {keys.map(key => (
                    <TouchableOpacity
                        key={key}
                        style={styles.msgBtn}
                        onPress={() => handlePress(key)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.msgText}>{getMessageText(key)}</Text>
                    </TouchableOpacity>
                ))}
                {playerNameOptions.map(opt => (
                    <TouchableOpacity
                        key={opt.id}
                        style={[styles.msgBtn, styles.nameMsgBtn]}
                        onPress={() => handlePress('dynamic_name', opt.label)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.msgText}>{opt.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            {showArrow && (
                <Animated.Text
                    pointerEvents="none"
                    style={[
                        styles.arrowHint,
                        {
                            opacity: arrowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
                            transform: [
                                {
                                    translateX: arrowAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, 5],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    ›
                </Animated.Text>
            )}
        </View>
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
        maxHeight: 72,
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
        maxWidth: 340,
        overflow: 'hidden',
        alignSelf: 'center',
        flexGrow: 0,
        flexShrink: 1,
        maxHeight: 72,
    },
    panelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexGrow: 0,
        flexShrink: 1,
        maxHeight: 68,
    },
    scrollHorizontal: {
        flexGrow: 0,
        flexShrink: 1,
        maxHeight: 68,
    },
    arrowHint: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '700',
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    scrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flexGrow: 0,
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 6,
    },
    msgBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'center',
    },
    msgText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    nameMsgBtn: {
        borderColor: 'rgba(91,127,219,0.65)',
        backgroundColor: 'rgba(91,127,219,0.2)',
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
    },
    floaterText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },
});
