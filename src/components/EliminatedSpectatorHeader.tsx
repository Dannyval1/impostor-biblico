import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type EliminatedSpectatorHeaderProps = {
    /** Ej. ELIMINADO / ELIMINATED */
    title: string;
    /** Franja amarilla: ej. MODO ESPECTADOR */
    bannerLabel: string;
};

/**
 * Encabezado fijo: título rojo encima de la franja amarilla "modo espectador".
 * No intercepta toques (layout normal; la interacción sigue en el contenido debajo).
 */
export function EliminatedSpectatorHeader({ title, bannerLabel }: EliminatedSpectatorHeaderProps) {
    return (
        <View style={styles.wrap}>
            <Text
                style={styles.eliminatedTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
            >
                {title}
            </Text>
            <View style={styles.banner}>
                <Text style={styles.bannerText}>{bannerLabel}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: '100%',
        paddingTop: 4,
    },
    eliminatedTitle: {
        fontSize: 36,
        fontWeight: '900',
        color: 'rgba(229, 62, 62, 0.95)',
        textAlign: 'center',
        letterSpacing: 3,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0, 0, 0, 0.45)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
        paddingHorizontal: 12,
        paddingBottom: 6,
    },
    banner: {
        backgroundColor: 'rgba(45, 55, 72, 0.95)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(246, 224, 94, 0.25)',
    },
    bannerText: {
        color: '#F6E05E',
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 0.8,
    },
});
