import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';

interface HowToPlayModalProps {
    visible: boolean;
    onClose: () => void;
}

export const HowToPlayModal = ({ visible, onClose }: HowToPlayModalProps) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'classic' | 'online'>('classic');

    useEffect(() => {
        if (!visible) setActiveTab('classic');
    }, [visible]);

    const classicSteps = [
        { icon: '⚙️', title: t.how_to_play_modal?.step1_title, desc: t.how_to_play_modal?.step1_desc },
        { icon: '🤫', title: t.how_to_play_modal?.step2_title, desc: t.how_to_play_modal?.step2_desc },
        { icon: '🗣️', title: t.how_to_play_modal?.step3_title, desc: t.how_to_play_modal?.step3_desc },
        { icon: '🗳️', title: t.how_to_play_modal?.step4_title, desc: t.how_to_play_modal?.step4_desc },
    ];

    const onlineSteps = [
        { icon: '🔗', title: t.how_to_play_modal?.online_step1_title, desc: t.how_to_play_modal?.online_step1_desc },
        { icon: '⚙️', title: t.how_to_play_modal?.online_step2_title, desc: t.how_to_play_modal?.online_step2_desc },
        { icon: '🤫', title: t.how_to_play_modal?.online_step3_title, desc: t.how_to_play_modal?.online_step3_desc },
        { icon: '🗳️', title: t.how_to_play_modal?.online_step4_title, desc: t.how_to_play_modal?.online_step4_desc },
    ];

    const steps = activeTab === 'classic' ? classicSteps : onlineSteps;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t.how_to_play_modal?.title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close-circle" size={32} color="#CBD5E0" />
                        </TouchableOpacity>
                    </View>

                    {/* Tab selector */}
                    <View style={styles.tabBar}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'classic' && styles.tabActive]}
                            onPress={() => setActiveTab('classic')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, activeTab === 'classic' && styles.tabTextActive]}>
                                {t.how_to_play_modal?.classic_tab}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'online' && styles.tabActive]}
                            onPress={() => setActiveTab('online')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, activeTab === 'online' && styles.tabTextActive]}>
                                {t.how_to_play_modal?.online_tab}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>

                        {steps.map((step, index) => (
                            <View key={index}>
                                <View style={styles.stepContainer}>
                                    <View style={styles.stepIconContainer}>
                                        <Text style={styles.stepIcon}>{step.icon}</Text>
                                    </View>
                                    <View style={styles.stepTextContainer}>
                                        <Text style={styles.stepTitle}>{step.title}</Text>
                                        <Text style={styles.stepDescription}>{step.desc}</Text>
                                    </View>
                                </View>
                                {index < steps.length - 1 && <View style={styles.connector} />}
                            </View>
                        ))}

                        <View style={styles.winConditions}>
                            <Text style={styles.winTitle}>{t.how_to_play_modal?.win_title}</Text>
                            <View style={styles.winRow}>
                                <Text style={styles.winIcon}>😇</Text>
                                <Text style={styles.winText}>
                                    {t.how_to_play_modal?.win_civilians_prefix}
                                    <Text style={{ fontWeight: 'bold', color: '#5B7FDB' }}>{t.how_to_play_modal?.win_civilians_bold}</Text>
                                    {t.how_to_play_modal?.win_civilians_suffix}
                                </Text>
                            </View>
                            <View style={styles.winRow}>
                                <Text style={styles.winIcon}>😈</Text>
                                <Text style={styles.winText}>
                                    {t.how_to_play_modal?.win_impostors_prefix}
                                    <Text style={{ fontWeight: 'bold', color: '#E53E3E' }}>{t.how_to_play_modal?.win_impostors_bold}</Text>
                                    {t.how_to_play_modal?.win_impostors_suffix}
                                </Text>
                            </View>
                        </View>

                    </ScrollView>

                    <TouchableOpacity style={styles.button} onPress={onClose}>
                        <Text style={styles.buttonText}>{t.how_to_play_modal?.got_it}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxHeight: '90%',
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2D3748',
    },
    closeButton: {
        padding: 4,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F7FAFC',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#A0AEC0',
    },
    tabTextActive: {
        color: '#2D3748',
    },
    content: {
        marginBottom: 20,
    },
    contentContainer: {
        paddingBottom: 4,
    },
    stepContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    stepIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F7FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    stepIcon: {
        fontSize: 24,
    },
    stepTextContainer: {
        flex: 1,
        paddingTop: 2,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: 4,
    },
    stepDescription: {
        fontSize: 14,
        color: '#718096',
        lineHeight: 20,
    },
    connector: {
        width: 2,
        height: 16,
        backgroundColor: '#E2E8F0',
        marginLeft: 24,
        marginVertical: 4,
    },
    winConditions: {
        backgroundColor: '#F7FAFC',
        borderRadius: 16,
        padding: 16,
        marginTop: 20,
    },
    winTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: 12,
        textAlign: 'center',
    },
    winRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    winIcon: {
        fontSize: 20,
        marginRight: 10,
    },
    winText: {
        fontSize: 14,
        color: '#4A5568',
        flex: 1,
    },
    button: {
        backgroundColor: '#5B7FDB',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
