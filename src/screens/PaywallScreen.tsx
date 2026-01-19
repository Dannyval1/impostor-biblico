import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    StatusBar,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTranslation } from '../hooks/useTranslation';
import { ScaleButton } from '../components/ScaleButton';
import { useGame } from '../context/GameContext';

type PaywallScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Paywall'>;
};

export default function PaywallScreen({ navigation }: PaywallScreenProps) {
    const { t } = useTranslation();
    const { playClick } = useGame();
    const [isLoading, setIsLoading] = useState(false);

    const handleBuy = async () => {
        playClick();
        setIsLoading(true);

        // Simulation of purchase delay
        setTimeout(() => {
            setIsLoading(false);
            Alert.alert(
                t.paywall.error_title,
                t.paywall.error_message + ' (Mock: Payment not implemented)',
                [{ text: 'OK' }]
            );
        }, 1500);
    };

    const handleRestore = () => {
        playClick();
        Alert.alert('Restore', 'Mock: Restore functionality checked.');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Background Image */}
            <Image
                source={require('../../assets/impostor_home_x.webp')}
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            <View style={styles.overlay} />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => {
                            playClick();
                            navigation.goBack();
                        }}
                    >
                        <Ionicons name="close-circle" size={36} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="diamond" size={50} color="#FFD700" />
                    </View>

                    <Text style={styles.title}>{t.paywall.title}</Text>
                    <Text style={styles.subtitle}>{t.paywall.subtitle}</Text>

                    <View style={styles.featuresContainer}>
                        {t.paywall.sections.map((section: any, sectionIndex: number) => (
                            <View key={sectionIndex} style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                                {section.items.map((item: string, itemIndex: number) => (
                                    <View key={itemIndex} style={styles.featureRow}>
                                        <Text style={styles.featureText}>{item}</Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>

                    <View style={styles.spacer} />

                    <ScaleButton
                        style={styles.buyButton}
                        onPress={handleBuy}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.buyButtonText}>{t.paywall.buy_now}</Text>
                        )}
                    </ScaleButton>

                    <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
                        <Text style={styles.restoreButtonText}>{t.paywall.restore}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1A202C',
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        alignItems: 'flex-end',
    },
    closeButton: {
        padding: 5,
    },
    content: {
        padding: 24,
        alignItems: 'center',
        flexGrow: 1,
    },
    iconContainer: {
        marginTop: -20,
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 30,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 0,
    },
    subtitle: {
        fontSize: 16,
        color: '#CBD5E0',
        textAlign: 'center',
        marginBottom: 10,
    },
    featuresContainer: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 24,
    },
    sectionContainer: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#FFD700',
        marginBottom: 8,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        marginLeft: 8,
    },
    featureText: {
        fontSize: 16,
        color: '#FFF',
        marginLeft: 8,
        fontWeight: '400',
    },
    spacer: {
        flex: 1,
    },
    buyButton: {
        backgroundColor: '#FFD700',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buyButtonText: {
        color: '#1A202C',
        fontSize: 20,
        fontWeight: 'bold',
    },
    restoreButton: {
        padding: 12,
    },
    restoreButtonText: {
        color: '#A0AEC0',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
