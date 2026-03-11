import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
    SavedIntervention,
    chargerInterventions,
    supprimerIntervention,
    supprimerToutesInterventions,
} from './src/utils/interventionStorage';
import CustomAlert from './src/components/CustomAlert';

type ListeInterventionsProps = {
    onBackPress?: () => void;
    onInterventionPress?: (id: string) => void;
};

const ListeInterventions: React.FC<ListeInterventionsProps> = ({ onBackPress, onInterventionPress }) => {
    const [interventions, setInterventions] = useState<SavedIntervention[]>([]);
    const [loading, setLoading] = useState(true);

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

    const loadData = useCallback(async () => {
        setLoading(true);
        const data = await chargerInterventions();
        // Trier par date la plus récente
        const sortedData = data.sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
        setInterventions(sortedData);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDelete = (item: SavedIntervention) => {
        setAlertConfig({
            visible: true,
            title: 'Supprimer',
            message: `Supprimer l'intervention "${item.typeIntervention}" à ${item.batiment || 'N/A'} ?`,
            type: 'danger',
            confirmText: 'Supprimer',
            cancelText: 'Annuler',
            onConfirm: async () => {
                closeAlert();
                await supprimerIntervention(item.id);
                loadData();
            },
            onCancel: closeAlert
        });
    };

    const handleDeleteAll = () => {
        if (interventions.length === 0) return;
        
        setAlertConfig({
            visible: true,
            title: 'Tout supprimer',
            message: `Voulez-vous vraiment supprimer les ${interventions.length} interventions enregistrées ?`,
            type: 'danger',
            confirmText: 'Tout supprimer',
            cancelText: 'Annuler',
            onConfirm: async () => {
                closeAlert();
                await supprimerToutesInterventions();
                loadData();
            },
            onCancel: closeAlert
        });
    };

    const formatDate = (isoString: string): string => {
        const date = new Date(isoString);
        const jour = date.getDate().toString().padStart(2, '0');
        const mois = (date.getMonth() + 1).toString().padStart(2, '0');
        const heures = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${jour}/${mois} à ${heures}:${minutes}`;
    };

    const getTypeConfig = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('éclairage') || t.includes('lampe')) return { icon: 'lightbulb-outline', color: '#FBBF24' }; // Amber
        if (t.includes('prise')) return { icon: 'electrical-services', color: '#F87171' }; // Red
        if (t.includes('contrôle') || t.includes('accès')) return { icon: 'lock-outline', color: '#34D399' }; // Emerald
        if (t.includes('réseau') || t.includes('wifi')) return { icon: 'wifi', color: '#38BDF8' }; // Sky Blue
        return { icon: 'build', color: '#A78BFA' }; // Violet
    };

    const renderItem = ({ item }: { item: SavedIntervention }) => {
        const config = getTypeConfig(item.typeIntervention);
        const locationParts = [item.batiment, item.entree, item.etage, item.piece].filter(Boolean);
        const locationText = locationParts.length > 0 ? locationParts.join(' • ') : 'Localisation non spécifiée';
        const isTerminee = item.status === 'terminee';

        return (
            <Pressable
                onPress={() => onInterventionPress?.(item.id)}
                style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                ]}
            >
                {/* En-tête de la carte */}
                <View style={styles.cardHeader}>
                    <View style={styles.cardTypeContainer}>
                        <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
                            <MaterialIcons name={config.icon as any} size={22} color={config.color} />
                        </View>
                        <View>
                            <Text style={styles.cardType}>{item.typeIntervention}</Text>
                            {isTerminee && (
                                <View style={styles.statusBadge}>
                                    <MaterialIcons name="check-circle" size={12} color="#10B981" />
                                    <Text style={styles.statusBadgeText}>Terminée</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <Pressable
                        onPress={() => handleDelete(item)}
                        style={({ pressed }) => [
                            styles.deleteBtn,
                            pressed && styles.deleteBtnPressed,
                        ]}
                    >
                        <MaterialIcons name="delete-outline" size={20} color="#9CA3AF" />
                    </Pressable>
                </View>

                {/* Séparateur */}
                <View style={styles.divider} />

                {/* Corps de la carte */}
                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="place" size={16} color="#6B7280" />
                        <Text style={styles.infoText} numberOfLines={1}>{locationText}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="schedule" size={16} color="#6B7280" />
                        <Text style={styles.infoText}>{formatDate(item.dateCreation)}</Text>
                    </View>
                </View>

                {/* Flèche d'accès */}
                <View style={styles.cardArrow}>
                    <MaterialIcons name="chevron-right" size={20} color="#4B5563" />
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#050B14" />

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Pressable
                        onPress={onBackPress}
                        style={({ pressed }) => [
                            styles.iconButton,
                            pressed && styles.iconButtonPressed,
                        ]}
                    >
                        <MaterialIcons name="chevron-left" size={28} color="#F9FAFB" />
                    </Pressable>

                    {interventions.length > 0 && (
                        <Pressable
                            onPress={handleDeleteAll}
                            style={({ pressed }) => [
                                styles.iconButton,
                                styles.deleteAllAction,
                                pressed && styles.deleteAllActionPressed,
                            ]}
                        >
                            <MaterialIcons name="delete-sweep" size={22} color="#F87171" />
                        </Pressable>
                    )}
                </View>

                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Interventions</Text>
                    <Text style={styles.headerSubtitle}>
                        {loading ? 'Chargement...' : `${interventions.length} enregistrement${interventions.length > 1 ? 's' : ''}`}
                    </Text>
                </View>
            </View>

            {!loading && interventions.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                        <MaterialIcons name="fact-check" size={48} color="#38BDF8" />
                    </View>
                    <Text style={styles.emptyTitle}>Tout est en ordre</Text>
                    <Text style={styles.emptySubtitle}>
                        Aucune intervention n'a été enregistrée pour le moment. Elles apparaîtront ici.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={interventions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050B14',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: (StatusBar.currentHeight || 0) + 16,
        paddingBottom: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1F2937',
    },
    iconButtonPressed: {
        backgroundColor: '#1F2937',
    },
    deleteAllAction: {
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        borderColor: 'rgba(248, 113, 113, 0.2)',
    },
    deleteAllActionPressed: {
        backgroundColor: 'rgba(248, 113, 113, 0.2)',
    },
    headerTextContainer: {
        gap: 4,
    },
    headerTitle: {
        color: '#F9FAFB',
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        color: '#9CA3AF',
        fontSize: 15,
        fontWeight: '500',
    },

    // Liste
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 32,
    },

    // Card
    card: {
        backgroundColor: '#111827',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1F2937',
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    cardTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardType: {
        color: '#F9FAFB',
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    deleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1F2937',
    },
    deleteBtnPressed: {
        backgroundColor: '#374151',
    },
    divider: {
        height: 1,
        backgroundColor: '#1F2937',
        marginHorizontal: 16,
    },
    cardBody: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
        flexShrink: 1,
    },
    cardPressed: {
        backgroundColor: '#1A2332',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 3,
    },
    statusBadgeText: {
        color: '#10B981',
        fontSize: 11,
        fontWeight: '600',
    },
    cardArrow: {
        position: 'absolute',
        right: 12,
        bottom: 16,
    },

    // Empty State
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingBottom: 80, // Offset for visual center
    },
    emptyIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        color: '#F9FAFB',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: '#9CA3AF',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
});

export default ListeInterventions;
