import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InterventionExtractedData } from './src/utils/interventionParser';

/**
 * Propriétés du composant FormulaireIntervention.
 * Reçoit maintenant un TABLEAU d'interventions.
 */
type FormulaireInterventionProps = {
    interventionsData: InterventionExtractedData[];
    originalNotes: string;
    onBackPress?: () => void;
    onSavePress?: (editedData: InterventionExtractedData[]) => void;
};

/**
 * Écran d'édition des données extraites.
 * Supporte la navigation entre plusieurs interventions avec ◀ ▶.
 */
const FormulaireIntervention: React.FC<FormulaireInterventionProps> = ({
    interventionsData,
    originalNotes,
    onBackPress,
    onSavePress,
}) => {
    const insets = useSafeAreaInsets();
    // Index de l'intervention actuellement affichée
    const [currentIndex, setCurrentIndex] = useState(0);
    const total = interventionsData.length;

    // Copie locale éditable de toutes les interventions
    const [editedData, setEditedData] = useState<InterventionExtractedData[]>(
        () => interventionsData.map(d => ({ ...d }))
    );

    const current = editedData[currentIndex];

    // Met à jour un champ de l'intervention courante
    const updateField = (field: keyof InterventionExtractedData, value: string) => {
        setEditedData(prev => {
            const updated = [...prev];
            updated[currentIndex] = { ...updated[currentIndex], [field]: value };
            return updated;
        });
    };

    // L'entrée n'est pertinente que pour Bâtiment A et Bâtiment B
    const showEntree = current.batiment.includes('Bâtiment A') || current.batiment.includes('Bâtiment B');

    const goPrev = () => setCurrentIndex(i => Math.max(0, i - 1));
    const goNext = () => setCurrentIndex(i => Math.min(total - 1, i + 1));

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0B1220" />
            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <Pressable
                            onPress={onBackPress}
                            accessibilityLabel="Retour à l'écran précédent"
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                styles.backButton,
                                pressed && styles.backButtonPressed
                            ]}
                        >
                            <MaterialIcons name="arrow-back" size={18} color="#DCE4F2" />
                            <Text style={styles.backButtonText}>Retour</Text>
                        </Pressable>
                    </View>
                    <Text style={styles.headerTitle}>Vérification des données</Text>
                </View>

                {/* Barre de navigation multi-intervention */}
                {total > 1 && (
                    <View style={styles.navBar}>
                        <Pressable
                            onPress={goPrev}
                            disabled={currentIndex === 0}
                            style={({ pressed }) => [
                                styles.navButton,
                                currentIndex === 0 && styles.navButtonDisabled,
                                pressed && currentIndex > 0 && styles.navButtonPressed,
                            ]}
                        >
                            <MaterialIcons
                                name="chevron-left"
                                size={24}
                                color={currentIndex === 0 ? '#3A4560' : '#DCE4F2'}
                            />
                        </Pressable>

                        <View style={styles.navCounter}>
                            <Text style={styles.navCounterText}>
                                Intervention {currentIndex + 1} / {total}
                            </Text>
                        </View>

                        <Pressable
                            onPress={goNext}
                            disabled={currentIndex === total - 1}
                            style={({ pressed }) => [
                                styles.navButton,
                                currentIndex === total - 1 && styles.navButtonDisabled,
                                pressed && currentIndex < total - 1 && styles.navButtonPressed,
                            ]}
                        >
                            <MaterialIcons
                                name="chevron-right"
                                size={24}
                                color={currentIndex === total - 1 ? '#3A4560' : '#DCE4F2'}
                            />
                        </Pressable>
                    </View>
                )}

                {/* Formulaire */}
                <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                    <Text style={styles.sectionTitle}>Infos extraites</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Bâtiment</Text>
                        <TextInput
                            style={styles.textInput}
                            value={current.batiment}
                            onChangeText={(v) => updateField('batiment', v)}
                            placeholder="Ex: A, B, Principal..."
                            placeholderTextColor="#8B95A7"
                        />
                    </View>

                    {showEntree && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Entrée</Text>
                            <TextInput
                                style={styles.textInput}
                                value={current.entree}
                                onChangeText={(v) => updateField('entree', v)}
                                placeholder="Ex: 1A, 2B..."
                                placeholderTextColor="#8B95A7"
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Étage</Text>
                        <TextInput
                            style={styles.textInput}
                            value={current.etage}
                            onChangeText={(v) => updateField('etage', v)}
                            placeholder="Ex: RDC, Étage 1, Sous-sol..."
                            placeholderTextColor="#8B95A7"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Pièce / Local</Text>
                        <TextInput
                            style={styles.textInput}
                            value={current.piece}
                            onChangeText={(v) => updateField('piece', v)}
                            placeholder="Ex: 102, Réunion..."
                            placeholderTextColor="#8B95A7"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Type d'intervention</Text>
                        <TextInput
                            style={styles.textInput}
                            value={current.typeIntervention}
                            onChangeText={(v) => updateField('typeIntervention', v)}
                            placeholder="Ex: Éclairage, Prises..."
                            placeholderTextColor="#8B95A7"
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Notes originales</Text>
                    <TextInput
                        style={styles.notesInput}
                        value={originalNotes}
                        editable={false}
                        multiline
                        textAlignVertical="top"
                    />
                    <View style={{ height: 20 }} />
                </ScrollView>

                {/* Footer */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                    <Pressable
                        onPress={() => onSavePress?.(editedData)}
                        accessibilityLabel="Valider toutes les interventions"
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.saveButton,
                            pressed && styles.saveButtonPressed
                        ]}
                    >
                        <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>
                            {total > 1 ? `Valider les ${total} interventions` : "Valider l'intervention"}
                        </Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B1220',
    },
    keyboardContainer: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: (StatusBar.currentHeight || 0) + 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1D2738',
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: 10,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#182236',
    },
    backButtonPressed: {
        backgroundColor: '#1F2C44',
    },
    backButtonText: {
        marginLeft: 6,
        color: '#DCE4F2',
        fontSize: 14,
        fontWeight: '600',
    },
    headerTitle: {
        color: '#F5F7FB',
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    // -- Barre de navigation entre interventions --
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#101929',
        borderBottomWidth: 1,
        borderBottomColor: '#1D2738',
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#182236',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navButtonDisabled: {
        opacity: 0.4,
    },
    navButtonPressed: {
        backgroundColor: '#1F2C44',
    },
    navCounter: {
        flex: 1,
        alignItems: 'center',
    },
    navCounterText: {
        color: '#10B981',
        fontSize: 16,
        fontWeight: '700',
    },

    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 14,
    },
    sectionTitle: {
        color: '#A0ABC0',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        color: '#DCE4F2',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#2A364D',
        borderRadius: 10,
        backgroundColor: '#121B2B',
        color: '#FFFFFF',
        fontSize: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    notesInput: {
        minHeight: 80,
        borderWidth: 1,
        borderColor: '#2A364D',
        borderRadius: 10,
        backgroundColor: '#121B2B',
        color: '#8B95A7',
        fontSize: 14,
        lineHeight: 20,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    footer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#1D2738',
        backgroundColor: '#0B1220',
    },
    saveButton: {
        width: '100%',
        minHeight: 54,
        borderRadius: 14,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.32,
        shadowRadius: 10,
        elevation: 7,
    },
    saveButtonPressed: {
        backgroundColor: '#0E9F6E',
        transform: [{ scale: 0.985 }],
    },
    saveButtonText: {
        marginLeft: 8,
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});

export default FormulaireIntervention;
