import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    StatusBar,
    Animated,
    Dimensions,
    Platform,
    Share
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGame } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { SettingsModal } from '../components/SettingsModal';
import { ScaleButton } from '../components/ScaleButton';

type HomeScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const { height, width } = Dimensions.get('window');

// APP VERSION
const APP_VERSION = '1.0.0';

export default function HomeScreen({ navigation }: HomeScreenProps) {
    const { state, setHasLoaded, playClick, playIntro } = useGame();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(!state.hasLoaded);
    const [showSettings, setShowSettings] = useState(false);

    // Animations
    const slideAnim = useRef(new Animated.Value(state.hasLoaded ? 0 : height)).current; // 0 if loaded, height if not
    const fadeAnim = useRef(new Animated.Value(state.hasLoaded ? 0 : 1)).current; // 0 if loaded, 1 if not
    const progressAnim = useRef(new Animated.Value(state.hasLoaded ? 1 : 0)).current; // 1 if loaded, 0 if not

    useEffect(() => {
        if (state.hasLoaded) {
            setIsLoading(false);
            return;
        }

        // 1. Animate Progress Bar (3 seconds)
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
        }).start(() => {
            // Play sound immediately when loading finishes
            playIntro();

            // 2. On Finish: Fade out loading bar & Slide up Bottom Sheet
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setIsLoading(false);
                setHasLoaded();
            });
        });
    }, [state.hasLoaded]);


    // Share and Rate functions removed as they are now in SettingsModal or handled there
    const handleShare = async () => {
        playClick();
        try {
            await Share.share({
                message: t.home.share_message,
                url: 'https://impostorbíblico.com',
            });
        } catch (error) {
            console.log(error);
        }
    };

    const widthInterpolate = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const imageTranslateY = slideAnim.interpolate({
        inputRange: [0, height * 0.4],
        outputRange: [-80, 0],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Top Image Section */}
            <View style={styles.imageContainer}>
                <Animated.Image
                    source={require('../../assets/impostor_home_x.webp')}
                    style={[styles.heroImage, { transform: [{ translateY: imageTranslateY }] }]}
                    resizeMode="cover"
                />
                <View style={styles.overlay} />

                {/* Logo */}
                <Animated.Image
                    source={
                        state.settings.language === 'en'
                            ? require('../../assets/logo_en.png')
                            : require('../../assets/logo_es.png')
                    }
                    style={[styles.logo, { opacity: fadeAnim }]}
                    resizeMode="contain"
                />

                {/* Loading Bar */}
                <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
                    <Text style={styles.loadingText}>{t.home.loading}</Text>
                    <View style={styles.progressBarBackground}>
                        <Animated.View style={[styles.progressBarFill, { width: widthInterpolate }]} />
                    </View>
                </Animated.View>

                {/* Settings Button */}
                {!isLoading && (
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => setShowSettings(true)}
                    >
                        <Ionicons name="settings-outline" size={28} color="#FFF" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Bottom Content Section */}
            <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.waveContainer}>
                    <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
                        <Path
                            fill="#FFFFFF"
                            d="M0,160L80,144C160,128,320,96,480,106.7C640,117,800,171,960,181.3C1120,192,1280,160,1360,144L1440,128L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
                        />
                    </Svg>
                </View>

                <View style={styles.sheetContent}>
                    <Text style={styles.title}>{t.home.title}</Text>
                    <Text style={styles.subtitle}>{t.home.subtitle}</Text>

                    <ScaleButton
                        style={styles.primaryButton}
                        onPress={() => {
                            console.log('JUGAR pressed');
                            playClick();
                            navigation.navigate('Setup');
                        }}
                    >
                        <Text style={styles.primaryButtonText}>{t.home.play}</Text>
                    </ScaleButton>

                    <View style={styles.secondaryButtonsRow}>
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            activeOpacity={0.7}
                            onPress={() => {
                                playClick();
                                setShowSettings(true);
                            }}
                        >
                            <Text style={styles.secondaryButtonIcon}>⚙️</Text>
                            <Text style={styles.secondaryButtonText}>{t.home.settings}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            activeOpacity={0.7}
                            onPress={handleShare}
                        >
                            <Text style={styles.secondaryButtonIcon}>📢</Text>
                            <Text style={styles.secondaryButtonText}>{t.home.share}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.versionText}>{t.home.version} {APP_VERSION}</Text>
                </View>
            </Animated.View>

            {/* Settings Modal */}
            <SettingsModal
                visible={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1E1E1E',
    },
    imageContainer: {
        height: '100%',
        width: '100%',
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '115%',
        top: -140,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    logo: {
        position: 'absolute',
        top: '2%',
        alignSelf: 'center',
        width: 320,
        height: 320,
        zIndex: 2,
    },
    loadingContainer: {
        position: 'absolute',
        bottom: 80,
        width: '80%',
        alignSelf: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 16,
        marginBottom: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    progressBarBackground: {
        height: 18,
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 4,
        borderWidth: 2,
        borderColor: '#fdf6cd',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#fdf6cd',
        borderRadius: 10,
    },
    settingsButton: {
        position: 'absolute',
        top: '6%',
        right: '6%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 30,
        zIndex: 20,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '38%',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 15,
        zIndex: 10,
    },
    waveContainer: {
        position: 'absolute',
        top: -50,
        left: 0,
        right: 0,
        width: '100%',
        height: 52,
        zIndex: 1,
    },
    sheetContent: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 10,
        paddingHorizontal: 30,
        backgroundColor: '#FFFFFF',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#2D3748',
        marginBottom: 4,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#718096',
        marginBottom: 24,
        textAlign: 'center',
    },
    primaryButton: {
        backgroundColor: '#fdf6cd',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 3,
        borderColor: '#000',
        // Neubrutalism shadow
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 8,
    },
    primaryButtonText: {
        color: '#000',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 2,
    },
    secondaryButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 16,
        marginBottom: 0,
    },
    secondaryButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        backgroundColor: '#F7FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    secondaryButtonIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    secondaryButtonText: {
        color: '#4A5568',
        fontSize: 14,
        fontWeight: '600',
    },
    versionText: {
        fontSize: 12,
        color: '#A0AEC0',
        marginTop: 'auto',
        marginBottom: 10,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: width * 0.85,
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2D3748',
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    settingItemCol: {
        marginBottom: 20,
    },
    settingLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4A5568',
        marginLeft: 12,
    },
    langSelector: {
        flexDirection: 'row',
        backgroundColor: '#F7FAFC',
        borderRadius: 12,
        padding: 4,
        marginTop: 12,
    },
    langOption: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    langOptionSelected: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    langText: {
        fontSize: 14,
        color: '#718096',
        fontWeight: '600',
    },
    langTextSelected: {
        color: '#5B7FDB',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 12,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    actionText: {
        fontSize: 16,
        color: '#4A5568',
        fontWeight: '500',
        marginLeft: 12,
    },
    versionTextModal: {
        fontSize: 12,
        color: '#CBD5E0',
    },
});