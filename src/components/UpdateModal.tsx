import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Linking,
    Platform,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VersionCheck from 'react-native-version-check-expo';
import { useTranslation } from '../hooks/useTranslation';

// ⚠️ TESTING: set to true to always show the update modal in dev
// 🔴 Set to false before publishing!
const FORCE_SHOW_FOR_TESTING = false;

interface UpdateModalProps {
    /** Delay in ms before checking (let the app finish loading first) */
    delayMs?: number;
}

export function UpdateModal({ delayMs = 3000 }: UpdateModalProps) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [storeUrl, setStoreUrl] = useState('');
    const scaleAnim = React.useRef(new Animated.Value(0.85)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                if (FORCE_SHOW_FOR_TESTING) {
                    // In dev: always show the modal so you can test the UI
                    setStoreUrl('');
                    setVisible(true);
                    Animated.parallel([
                        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 8 }),
                        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
                    ]).start();
                    return;
                }

                const result = await VersionCheck.needUpdate();
                if (result?.isNeeded) {
                    setStoreUrl(result.storeUrl ?? '');
                    setVisible(true);
                    Animated.parallel([
                        Animated.spring(scaleAnim, {
                            toValue: 1,
                            useNativeDriver: true,
                            tension: 65,
                            friction: 8,
                        }),
                        Animated.timing(opacityAnim, {
                            toValue: 1,
                            duration: 250,
                            useNativeDriver: true,
                        }),
                    ]).start();
                }
            } catch (e) {
                // Silently ignore — version check is non-critical
                console.log('[UpdateModal] version check error:', e);
            }
        }, delayMs);

        return () => clearTimeout(timer);
    }, []);

    const handleUpdate = async () => {
        if (!storeUrl) {
            // Fallback URLs
            const fallback = Platform.OS === 'ios'
                ? 'https://apps.apple.com/app/id6758225650'
                : 'https://play.google.com/store/apps/details?id=com.dannyv12.impostorbiblico';
            await Linking.openURL(fallback);
        } else {
            await Linking.openURL(storeUrl);
        }
        setVisible(false);
    };

    const handleLater = () => {
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleLater}>
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.card,
                        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
                    ]}
                >
                    {/* Icon */}
                    <View style={styles.iconWrapper}>
                        <Ionicons name="rocket" size={36} color="#5B7FDB" />
                    </View>

                    {/* Text */}
                    <Text style={styles.title}>{t.update_modal.title}</Text>
                    <Text style={styles.subtitle}>
                        {t.update_modal.subtitle}
                    </Text>

                    {/* Buttons */}
                    <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} activeOpacity={0.85}>
                        <Ionicons name="download-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.updateBtnText}>{t.update_modal.update_btn}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.laterBtn} onPress={handleLater} activeOpacity={0.7}>
                        <Text style={styles.laterBtnText}>{t.update_modal.later_btn}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    card: {
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
        borderWidth: 2,
        borderColor: '#C7D2FE',
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
    updateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#5B7FDB',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        marginBottom: 10,
        shadowColor: '#5B7FDB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    updateBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    laterBtn: {
        paddingVertical: 10,
        width: '100%',
        alignItems: 'center',
    },
    laterBtnText: {
        fontSize: 14,
        color: '#A0AEC0',
        fontWeight: '500',
    },
});
