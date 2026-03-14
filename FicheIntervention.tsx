import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
    SavedIntervention,
    chargerInterventions,
    updateIntervention,
    terminerIntervention,
    uploadPhoto,
    supprimerPhoto,
} from './src/utils/interventionStorage';
import { genererEtEnvoyerPDF } from './src/utils/generatePDF';
import CustomAlert from './src/components/CustomAlert';

type FicheInterventionProps = {
    interventionId: string;
    onBackPress?: () => void;
    onEditPress?: (id: string) => void;
};

const FicheIntervention: React.FC<FicheInterventionProps> = ({
    interventionId,
    onBackPress,
    onEditPress,
}) => {
    const insets = useSafeAreaInsets();
    const [intervention, setIntervention] = useState<SavedIntervention | null>(null);
    const [commentaire, setCommentaire] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'danger' | 'warning' | 'info';
        confirmText?: string;
        cancelText?: string;
        onConfirm: () => void;
        onCancel?: () => void;
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
            setIntervention(found);
            setCommentaire(found.commentaire || '');
            setPhotos(found.photos || []);
        }
        setLoading(false);
    }, [interventionId]);

    useEffect(() => {
        loadIntervention();
    }, [loadIntervention]);

    const getTypeConfig = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('éclairage') || t.includes('lampe')) return { icon: 'lightbulb-outline', color: '#FBBF24' };
        if (t.includes('prise')) return { icon: 'electrical-services', color: '#F87171' };
        if (t.includes('contrôle') || t.includes('accès')) return { icon: 'lock-outline', color: '#34D399' };
        if (t.includes('réseau') || t.includes('wifi')) return { icon: 'wifi', color: '#38BDF8' };
        return { icon: 'build', color: '#A78BFA' };
    };

    const formatDate = (isoString: string): string => {
        const date = new Date(isoString);
        const jour = date.getDate().toString().padStart(2, '0');
        const mois = (date.getMonth() + 1).toString().padStart(2, '0');
        const annee = date.getFullYear();
        const heures = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${jour}/${mois}/${annee} à ${heures}:${minutes}`;
    };

    // ─── Photo Picker ─────────────────────────────────────
    const handleUploadAndSave = async (localUri: string) => {
        setUploading(true);
        const publicUrl = await uploadPhoto(interventionId, localUri);
        setUploading(false);
        if (publicUrl) {
            const newPhotos = [...photos, publicUrl];
            setPhotos(newPhotos);
            await updateIntervention(interventionId, { photos: newPhotos });
        }
    };

    const handleAddPhoto = () => {
        setAlertConfig({
            visible: true,
            title: 'Ajouter une photo',
            message: 'Choisir la source de la photo',
            type: 'info',
            confirmText: '📷 Caméra',
            cancelText: '🖼️ Galerie',
            onConfirm: async () => {
                closeAlert();
                const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    quality: 0.7,
                });
                if (!result.canceled && result.assets[0]) {
                    await handleUploadAndSave(result.assets[0].uri);
                }
            },
            onCancel: async () => {
                closeAlert();
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    quality: 0.7,
                });
                if (!result.canceled && result.assets[0]) {
                    await handleUploadAndSave(result.assets[0].uri);
                }
            },
        });
    };

    const handleRemovePhoto = (index: number) => {
        setAlertConfig({
            visible: true,
            title: 'Supprimer la photo',
            message: 'Voulez-vous supprimer cette photo ?',
            type: 'danger',
            confirmText: 'Supprimer',
            cancelText: 'Annuler',
            onConfirm: async () => {
                closeAlert();
                const photoUrl = photos[index];
                await supprimerPhoto(photoUrl);
                const newPhotos = photos.filter((_, i) => i !== index);
                setPhotos(newPhotos);
                await updateIntervention(interventionId, { photos: newPhotos });
            },
            onCancel: closeAlert,
        });
    };

    // ─── Terminer ─────────────────────────────────────────
    const handleTerminer = () => {
        setAlertConfig({
            visible: true,
            title: 'Terminer l\'intervention',
            message: 'Confirmez-vous la clôture de cette intervention ?',
            type: 'warning',
            confirmText: 'Terminer',
            cancelText: 'Annuler',
            onConfirm: async () => {
                closeAlert();
                // Sauvegarder le commentaire d'abord
                if (commentaire.trim()) {
                    await updateIntervention(interventionId, { commentaire: commentaire.trim() });
                }
                const success = await terminerIntervention(interventionId, commentaire.trim() || undefined);
                if (success) {
                    setAlertConfig({
                        visible: true,
                        title: 'Terminée !',
                        message: 'L\'intervention a été marquée comme terminée.',
                        type: 'success',
                        onConfirm: () => {
                            closeAlert();
                            onBackPress?.();
                        },
                    });
                }
            },
            onCancel: closeAlert,
        });
    };

    // ─── Partager PDF ──────────────────────────────────────
    const handlePartagerPDF = async () => {
        if (!intervention) return;
        try {
            await genererEtEnvoyerPDF(intervention);
        } catch (e) {
            setAlertConfig({
                visible: true,
                title: 'Erreur',
                message: 'Impossible de générer le PDF.',
                type: 'danger',
                onConfirm: closeAlert,
            });
        }
    };

    // ─── Sauvegarder commentaire au blur ───────────────────
    const handleSaveComment = async () => {
        if (commentaire.trim()) {
            await updateIntervention(interventionId, { commentaire: commentaire.trim() });
        }
    };

    if (loading || !intervention) {
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

    const config = getTypeConfig(intervention.typeIntervention);
    const isTerminee = intervention.status === 'terminee';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#050B14" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Pressable
                        onPress={onBackPress}
                        style={({ pressed }) => [
                            styles.backButton,
                            pressed && styles.backButtonPressed,
                        ]}
                    >
                        <MaterialIcons name="chevron-left" size={28} color="#F9FAFB" />
                    </Pressable>

                    <View style={styles.headerTopRight}>
                        <Pressable
                            onPress={handlePartagerPDF}
                            style={({ pressed }) => [
                                styles.pdfButton,
                                pressed && styles.pdfButtonPressed,
                            ]}
                        >
                            <MaterialIcons name="picture-as-pdf" size={18} color="#F87171" />
                            <Text style={styles.pdfButtonText}>PDF</Text>
                        </Pressable>

                        <View style={[
                            styles.statusBadge,
                            isTerminee ? styles.statusBadgeTerminee : styles.statusBadgeEnCours,
                        ]}>
                            <MaterialIcons
                                name={isTerminee ? 'check-circle' : 'schedule'}
                                size={14}
                                color={isTerminee ? '#10B981' : '#FBBF24'}
                            />
                            <Text style={[
                                styles.statusBadgeText,
                                { color: isTerminee ? '#10B981' : '#FBBF24' },
                            ]}>
                                {isTerminee ? 'Terminée' : 'En cours'}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.headerTitle}>Fiche d'intervention</Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ─── Carte Info ──────────────────────────────── */}
                <View style={styles.infoCard}>
                    <View style={styles.infoCardHeader}>
                        <View style={[styles.typeIconContainer, { backgroundColor: `${config.color}15` }]}>
                            <MaterialIcons name={config.icon as any} size={26} color={config.color} />
                        </View>
                        <View style={styles.typeTextContainer}>
                            <Text style={styles.typeLabel}>Type d'intervention</Text>
                            <Text style={styles.typeValue}>{intervention.typeIntervention}</Text>
                        </View>
                    </View>

                    <View style={styles.infoDivider} />

                    <View style={styles.infoGrid}>
                        <InfoRow icon="apartment" label="Bâtiment" value={intervention.batiment || '—'} />
                        {intervention.entree ? (
                            <InfoRow icon="meeting-room" label="Entrée" value={intervention.entree} />
                        ) : null}
                        <InfoRow icon="layers" label="Étage" value={intervention.etage || '—'} />
                        <InfoRow icon="door-front" label="Pièce" value={intervention.piece || '—'} />
                        <InfoRow icon="event" label="Créée le" value={formatDate(intervention.dateCreation)} />
                        {isTerminee && intervention.dateTerminee && (
                            <InfoRow icon="check-circle-outline" label="Terminée le" value={formatDate(intervention.dateTerminee)} />
                        )}
                    </View>
                </View>

                {/* ─── Note Originale ──────────────────────────── */}
                {intervention.noteOriginale ? (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="mic" size={20} color="#F87171" />
                            <Text style={styles.sectionTitle}>Note originale</Text>
                        </View>
                        <View style={styles.noteOriginaleBox}>
                            <Text style={styles.noteOriginaleText}>
                                {intervention.noteOriginale}
                            </Text>
                        </View>
                    </View>
                ) : null}

                {/* ─── Section Photos ──────────────────────────── */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="photo-library" size={20} color="#38BDF8" />
                        <Text style={styles.sectionTitle}>Photos</Text>
                        <Text style={styles.sectionCount}>{photos.length}</Text>
                    </View>

                    <View style={styles.photosGrid}>
                        {photos.map((uri, index) => (
                            <Pressable
                                key={index}
                                onLongPress={() => handleRemovePhoto(index)}
                                style={styles.photoWrapper}
                            >
                                <Image source={{ uri }} style={styles.photoImage} />
                                <View style={styles.photoOverlay}>
                                    <MaterialIcons name="delete" size={16} color="#FFF" />
                                </View>
                            </Pressable>
                        ))}

                        {!isTerminee && !uploading && (
                            <Pressable
                                onPress={handleAddPhoto}
                                style={({ pressed }) => [
                                    styles.addPhotoButton,
                                    pressed && styles.addPhotoButtonPressed,
                                ]}
                            >
                                <MaterialIcons name="add-a-photo" size={28} color="#38BDF8" />
                                <Text style={styles.addPhotoText}>Ajouter</Text>
                            </Pressable>
                        )}

                        {uploading && (
                            <View style={styles.addPhotoButton}>
                                <ActivityIndicator size="small" color="#38BDF8" />
                                <Text style={styles.addPhotoText}>Envoi...</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ─── Section Commentaire ─────────────────────── */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="edit-note" size={20} color="#A78BFA" />
                        <Text style={styles.sectionTitle}>Commentaire du technicien</Text>
                    </View>

                    {isTerminee ? (
                        <View style={styles.commentReadOnly}>
                            <Text style={styles.commentReadOnlyText}>
                                {intervention.commentaire || 'Aucun commentaire'}
                            </Text>
                        </View>
                    ) : (
                        <TextInput
                            style={styles.commentInput}
                            value={commentaire}
                            onChangeText={setCommentaire}
                            onBlur={handleSaveComment}
                            onFocus={() => {
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 300);
                            }}
                            multiline
                            placeholder="Décrivez les actions réalisées, les pièces changées..."
                            placeholderTextColor="#6B7280"
                            textAlignVertical="top"
                        />
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>
            </KeyboardAvoidingView>

            {/* ─── Boutons Footer ──────────────────────────────── */}
            {!isTerminee && (
                <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                    <View style={styles.footerButtons}>
                        <Pressable
                            onPress={() => onEditPress?.(interventionId)}
                            style={({ pressed }) => [
                                styles.modifierButton,
                                pressed && styles.modifierButtonPressed,
                            ]}
                        >
                            <MaterialIcons name="edit" size={20} color="#FFFFFF" />
                            <Text style={styles.modifierButtonText}>Modifier</Text>
                        </Pressable>

                        <Pressable
                            onPress={handleTerminer}
                            style={({ pressed }) => [
                                styles.terminerButton,
                                pressed && styles.terminerButtonPressed,
                            ]}
                        >
                            <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.terminerButtonText}>Terminer</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                confirmText={alertConfig.confirmText}
                cancelText={alertConfig.cancelText}
                onConfirm={alertConfig.onConfirm}
                onCancel={alertConfig.onCancel}
            />
        </SafeAreaView>
    );
};

// ─── Composant InfoRow ─────────────────────────────────────
const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
    <View style={styles.infoRowContainer}>
        <View style={styles.infoRowLeft}>
            <MaterialIcons name={icon as any} size={18} color="#6B7280" />
            <Text style={styles.infoRowLabel}>{label}</Text>
        </View>
        <Text style={styles.infoRowValue} numberOfLines={1}>{value}</Text>
    </View>
);

// ─── Styles ────────────────────────────────────────────────
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
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTopRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pdfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(248, 113, 113, 0.2)',
    },
    pdfButtonPressed: {
        backgroundColor: 'rgba(248, 113, 113, 0.2)',
    },
    pdfButtonText: {
        color: '#F87171',
        fontSize: 13,
        fontWeight: '700',
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
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    statusBadgeEnCours: {
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)',
    },
    statusBadgeTerminee: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    statusBadgeText: {
        fontSize: 13,
        fontWeight: '700',
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

    // Info Card
    infoCard: {
        backgroundColor: '#111827',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1F2937',
        overflow: 'hidden',
        marginBottom: 20,
    },
    infoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    typeIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeTextContainer: {
        flex: 1,
    },
    typeLabel: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    typeValue: {
        color: '#F9FAFB',
        fontSize: 20,
        fontWeight: '700',
    },
    infoDivider: {
        height: 1,
        backgroundColor: '#1F2937',
    },
    infoGrid: {
        padding: 16,
        gap: 2,
    },

    // Info Row
    infoRowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
    },
    infoRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    infoRowLabel: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
    },
    infoRowValue: {
        color: '#F9FAFB',
        fontSize: 14,
        fontWeight: '600',
        maxWidth: '50%',
        textAlign: 'right',
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
    sectionCount: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '600',
        backgroundColor: '#1F2937',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
        overflow: 'hidden',
    },

    // Photos
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    photoWrapper: {
        width: 100,
        height: 100,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1F2937',
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    photoOverlay: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addPhotoButton: {
        width: 100,
        height: 100,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#1F2937',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    addPhotoButtonPressed: {
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
    },
    addPhotoText: {
        color: '#38BDF8',
        fontSize: 11,
        fontWeight: '600',
    },

    // Note Originale
    noteOriginaleBox: {
        borderRadius: 14,
        backgroundColor: '#0D1420',
        borderWidth: 1,
        borderColor: '#1F2937',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    noteOriginaleText: {
        color: '#D1D5DB',
        fontSize: 15,
        lineHeight: 24,
        fontStyle: 'italic',
    },

    // Comment
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
    commentReadOnly: {
        borderRadius: 14,
        backgroundColor: '#0D1420',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    commentReadOnlyText: {
        color: '#9CA3AF',
        fontSize: 15,
        lineHeight: 22,
        fontStyle: 'italic',
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
    footerButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modifierButton: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#38BDF8',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#38BDF8',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    modifierButtonPressed: {
        backgroundColor: '#0EA5E9',
        transform: [{ scale: 0.98 }],
    },
    modifierButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    terminerButton: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#10B981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    terminerButtonPressed: {
        backgroundColor: '#0E9F6E',
        transform: [{ scale: 0.98 }],
    },
    terminerButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});

export default FicheIntervention;
