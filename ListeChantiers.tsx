import React, { useCallback, useEffect, useState } from 'react';
import {
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
  SavedChantier,
  chargerChantiers,
  supprimerChantier,
  supprimerTousChantiers,
} from './src/utils/chantierStorage';
import CustomAlert from './src/components/CustomAlert';

type ListeChantiersProps = {
  onBackPress?: () => void;
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

const ListeChantiers: React.FC<ListeChantiersProps> = ({ onBackPress }) => {
  const [chantiers, setChantiers] = useState<SavedChantier[]>([]);
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
    onConfirm: () => {},
  });

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await chargerChantiers();
    setChantiers(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = (item: SavedChantier) => {
    setAlertConfig({
      visible: true,
      title: 'Supprimer',
      message: `Supprimer le chantier "${item.localisation}" ?`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        closeAlert();
        await supprimerChantier(item.id);
        loadData();
      },
      onCancel: closeAlert,
    });
  };

  const handleDeleteAll = () => {
    if (chantiers.length === 0) return;
    setAlertConfig({
      visible: true,
      title: 'Tout supprimer',
      message: 'Supprimer tous les chantiers ?',
      type: 'danger',
      confirmText: 'Tout supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        closeAlert();
        await supprimerTousChantiers();
        loadData();
      },
      onCancel: closeAlert,
    });
  };

  const renderItem = ({ item }: { item: SavedChantier }) => {
    const done = item.taches.filter(t => t.done).length;
    const total = item.taches.length;

    return (
      <Pressable
        onLongPress={() => handleDelete(item)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardHeader}>
          <MaterialIcons name="location-on" size={18} color="#34D399" />
          <Text style={styles.cardLocalisation} numberOfLines={1}>
            {item.localisation}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.progressBadge}>
            <MaterialIcons name="checklist" size={14} color="#38BDF8" />
            <Text style={styles.progressText}>{done}/{total} tâches complétées</Text>
          </View>
          <Text style={styles.cardDate}>{formatDate(item.date_creation)}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050B14" />

      <View style={[styles.header, { paddingTop: (StatusBar.currentHeight || 0) + 16 }]}>
        <View style={styles.headerTop}>
          <Pressable
            onPress={onBackPress}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <MaterialIcons name="chevron-left" size={28} color="#F9FAFB" />
          </Pressable>

          <Pressable
            onPress={handleDeleteAll}
            disabled={chantiers.length === 0}
            style={({ pressed }) => [
              styles.deleteAllButton,
              pressed && chantiers.length > 0 && styles.deleteAllButtonPressed,
              chantiers.length === 0 && styles.deleteAllButtonDisabled,
            ]}
          >
            <MaterialIcons name="delete-sweep" size={18} color="#F87171" />
            <Text style={styles.deleteAllText}>Tout supprimer</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Chantiers</Text>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chargement...</Text>
        </View>
      ) : chantiers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="build" size={48} color="#374151" />
          <Text style={styles.emptyText}>Aucun chantier pour l'instant</Text>
        </View>
      ) : (
        <FlatList
          data={chantiers}
          keyExtractor={item => item.id}
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
  container: { flex: 1, backgroundColor: '#050B14' },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTop: {
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
  backButtonPressed: { backgroundColor: '#1F2937' },
  deleteAllButton: {
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
  deleteAllButtonPressed: { backgroundColor: 'rgba(248, 113, 113, 0.2)' },
  deleteAllButtonDisabled: { opacity: 0.3 },
  deleteAllText: { color: '#F87171', fontSize: 13, fontWeight: '700' },
  title: { color: '#F9FAFB', fontSize: 28, fontWeight: '800', letterSpacing: 0.3 },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 16,
    marginBottom: 12,
  },
  cardPressed: { backgroundColor: '#1A2436' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardLocalisation: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  progressText: { color: '#38BDF8', fontSize: 13, fontWeight: '600' },
  cardDate: { color: '#6B7280', fontSize: 12 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: { color: '#6B7280', fontSize: 16 },
});

export default ListeChantiers;
