import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Switch,
    Share,
    Linking,
    Platform,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../context/GameContext';
import { useTranslation } from '../hooks/useTranslation';

type SettingsModalProps = {
    visible: boolean;
    onClose: () => void;
};

const { width } = Dimensions.get('window');
const APP_VERSION = '1.0.0';

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
    const { state, toggleMusic, toggleSounds, setLanguage, playClick } = useGame();
    const { t } = useTranslation();

    const handleShare = async () => {
        playClick();
        try {
            await Share.share({
                message: t.home.share_message,
                url: 'https://impostorbíblico.com', // Replace with real URL
            });
        } catch (error) {
            console.log(error);
        }
    };

    const handleRateUs = () => {
        playClick();
        const url = Platform.OS === 'ios'
            ? 'itms-apps://itunes.apple.com/app/idYOUR_APP_ID'
            : 'market://details?id=YOUR_PACKAGE_NAME';

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Linking.openURL('https://play.google.com/store/apps/details?id=YOUR_PACKAGE_NAME');
            }
        });
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t.settings.title}</Text>
                        <TouchableOpacity onPress={() => {
                            playClick();
                            onClose();
                        }}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLabelContainer}>
                            <Ionicons name="musical-notes-outline" size={24} color="#5B7FDB" />
                            <Text style={styles.settingLabel}>{t.settings.music}</Text>
                        </View>
                        <Switch
                            value={state.settings.musicEnabled}
                            onValueChange={toggleMusic}
                            trackColor={{ false: '#CBD5E0', true: '#5B7FDB' }}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLabelContainer}>
                            <Ionicons name="volume-medium-outline" size={24} color="#5B7FDB" />
                            <Text style={styles.settingLabel}>{t.settings.effects}</Text>
                        </View>
                        <Switch
                            value={state.settings.soundsEnabled}
                            onValueChange={toggleSounds}
                            trackColor={{ false: '#CBD5E0', true: '#5B7FDB' }}
                        />
                    </View>

                    <View style={styles.settingItemCol}>
                        <View style={styles.settingLabelContainer}>
                            <Ionicons name="language-outline" size={24} color="#5B7FDB" />
                            <Text style={styles.settingLabel}>{t.settings.language}</Text>
                        </View>
                        <View style={styles.langSelector}>
                            <TouchableOpacity
                                style={[styles.langOption, state.settings.language === 'es' && styles.langOptionSelected]}
                                onPress={() => {
                                    playClick();
                                    setLanguage('es');
                                }}
                            >
                                <Text style={[styles.langText, state.settings.language === 'es' && styles.langTextSelected]}>🇪🇸 {t.settings.spanish}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.langOption, state.settings.language === 'en' && styles.langOptionSelected]}
                                onPress={() => {
                                    playClick();
                                    setLanguage('en');
                                }}
                            >
                                <Text style={[styles.langText, state.settings.language === 'en' && styles.langTextSelected]}>🇺🇸 {t.settings.english}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.actionItem} onPress={handleRateUs}>
                        <Ionicons name="star-outline" size={22} color="#4A5568" />
                        <Text style={styles.actionText}>{t.settings.rate_us}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
                        <Ionicons name="share-social-outline" size={22} color="#4A5568" />
                        <Text style={styles.actionText}>{t.settings.share_friends}</Text>
                    </TouchableOpacity>

                    <View style={{ marginTop: 20, alignItems: 'center' }}>
                        <Text style={styles.versionTextModal}>{t.home.version} {APP_VERSION}</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
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
