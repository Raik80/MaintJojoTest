import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  SavedChantier,
  Tache,
  chargerChantierById,
  updateTachesChantier,
  uploadPhotoChantier,
  supprimerPhotoChantier,
  updatePhotosChantier,
} from './src/utils/chantierStorage';
import CustomAlert from './src/components/CustomAlert';

type FicheChantierProps = {
  chantierId: string;
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

const FicheChantier: React.FC<FicheChantierProps> = ({ chantierId, onBackPress }) => {
  const [chantier, setChantier] = useState<SavedChantier | null>(null);
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

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadChantier = useCallback(async () => {
    setLoading(true);
    const data = await chargerChantierById(chantierId);
    setChantier(data);
    setPhotos(data?.photos ?? []);
    setLoading(false);
  }, [chantierId]);

  useEffect(() => { loadChantier(); }, [loadChantier]);

  const handleToggleTache = async (index: number) => {
    if (!chantier) return;

    // Save original state before optimistic update
    const originalChantier = chantier;

    // Optimistic update
    const newTaches: Tache[] = chantier.taches.map((t, i) =>
      i === index ? { ...t, done: !t.done } : t
    );
    setChantier({ ...chantier, taches: newTaches });

    // Persist
    const success = await updateTachesChantier(chantier.id, newTaches);
    if (!success) {
      // Rollback to original state
      setChantier(originalChantier);
      setAlertConfig({
        visible: true,
        title: 'Erreur',
        message: 'Impossible de mettre à jour la tâche.',
        type: 'danger',
        onConfirm: closeAlert,
      });
    }
  };

  const handleAddPhoto = () => {
    if (!chantier) return;
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

  const handleUploadAndSave = async (localUri: string) => {
    if (!chantier) return;
    setUploading(true);
    const publicUrl = await uploadPhotoChantier(chantier.id, localUri);
    setUploading(false);
    if (publicUrl) {
      const newPhotos = [...photos, publicUrl];
      setPhotos(newPhotos);
      await updatePhotosChantier(chantier.id, newPhotos);
    } else {
      setAlertConfig({
        visible: true,
        title: 'Erreur',
        message: "Impossible d'uploader la photo.",
        type: 'danger',
        onConfirm: closeAlert,
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    if (!chantier) return;
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
        const newPhotos = photos.filter((_, i) => i !== index);
        setPhotos(newPhotos);
        await supprimerPhotoChantier(photoUrl);
        await updatePhotosChantier(chantier.id, newPhotos);
      },
      onCancel: closeAlert,
    });
  };

  const done = chantier?.taches.filter(t => t.done).length ?? 0;
  const total = chantier?.taches.length ?? 0;

  const renderTache = ({ item, index }: { item: Tache; index: number }) => (
    <Pressable
      onPress={() => handleToggleTache(index)}
      style={({ pressed }) => [styles.tacheRow, pressed && styles.tacheRowPressed]}
    >
      <MaterialIcons
        name={item.done ? 'check-box' : 'check-box-outline-blank'}
        size={24}
        color={item.done ? '#34D399' : '#6B7280'}
      />
      <Text style={[styles.tacheText, item.done && styles.tacheTextDone]}>
        {item.description}
      </Text>
    </Pressable>
  );

  const renderPhotosSection = () => (
    <View style={styles.photosSection}>
      <View style={styles.photosSectionHeader}>
        <MaterialIcons name="photo-library" size={20} color="#A78BFA" />
        <Text style={styles.photosSectionTitle}>Photos</Text>
        <Text style={styles.photosCount}>{photos.length}</Text>
      </View>

      {photos.length > 0 && (
        <View style={styles.photosGrid}>
          {photos.map((uri, index) => (
            <Pressable
              key={index}
              onLongPress={() => handleRemovePhoto(index)}
              style={styles.photoWrapper}
            >
              <Image source={{ uri }} style={styles.photoThumbnail} />
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={handleAddPhoto}
        disabled={uploading}
        style={({ pressed }) => [
          styles.addPhotoButton,
          pressed && !uploading && styles.addPhotoButtonPressed,
          uploading && styles.addPhotoButtonDisabled,
        ]}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#A78BFA" />
        ) : (
          <MaterialIcons name="add-a-photo" size={20} color="#A78BFA" />
        )}
        <Text style={styles.addPhotoButtonText}>
          {uploading ? 'Upload en cours...' : 'Ajouter une photo'}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050B14" />

      <View style={[styles.header, { paddingTop: (StatusBar.currentHeight || 0) + 16 }]}>
        <Pressable
          onPress={onBackPress}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <MaterialIcons name="chevron-left" size={28} color="#F9FAFB" />
        </Pressable>

        <Text style={styles.title} numberOfLines={2}>
          {chantier?.localisation ?? ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#34D399" />
        </View>
      ) : !chantier ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color="#374151" />
          <Text style={styles.emptyText}>Chantier introuvable</Text>
        </View>
      ) : (
        <>
          <View style={styles.infoRow}>
            <View style={styles.progressBadge}>
              <MaterialIcons name="checklist" size={16} color="#38BDF8" />
              <Text style={styles.progressText}>{done}/{total} tâches complétées</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(chantier.date_creation)}</Text>
          </View>

          <FlatList
            data={chantier.taches}
            keyExtractor={(item, i) => `${i}-${item.description}`}
            renderItem={renderTache}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centered}>
                <MaterialIcons name="playlist-add-check" size={48} color="#374151" />
                <Text style={styles.emptyText}>Aucune tâche pour ce chantier</Text>
              </View>
            }
            ListFooterComponent={renderPhotosSection}
          />
        </>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
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
  title: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: { color: '#38BDF8', fontSize: 14, fontWeight: '600' },
  dateText: { color: '#6B7280', fontSize: 12 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  tacheRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 14,
    marginBottom: 10,
  },
  tacheRowPressed: { backgroundColor: '#1A2436' },
  tacheText: { color: '#F9FAFB', fontSize: 15, flex: 1 },
  tacheTextDone: { color: '#6B7280', textDecorationLine: 'line-through' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: { color: '#6B7280', fontSize: 16 },
  photosSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  photosSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  photosSectionTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  photosCount: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  photoWrapper: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
  },
  addPhotoButtonPressed: { backgroundColor: 'rgba(167, 139, 250, 0.2)' },
  addPhotoButtonDisabled: { opacity: 0.6 },
  addPhotoButtonText: {
    color: '#A78BFA',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default FicheChantier;
