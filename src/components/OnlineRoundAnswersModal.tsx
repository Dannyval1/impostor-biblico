import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVATAR_ASSETS } from '../utils/avatarAssets';
import { RoundAnswerEntry } from '../utils/onlineRoundAnswers';

type Props = {
    visible: boolean;
    onClose: () => void;
    title: string;
    emptyLabel: string;
    entries: RoundAnswerEntry[];
};

export function OnlineRoundAnswersModal({ visible, onClose, title, emptyLabel, entries }: Props) {
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button">
                            <Ionicons name="close" size={26} color="#E2E8F0" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
                        {entries.length === 0 ? (
                            <Text style={styles.empty}>{emptyLabel}</Text>
                        ) : (
                            entries.map(e => (
                                <View key={e.playerId} style={styles.row}>
                                    <Image source={AVATAR_ASSETS[e.avatar]} style={styles.avatar} />
                                    <View style={styles.rowText}>
                                        <Text style={styles.name}>{e.name}</Text>
                                        <Text style={styles.clue}>"{e.clue}"</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#1A202C',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '78%',
        paddingBottom: 28,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    title: {
        color: '#F7FAFC',
        fontSize: 18,
        fontWeight: '800',
        flex: 1,
        paddingRight: 12,
    },
    list: {
        padding: 20,
        paddingBottom: 8,
    },
    empty: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 24,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    rowText: { flex: 1 },
    name: {
        color: '#A0AEC0',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4,
    },
    clue: {
        color: '#F7FAFC',
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
    },
});
