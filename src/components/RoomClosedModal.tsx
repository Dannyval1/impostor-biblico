import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnlineGame } from '../context/OnlineGameContext';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';

export function RoomClosedModal() {
    const { roomClosed, clearRoomClosed } = useOnlineGame();
    const navigation = useNavigation<any>();
    const { t } = useTranslation();

    const handleDismiss = () => {
        clearRoomClosed();
        navigation.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] })
        );
    };

    return (
        <Modal visible={roomClosed} transparent animationType="fade" onRequestClose={handleDismiss}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.iconWrapper}>
                        <Ionicons name="log-out-outline" size={36} color="#E53E3E" />
                    </View>
                    <Text style={styles.title}>{t.online.errors.room_closed}</Text>
                    <Text style={styles.subtitle}>{t.online.errors.room_closed_desc}</Text>
                    <TouchableOpacity style={styles.button} onPress={handleDismiss} activeOpacity={0.85}>
                        <Text style={styles.buttonText}>{t.ok || 'OK'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 28,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 16,
    },
    iconWrapper: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFF5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
        borderWidth: 2,
        borderColor: '#FED7D7',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A202C',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#718096',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    button: {
        backgroundColor: '#E53E3E',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
