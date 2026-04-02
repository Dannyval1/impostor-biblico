import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Pantalla de transición cuando la sala aún no cargó o acaba de cerrarse.
 * Evita pantalla en blanco y errores de render si `gameState.room` es null
 * (p. ej. mientras el modal de sala cerrada está visible).
 */
export function OnlineRoomPlaceholder() {
    const { t } = useTranslation();
    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.inner}>
                <ActivityIndicator size="large" color="#A0AEC0" />
                <Text style={styles.label}>{t.home.loading}</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#1A202C',
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    label: {
        marginTop: 16,
        fontSize: 15,
        color: '#A0AEC0',
        textAlign: 'center',
    },
});
