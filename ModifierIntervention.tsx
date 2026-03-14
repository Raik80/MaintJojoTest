import React, { useCallback, useEffect, useState } from 'react';
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
import {
    SavedIntervention,
    chargerInterventions,
    updateIntervention,
} from './src/utils/interventionStorage';
import CustomAlert from './src/components/CustomAlert';

type ModifierInterventionProps = {
    interventionId: string;
    onBackPress?: () => void;
    onSaveSuccess?: () => void;
};

const ModifierIntervention: React.FC<ModifierInterventionProps> = ({
    interventionId,
    onBackPress,
    onSaveSuccess,
}) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Champs éditables
    const [batiment, setBatiment] = useState('');
    const [entree, setEntree] = useState('');
    const [etage, setEtage] = useState('');
    const [piece, setPiece] = useState('');
    const [typeIntervention, setTypeIntervention] = useState('');
    const [noteOriginale, setNoteOriginale] = useState('');
    const [commentaire, setCommentaire] = useState('');
    const [numeroInterne, setNumeroInterne] = useState('');
    const [nomPersonne, setNomPersonne] = useState('');

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'danger' | 'warning' | 'info';
        onConfirm: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { },
    });

    const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

    const loadIntervention = useCallback(async () => {
        setLoading(true);
        const all = await chargerInterventions();
        const found = all.find(i => i.id === interventionId);
        if (found) {
            setBatiment(found.batiment || '');
            setEntree(found.entree || '');
            setEtage(found.etage || '');
            setPiece(found.piece || '');
            setTypeIntervention(found.typeIntervention || '');
            setNoteOriginale(found.noteOriginale || '');
            setCommentaire(found.commentaire || '');
            setNumeroInterne(found.numeroInterne || '');
            setNomPersonne(found.nomPersonne || '');
        }
        setLoading(false);
    }, [interventionId]);

    useEffect(() => {
        loadIntervention();
    }, [loadIntervention]);

    // L'entrée n'est pertinente que pour Bâtiment A et Bâtiment B
    const showEntree = batiment.includes('Bâtiment A') || batiment.includes('Bâtiment B');

    const handleSave = async () => {
        if (!typeIntervention.trim()) {
            setAlertConfig({
                visible: true,
                title: 'Champ requis',
                message: 'Le type d\'intervention est obligatoire.',
                type: 'warning',
                onConfirm: closeAlert,
            });
            return;
        }

        setSaving(true);
        const success = await updateIntervention(interventionId, {
            batiment: batiment.trim(),
            entree: entree.trim(),
            etage: etage.trim(),
            piece: piece.trim(),
            typeIntervention: typeIntervention.trim(),
            noteOriginale: noteOriginale.trim(),
            commentaire: commentaire.trim(),
            numeroInterne: numeroInterne.trim() || undefined,
            nomPersonne: nomPersonne.trim() || undefined,
        });
        setSaving(false);

        if (success) {
            setAlertConfig({
                visible: true,
                title: 'Modifié !',
                message: 'L\'intervention a été mise à jour avec succès.',
                type: 'success',
                onConfirm: () => {
                    closeAlert();
                    onSaveSuccess?.();
                },
            });
        } else {
            setAlertConfig({
                visible: true,
                title: 'Erreur',
                message: 'Impossible de sauvegarder les modifications.',
                type: 'danger',
                onConfirm: closeAlert,
            });
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#050B14" />
                <View style={styles.loadingContainer}>
                    <MaterialIcons name="hourglass-empty" size={48} color="#38BDF8" />
                    <Text style={styles.loadingText}>Chargement...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#050B14" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <Pressable
                        onPress={onBackPress}
                        style={({ pressed }) => [
                            styles.backButton,
                            pressed && styles.backButtonPressed,
                        ]}
                    >
                        <MaterialIcons name="chevron-left" size={28} color="#F9FAFB" />
                    </Pressable>

                    <View style={styles.editBadge}>
                        <MaterialIcons name="edit" size={14} color="#38BDF8" />
                        <Text style={styles.editBadgeText}>Mode édition</Text>
                    </View>
                </View>

                <Text style={styles.headerTitle}>Modifier l'intervention</Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.scrollContent}
                    contentContainerStyle={styles.scrollContentContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Localisation */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="place" size={20} color="#38BDF8" />
                            <Text style={styles.sectionTitle}>Localisation</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Bâtiment</Text>
                            <TextInput
                                style={styles.textInput}
                                value={batiment}
                                onChangeText={setBatiment}
                                placeholder="Ex: Bâtiment A, BU..."
                                placeholderTextColor="#6B7280"
                            />
                        </View>

                        {showEntree && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Entrée</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={entree}
                                    onChangeText={setEntree}
                                    placeholder="Ex: 1A, 2B..."
                                    placeholderTextColor="#6B7280"
                                />
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Étage</Text>
                            <TextInput
                                style={styles.textInput}
                                value={etage}
                                onChangeText={setEtage}
                                placeholder="Ex: RDC, Étage 1, Sous-sol..."
                                placeholderTextColor="#6B7280"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Pièce / Local</Text>
                            <TextInput
                                style={styles.textInput}
                                value={piece}
                                onChangeText={setPiece}
                                placeholder="Ex: Salle 102, Bureau..."
                                placeholderTextColor="#6B7280"
                            />
                        </View>
                    </View>

                    {/* Type d'intervention */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="build" size={20} color="#A78BFA" />
                            <Text style={styles.sectionTitle}>Type d'intervention</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <TextInput
                                style={styles.textInput}
                                value={typeIntervention}
                                onChangeText={setTypeIntervention}
                                placeholder="Ex: Éclairage, Prises de courant..."
                                placeholderTextColor="#6B7280"
                            />
                        </View>
                    </View>

                    {/* Note originale */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="mic" size={20} color="#F87171" />
                            <Text style={styles.sectionTitle}>Note originale</Text>
                        </View>

                        <TextInput
                            style={styles.commentInput}
                            value={noteOriginale}
                            onChangeText={setNoteOriginale}
                            multiline
                            placeholder="Note dictée par l'utilisateur..."
                            placeholderTextColor="#6B7280"
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Commentaire */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="edit-note" size={20} color="#FBBF24" />
                            <Text style={styles.sectionTitle}>Commentaire du technicien</Text>
                        </View>

                        <TextInput
                            style={styles.commentInput}
                            value={commentaire}
                            onChangeText={setCommentaire}
                            multiline
                            placeholder="Décrivez les actions réalisées..."
                            placeholderTextColor="#6B7280"
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Personne concernée (téléphonie) — optionnel */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="phone" size={20} color="#06B6D4" />
                            <Text style={styles.sectionTitle}>Personne concernée</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Numéro interne</Text>
                            <TextInput
                                style={styles.textInput}
                                value={numeroInterne}
                                onChangeText={setNumeroInterne}
                                placeholder="ex: 45043"
                                placeholderTextColor="#6B7280"
                                keyboardType="number-pad"
                                maxLength={5}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Nom</Text>
                            <TextInput
                                style={styles.textInput}
                                value={nomPersonne}
                                onChangeText={setNomPersonne}
                                placeholder="Nom de la personne"
                                placeholderTextColor="#6B7280"
                            />
                        </View>
                    </View>

                    <View style={{ height: 120 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer – Bouton Sauvegarder */}
            <View style={styles.footer}>
                <Pressable
                    onPress={handleSave}
                    disabled={saving}
                    style={({ pressed }) => [
                        styles.saveButton,
                        pressed && styles.saveButtonPressed,
                        saving && styles.saveButtonDisabled,
                    ]}
                >
                    <MaterialIcons
                        name={saving ? 'hourglass-empty' : 'save'}
                        size={22}
                        color="#FFFFFF"
                    />
                    <Text style={styles.saveButtonText}>
                        {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                    </Text>
                </Pressable>
            </View>

            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050B14',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        color: '#9CA3AF',
        fontSize: 16,
    },

    // Header
    header: {
        paddingHorizontal: 24,
        paddingTop: (StatusBar.currentHeight || 0) + 16,
        paddingBottom: 20,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1F2937',
    },
    backButtonPressed: {
        backgroundColor: '#1F2937',
    },
    editBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)',
    },
    editBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#38BDF8',
    },
    headerTitle: {
        color: '#F9FAFB',
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 0.3,
    },

    // Scroll
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingHorizontal: 20,
    },

    // Section
    sectionContainer: {
        backgroundColor: '#111827',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1F2937',
        padding: 20,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        color: '#F9FAFB',
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
    },

    // Inputs
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        color: '#9CA3AF',
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#1F2937',
        borderRadius: 14,
        backgroundColor: '#0D1420',
        color: '#F9FAFB',
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    commentInput: {
        minHeight: 100,
        borderWidth: 1,
        borderColor: '#1F2937',
        borderRadius: 14,
        backgroundColor: '#0D1420',
        color: '#F9FAFB',
        fontSize: 15,
        lineHeight: 22,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
        backgroundColor: '#050B14',
        borderTopWidth: 1,
        borderTopColor: '#1F2937',
    },
    saveButton: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        backgroundColor: '#38BDF8',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#38BDF8',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    saveButtonPressed: {
        backgroundColor: '#0EA5E9',
        transform: [{ scale: 0.98 }],
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});

export default ModifierIntervention;
