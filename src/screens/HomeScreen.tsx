import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Animated,
    Dimensions,
    Platform,
    Share,
    Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGame } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';
import { usePurchase } from '../context/PurchaseContext';
import { Ionicons } from '@expo/vector-icons';
import { SettingsModal } from '../components/SettingsModal';
import { HowToPlayModal } from '../components/HowToPlayModal';
import { UpdateModal } from '../components/UpdateModal';
import { hasSeenPlayHint, markPlayHintSeen } from '../utils/storage';

type HomeScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const { height, width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: HomeScreenProps) {
    const insets = useSafeAreaInsets();
    const { state, setHasLoaded, playClick, playIntro } = useGame();
    const { t } = useTranslation();
    const { isPremium } = usePurchase();
    const [isLoading, setIsLoading] = useState(!state.hasLoaded);
    const [showSettings, setShowSettings] = useState(false);
    const [showHowToPlay, setShowHowToPlay] = useState(false);
    const [showModeMenu, setShowModeMenu] = useState(false);
    const [hasSeenHint, setHasSeenHint] = useState(false);
    const [subtitleText, setSubtitleText] = useState('');
    const [showCursor, setShowCursor] = useState(true);
    const subtitleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const slideAnim = useRef(new Animated.Value(state.hasLoaded ? 0 : height)).current;
    const fadeAnim = useRef(new Animated.Value(state.hasLoaded ? 0 : 1)).current;
    const progressAnim = useRef(new Animated.Value(state.hasLoaded ? 1 : 0)).current;
    const bubble1Anim = useRef(new Animated.Value(0)).current;
    const bubble2Anim = useRef(new Animated.Value(0)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;
    const centerBtnAnim = useRef(new Animated.Value(0)).current;
    const arrowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (state.hasLoaded) {
            setIsLoading(false);
            return;
        }

        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
        }).start(() => {
            playIntro();

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

    useEffect(() => {
        hasSeenPlayHint().then(seen => { if (seen) setHasSeenHint(true); });
    }, []);

    useEffect(() => {
        if (isLoading || hasSeenHint) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(arrowAnim, { toValue: -8, duration: 380, useNativeDriver: true }),
                Animated.timing(arrowAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isLoading, hasSeenHint]);

    // Cursor blink
    useEffect(() => {
        const blink = setInterval(() => setShowCursor(c => !c), 530);
        return () => clearInterval(blink);
    }, []);

    // Typewriter loop
    useEffect(() => {
        if (isLoading) return;
        const phrases = t.home.play_subtitles;
        let phraseIdx = 0;
        let charIdx = 0;
        let phase: 'typing' | 'pause' | 'deleting' = 'typing';

        const tick = () => {
            if (phase === 'typing') {
                charIdx++;
                setSubtitleText(phrases[phraseIdx].slice(0, charIdx));
                if (charIdx >= phrases[phraseIdx].length) {
                    phase = 'pause';
                    subtitleTimerRef.current = setTimeout(tick, 2400);
                } else {
                    subtitleTimerRef.current = setTimeout(tick, 58);
                }
            } else if (phase === 'pause') {
                phase = 'deleting';
                subtitleTimerRef.current = setTimeout(tick, 0);
            } else {
                charIdx--;
                setSubtitleText(phrases[phraseIdx].slice(0, Math.max(0, charIdx)));
                if (charIdx <= 0) {
                    phraseIdx = (phraseIdx + 1) % phrases.length;
                    phase = 'typing';
                    subtitleTimerRef.current = setTimeout(tick, 350);
                } else {
                    subtitleTimerRef.current = setTimeout(tick, 32);
                }
            }
        };

        subtitleTimerRef.current = setTimeout(tick, 900);
        return () => {
            if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current);
        };
    }, [isLoading]);

    const handleShare = async () => {
        playClick();
        try {
            const url = Platform.OS === 'ios'
                ? 'https://apps.apple.com/app/id6758225650'
                : 'https://play.google.com/store/apps/details?id=com.dannyv12.impostorbiblico';

            const message = Platform.OS === 'ios'
                ? t.home.share_message
                : `${t.home.share_message} ${url}`;

            await Share.share({
                message: message,
                url: Platform.OS === 'ios' ? url : undefined,
            });
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    const handlePlayPress = () => {
        playClick();
        if (!hasSeenHint) {
            setHasSeenHint(true);
            markPlayHintSeen();
        }
        if (showModeMenu) {
            Animated.parallel([
                Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(bubble1Anim, { toValue: 0, duration: 160, useNativeDriver: true }),
                Animated.timing(bubble2Anim, { toValue: 0, duration: 160, useNativeDriver: true }),
                Animated.timing(centerBtnAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start(() => setShowModeMenu(false));
        } else {
            setShowModeMenu(true);
            Animated.parallel([
                Animated.spring(overlayAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 0 }),
                Animated.spring(bubble1Anim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 10 }),
                Animated.spring(bubble2Anim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
                Animated.spring(centerBtnAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }),
            ]).start();
        }
    };

    const handleModeSelect = (mode: 'classic' | 'online') => {
        playClick();
        Animated.parallel([
            Animated.timing(overlayAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(bubble1Anim, { toValue: 0, duration: 120, useNativeDriver: true }),
            Animated.timing(bubble2Anim, { toValue: 0, duration: 120, useNativeDriver: true }),
            Animated.timing(centerBtnAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start(() => {
            setShowModeMenu(false);
            navigation.navigate(mode === 'classic' ? 'Setup' : 'OnlineLobby');
        });
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

    const bubble1TranslateY = bubble1Anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
    const bubble2TranslateY = bubble2Anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
    const centerBtnRotate = centerBtnAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] });

    const tabBarBottom = Math.max(insets.bottom, 16) + 16;
    const centerBtnBottom = tabBarBottom + 64 - 30 + 30;
    const bubblesBottom = centerBtnBottom + 62 + 16;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={styles.imageContainer}>
                <Animated.Image
                    source={require('../../assets/impostor_home_x.webp')}
                    style={[styles.heroImage, { transform: [{ translateY: imageTranslateY }] }]}
                    resizeMode="cover"
                />
                <View style={styles.overlay} />

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

            </View>

            {/* White bottom panel */}
            <Animated.View style={[styles.bottomPanel, { transform: [{ translateY: slideAnim }] }]}>
                <Svg
                    style={styles.waveContainer}
                    viewBox="0 0 1440 54"
                    preserveAspectRatio="none"
                >
                    <Path
                        d="M0,40 C200,40 260,8 480,8 C700,8 740,40 720,40 C700,40 740,8 960,8 C1180,8 1240,40 1440,40 L1440,54 L0,54 Z"
                        fill="#FFFFFF"
                    />
                </Svg>
                <View style={styles.panelContent}>
                    <Text style={styles.welcomeLabel}>{t.home.welcome_label}</Text>
                    <Text style={styles.playCta}>{t.home.play_cta}</Text>
                    <Text style={styles.playSubtitle}>
                        {subtitleText}
                        <Text style={{ opacity: showCursor ? 1 : 0 }}>|</Text>
                    </Text>
                </View>
            </Animated.View>

            {/* Dim overlay — tap to close mode menu */}
            <Animated.View
                pointerEvents={showModeMenu ? 'auto' : 'none'}
                style={[StyleSheet.absoluteFill, styles.menuOverlay, { opacity: overlayAnim }]}
            >
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handlePlayPress} />
            </Animated.View>

            {/* Mode selection bubbles */}
            <Animated.View
                pointerEvents={showModeMenu ? 'auto' : 'none'}
                style={[styles.modeBubblesRow, { bottom: bubblesBottom, opacity: overlayAnim }]}
            >
                <Animated.View style={{ flex: 1, transform: [{ translateY: bubble1TranslateY }] }}>
                    <TouchableOpacity style={styles.modeBubbleWrapper} activeOpacity={0.85} onPress={() => handleModeSelect('classic')}>
                        <View style={styles.modeBubble}>
                            <Text style={styles.modeBubbleTitle}>{t.setup.classic}</Text>
                            <View style={styles.modeCardTag}>
                                <Text style={styles.modeCardTagText}>{t.home.classic_tag}</Text>
                            </View>
                            <Text style={styles.modeBubbleDesc}>{t.setup.classic_desc}</Text>
                        </View>
                        <View style={styles.modeBubbleIconWrap}>
                            <Image source={require('../../assets/mode_1.png')} style={styles.modeBubbleImage} resizeMode="contain" />
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View style={{ flex: 1, transform: [{ translateY: bubble2TranslateY }] }}>
                    <TouchableOpacity style={styles.modeBubbleWrapper} activeOpacity={0.85} onPress={() => handleModeSelect('online')}>
                        <View style={styles.modeBubble}>
                            <Text style={styles.modeBubbleTitle}>{t.setup.online}</Text>
                            <View style={[styles.modeCardTag, styles.modeCardTagOnline]}>
                                <Text style={[styles.modeCardTagText, styles.modeCardTagTextOnline]}>{t.home.online_tag}</Text>
                            </View>
                            <Text style={styles.modeBubbleDesc}>{t.setup.online_desc}</Text>
                        </View>
                        <View style={styles.modeBubbleIconWrap}>
                            <Image source={require('../../assets/mode_2.png')} style={styles.modeBubbleImage} resizeMode="contain" />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>

            {/* Bouncing arrow hint */}
            {!isLoading && !hasSeenHint && (
                <Animated.View
                    style={[
                        styles.arrowHint,
                        {
                            bottom: centerBtnBottom + 62 - 45,
                            transform: [{ translateY: arrowAnim }],
                        },
                    ]}
                    pointerEvents="none"
                >
                    <Ionicons name="chevron-down" size={20} color="rgba(0,0,0,0.3)" />
                    <Ionicons name="chevron-down" size={20} color="rgba(0,0,0,0.18)" style={{ marginTop: -10 }} />
                </Animated.View>
            )}

            {/* Bottom tab bar */}
            <Animated.View
                style={[styles.tabBarContainer, { paddingBottom: tabBarBottom, transform: [{ translateY: slideAnim }] }]}
            >
                <View style={styles.tabBarPill}>
                    <TouchableOpacity style={styles.tabItem} activeOpacity={0.7} onPress={() => { playClick(); setShowSettings(true); }}>
                        <Ionicons name="settings-outline" size={23} color="rgba(0,0,0,0.5)" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabItem} activeOpacity={0.7} onPress={handleShare}>
                        <Ionicons name="share-social-outline" size={23} color="rgba(0,0,0,0.5)" />
                    </TouchableOpacity>
                    <View style={styles.tabCenterSpace} />
                    <TouchableOpacity style={styles.tabItem} activeOpacity={0.7} onPress={() => { playClick(); setShowHowToPlay(true); }}>
                        <Ionicons name="help-outline" size={23} color="rgba(0,0,0,0.5)" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabItem} activeOpacity={0.7} onPress={() => { playClick(); navigation.navigate('Paywall'); }}>
                        <Ionicons name="star-outline" size={23} color="rgba(0,0,0,0.5)" />
                    </TouchableOpacity>
                </View>

                {/* Center play button */}
                <View style={[styles.centerPlayBtnWrapper, { bottom: centerBtnBottom - tabBarBottom }]}>
                    <TouchableOpacity activeOpacity={0.9} onPress={handlePlayPress}>
                        <Animated.View style={[styles.centerPlayButton, { transform: [{ rotate: centerBtnRotate }] }]}>
                            <Ionicons name="add" size={32} color="#FFF" />
                        </Animated.View>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <SettingsModal
                visible={showSettings}
                onClose={() => setShowSettings(false)}
            />

            <HowToPlayModal
                visible={showHowToPlay}
                onClose={() => setShowHowToPlay(false)}
            />

            {/* Version update checker — shown 3s after load */}
            {!isLoading && <UpdateModal delayMs={3000} />}
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
        height: '120%',
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
    arrowHint: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 15,
    },
    bottomPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '32%',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
        zIndex: 5,
        overflow: 'visible',
    },
    waveContainer: {
        position: 'absolute',
        top: -46,
        left: 0,
        right: 0,
        width: '100%',
        height: 50,
    },
    panelContent: {
        flex: 1,
        paddingTop: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    welcomeLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#B7791F',
        letterSpacing: 2.5,
        marginBottom: 6,
        textAlign: 'center',
    },
    playCta: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1A202C',
        textAlign: 'center',
    },
    playSubtitle: {
        fontSize: 13,
        color: '#718096',
        textAlign: 'center',
        marginTop: 4,
    },
    menuOverlay: {
        backgroundColor: 'rgba(0,0,0,0.55)',
        zIndex: 20,
    },
    modeBubblesRow: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        gap: 12,
        zIndex: 30,
        overflow: 'visible',
    },
    modeBubbleWrapper: {
        flex: 1,
        paddingTop: 38,
        overflow: 'visible',
    },
    modeBubble: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        paddingTop: 44,
        paddingHorizontal: 14,
        paddingBottom: 18,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    modeBubbleIconWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1,
    },
    modeBubbleImage: {
        width: 76,
        height: 76,
    },
    modeBubbleTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1A202C',
        marginBottom: 6,
    },
    modeBubbleDesc: {
        fontSize: 11,
        color: '#718096',
        lineHeight: 15,
        textAlign: 'center',
        marginTop: 6,
    },
    modeCardTag: {
        backgroundColor: '#EBF8FF',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: '#90CDF4',
    },
    modeCardTagOnline: {
        backgroundColor: '#FFF5F5',
        borderColor: '#FC8181',
    },
    modeCardTagText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#2B6CB0',
        letterSpacing: 0.3,
    },
    modeCardTagTextOnline: {
        color: '#C53030',
    },
    tabBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        alignItems: 'center',
        zIndex: 10,
    },
    tabBarPill: {
        width: '100%',
        height: 64,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderRadius: 32,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 10,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    tabCenterSpace: {
        width: 70,
    },
    centerPlayBtnWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    centerPlayButton: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#2C2416',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 12,
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