import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../context/GameContext';

type AdScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Ad'>;
};

const { width } = Dimensions.get('window');

export default function AdScreen({ navigation }: AdScreenProps) {
    const [timeLeft, setTimeLeft] = useState(5);
    const { playClick, playSuccess, resetGamesPlayed } = useGame();

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    playSuccess();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleClose = () => {
        if (timeLeft > 0) return;
        playClick();
        if (resetGamesPlayed) {
            resetGamesPlayed();
        }
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Ionicons name="gift-outline" size={80} color="#5B7FDB" />
                <Text style={styles.title}>Anuncio Patrocinado</Text>
                <Text style={styles.subtitle}>
                    Gracias por apoyar Impostor Bíblico.
                </Text>

                <View style={styles.adPlaceholder}>
                    <Text style={styles.adText}>SIMULACIÓN DE ANUNCIO</Text>
                    <Text style={styles.adSubtext}>Aquí iría un video de AdMob/Unity Ads</Text>
                </View>

                {timeLeft > 0 ? (
                    <Text style={styles.timer}>El botón aparecerá en {timeLeft}s</Text>
                ) : (
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                        <Text style={styles.closeButtonText}>Cerrar y Continuar</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2D3748',
        marginTop: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#718096',
        textAlign: 'center',
        marginBottom: 40,
    },
    adPlaceholder: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#2D3748',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    adText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    adSubtext: {
        color: '#A0AEC0',
        fontSize: 14,
    },
    timer: {
        fontSize: 16,
        color: '#718096',
        fontWeight: '600',
    },
    closeButton: {
        backgroundColor: '#48BB78',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#48BB78',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    closeButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 8,
    },
});
