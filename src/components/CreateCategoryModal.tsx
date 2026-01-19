import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../context/GameContext';
import { CustomCategory } from '../types';
import { useTranslation } from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

type CreateCategoryModalProps = {
    visible: boolean;
    onClose: () => void;
};

export function CreateCategoryModal({ visible, onClose }: CreateCategoryModalProps) {
    const { addCustomCategory, playClick, playSuccess, playFailure, state } = useGame();
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [currentWord, setCurrentWord] = useState('');
    const [words, setWords] = useState<string[]>([]);

    const handleAddWord = () => {
        if (!currentWord.trim()) return;

        playClick();
        if (words.includes(currentWord.trim())) {
            Alert.alert(t.custom_category.error_title, t.custom_category.error_duplicate);
            return;
        }

        setWords([...words, currentWord.trim()]);
        setCurrentWord('');
    };

    const handleRemoveWord = (wordToRemove: string) => {
        playClick();
        setWords(words.filter(w => w !== wordToRemove));
    };

    const handleSave = () => {
        if (!name.trim()) {
            playFailure();
            Alert.alert(t.custom_category.error_title, t.custom_category.error_name_required);
            return;
        }
        if (words.length < 3) {
            playFailure();
            Alert.alert(t.custom_category.error_title, t.custom_category.error_min_words);
            return;
        }

        playSuccess();
        const newCategory: CustomCategory = {
            id: `custom_${Date.now()}`,
            name: name.trim(),
            words: words,
            language: state.settings.language,
        };

        addCustomCategory(newCategory);
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setName('');
        setWords([]);
        setCurrentWord('');
    };

    const handleClose = () => {
        playClick();
        resetForm();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t.custom_category.title}</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t.custom_category.name_label}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t.custom_category.name_placeholder}
                            value={name}
                            onChangeText={setName}
                            maxLength={30}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t.custom_category.add_words_label}</Text>
                        <View style={styles.addWordContainer}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                placeholder={t.custom_category.word_placeholder}
                                value={currentWord}
                                onChangeText={setCurrentWord}
                                onSubmitEditing={handleAddWord}
                                returnKeyType="done"
                            />
                            <TouchableOpacity
                                style={[styles.addButton, !currentWord.trim() && styles.disabledButton]}
                                onPress={handleAddWord}
                                disabled={!currentWord.trim()}
                            >
                                <Ionicons name="add" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.wordCount}>{words.length} {t.custom_category.words_added}</Text>

                    <ScrollView style={styles.wordList} contentContainerStyle={styles.wordListContent}>
                        {words.map((word, index) => (
                            <View key={index} style={styles.wordChip}>
                                <Text style={styles.wordText}>{word}</Text>
                                <TouchableOpacity onPress={() => handleRemoveWord(word)}>
                                    <Ionicons name="close-circle" size={18} color="#E53E3E" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {words.length === 0 && (
                            <Text style={styles.emptyText}>{t.custom_category.no_words}</Text>
                        )}
                    </ScrollView>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>{t.custom_category.save}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
        width: width * 0.9,
        maxHeight: height * 0.8,
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
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2D3748',
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4A5568',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F7FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: '#2D3748',
    },
    addWordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    addButton: {
        backgroundColor: '#5B7FDB',
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#CBD5E0',
    },
    wordCount: {
        fontSize: 12,
        color: '#718096',
        marginBottom: 8,
        textAlign: 'right',
    },
    wordList: {
        maxHeight: 200,
        backgroundColor: '#F7FAFC',
        borderRadius: 12,
        marginBottom: 20,
    },
    wordListContent: {
        padding: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    wordChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 6,
    },
    wordText: {
        fontSize: 14,
        color: '#4A5568',
    },
    emptyText: {
        width: '100%',
        textAlign: 'center',
        color: '#A0AEC0',
        fontStyle: 'italic',
        marginTop: 20,
    },
    saveButton: {
        backgroundColor: '#48BB78',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#48BB78',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
