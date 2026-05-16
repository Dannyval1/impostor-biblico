import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useTranslation } from '../hooks/useTranslation';
import { usePurchase } from '../context/PurchaseContext';

interface ChatPanelProps {
    onUpgradePress: () => void;
    defaultExpanded?: boolean;
    style?: ViewStyle;
}

export function ChatPanel({ onUpgradePress, defaultExpanded = true, style }: ChatPanelProps) {
    const { gameState, sendChatMessage } = useOnlineGame();
    const { t } = useTranslation();
    const { isPremium } = usePurchase();
    const [text, setText] = useState('');
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [seenCount, setSeenCount] = useState(0);
    const isPremiumRoom = gameState.room?.settings.isPremiumRoom ?? false;
    const isUnlimited = isPremiumRoom || isPremium;
    const scrollRef = useRef<ScrollView>(null);
    const ct = t.online;

    const myId = gameState.playerId;
    const allMessages = gameState.room?.messages;

    const chatMessages = useMemo(() => {
        if (!allMessages) return [];
        return Object.entries(allMessages)
            .filter(([, m]) => m.messageKey === 'free_text' && m.messageText)
            .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    }, [allMessages]);

    const FREE_MSG_LIMIT = 10;

    const myCount = useMemo(
        () => chatMessages.filter(([, m]) => m.playerId === myId).length,
        [chatMessages, myId]
    );

    const atLimit = !isUnlimited && myCount >= FREE_MSG_LIMIT;
    const canSend = !atLimit && text.trim().length > 0;

    const handleSend = () => {
        if (!canSend) return;
        sendChatMessage(text.trim(), isUnlimited);
        setText('');
    };

    useEffect(() => {
        if (isExpanded) {
            setSeenCount(chatMessages.length);
            if (chatMessages.length > 0) {
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
            }
        }
    }, [isExpanded, chatMessages.length]);

    const unreadCount = chatMessages.length - seenCount;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={80}
        >
            <View style={[styles.container, style]}>
                {/* Header */}
                <TouchableOpacity
                    style={styles.header}
                    onPress={() => setIsExpanded(v => !v)}
                    activeOpacity={0.8}
                >
                    <View style={styles.headerLeft}>
                        <Text style={styles.headerIcon}>💬</Text>
                        <Text style={styles.headerTitle}>{ct.chat_title}</Text>
                        {!isExpanded && unreadCount > 0 && (
                            <View style={styles.countBadge}>
                                <Text style={styles.countBadgeText}>{unreadCount}</Text>
                            </View>
                        )}
                    </View>
                    <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-up'}
                        size={16}
                        color="#A0AEC0"
                    />
                </TouchableOpacity>

                {isExpanded && (
                    <>
                        {/* Messages list */}
                        <ScrollView
                            ref={scrollRef}
                            style={styles.messagesList}
                            contentContainerStyle={styles.messagesContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {chatMessages.length === 0 ? (
                                <Text style={styles.emptyText}>{ct.chat_empty}</Text>
                            ) : (
                                chatMessages.map(([id, msg]) => {
                                    const isMe = msg.playerId === myId;
                                    return (
                                        <View key={id} style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
                                            {!isMe && (
                                                <Text style={styles.senderName}>{msg.playerName}</Text>
                                            )}
                                            <View style={[styles.bubble, isMe && styles.bubbleMe]}>
                                                <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                                                    {msg.messageText}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>

                        {/* Input area */}
                        {atLimit ? (
                            <TouchableOpacity style={styles.lockedRow} onPress={onUpgradePress} activeOpacity={0.8}>
                                <Ionicons name="lock-closed" size={13} color="#A0AEC0" />
                                <Text style={styles.lockedText}>{ct.chat_limit_reached}</Text>
                                <Text style={styles.lockedCta}>{ct.chat_upgrade_cta}</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.input}
                                    value={text}
                                    onChangeText={v => setText(v.slice(0, 160))}
                                    placeholder={ct.chat_placeholder}
                                    placeholderTextColor="#A0AEC0"
                                    returnKeyType="send"
                                    onSubmitEditing={handleSend}
                                    multiline={false}
                                />
                                {text.length > 0 ? (
                                    <Text style={styles.charCount}>{160 - text.length}</Text>
                                ) : !isUnlimited ? (
                                    <Text style={styles.remaining}>{FREE_MSG_LIMIT - myCount} {ct.chat_free_remaining}</Text>
                                ) : null}
                                <TouchableOpacity
                                    style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
                                    onPress={handleSend}
                                    disabled={!canSend}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="send" size={16} color={canSend ? '#FFF' : '#A0AEC0'} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 0,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerIcon: {
        fontSize: 16,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2D3748',
    },
    countBadge: {
        backgroundColor: '#5B7FDB',
        borderRadius: 10,
        minWidth: 20,
        paddingHorizontal: 5,
        paddingVertical: 1,
        alignItems: 'center',
    },
    countBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    messagesList: {
        maxHeight: 200,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    messagesContent: {
        padding: 12,
        gap: 8,
    },
    emptyText: {
        color: '#A0AEC0',
        fontSize: 13,
        textAlign: 'center',
        paddingVertical: 8,
    },
    bubbleWrapper: {
        alignItems: 'flex-start',
        maxWidth: '80%',
    },
    bubbleWrapperMe: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    senderName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#718096',
        marginBottom: 2,
        marginLeft: 4,
    },
    bubble: {
        backgroundColor: '#F0F4FF',
        borderRadius: 14,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    bubbleMe: {
        backgroundColor: '#5B7FDB',
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 4,
    },
    bubbleText: {
        fontSize: 14,
        color: '#2D3748',
        lineHeight: 19,
    },
    bubbleTextMe: {
        color: '#FFF',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 6,
    },
    input: {
        flex: 1,
        backgroundColor: '#F7FAFC',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        fontSize: 14,
        color: '#2D3748',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        maxHeight: 40,
    },
    charCount: {
        fontSize: 11,
        color: '#A0AEC0',
        minWidth: 24,
        textAlign: 'center',
    },
    remaining: {
        fontSize: 11,
        color: '#A0AEC0',
        minWidth: 52,
        textAlign: 'center',
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#5B7FDB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: '#E2E8F0',
    },
    lockedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    lockedText: {
        flex: 1,
        fontSize: 12,
        color: '#A0AEC0',
    },
    lockedCta: {
        fontSize: 12,
        fontWeight: '700',
        color: '#5B7FDB',
    },
});
