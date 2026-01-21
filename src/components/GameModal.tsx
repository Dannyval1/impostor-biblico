import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface GameModalProps {
    visible: boolean;
    title: string;
    message: string;
    buttonText: string;
    onClose: () => void;
    type?: 'success' | 'danger' | 'info' | 'warning';
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
}

export const GameModal = ({
    visible,
    title,
    message,
    buttonText,
    onClose,
    type = 'info',
    secondaryButtonText,
    onSecondaryPress,
}: GameModalProps) => {
    const getIcon = () => {
        switch (type) {
            case 'success':
                return { name: 'checkmark-circle' as const, color: '#48BB78' };
            case 'danger':
                return { name: 'alert-circle' as const, color: '#E53E3E' };
            case 'warning':
                return { name: 'warning' as const, color: '#F6E05E' };
            case 'info':
            default:
                return { name: 'information-circle' as const, color: '#5B7FDB' };
        }
    };

    const icon = getIcon();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
                        <Ionicons name={icon.name} size={48} color={icon.color} />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {secondaryButtonText && (
                            <TouchableOpacity
                                style={[styles.button, styles.secondaryButton]}
                                onPress={onSecondaryPress}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.button,
                                { backgroundColor: icon.color },
                                secondaryButtonText ? styles.buttonHalf : { width: '100%' }
                            ]}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>{buttonText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContainer: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 30,
        width: '100%',
        maxWidth: width * 0.85,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A202C',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#4A5568',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    buttonContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonHalf: {
        flex: 1,
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: '#EDF2F7',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButtonText: {
        color: '#4A5568',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
