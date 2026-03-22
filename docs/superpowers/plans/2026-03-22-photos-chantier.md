# Photos Chantier — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter la gestion de photos (ajout via caméra/galerie, affichage en grille, suppression) dans `FicheChantier`, sous la checklist des tâches.

**Architecture:** Ajout d'un champ `photos: string[]` dans la table Supabase `chantiers` et dans le type `SavedChantier`. Trois nouvelles fonctions dans `chantierStorage.ts` (upload, suppression, mise à jour). Section photos dans `FicheChantier.tsx` via `ListFooterComponent`, avec le `CustomAlert` existant pour les dialogs.

**Tech Stack:** React Native, Expo, Supabase Storage (bucket `photos`, sous-dossier `chantiers/`), `expo-image-picker`, `expo-file-system`

**Spec:** `docs/superpowers/specs/2026-03-22-photos-chantier-design.md`

---

## Chunk 1: Supabase + Storage functions

### Task 1 : Schéma Supabase

**Files:**
- No code file — action manuelle dans Supabase Studio

- [ ] **Step 1 : Ajouter la colonne `photos` dans Supabase**

  Dans Supabase Studio → SQL Editor, exécuter :
  ```sql
  ALTER TABLE chantiers ADD COLUMN photos text[] NOT NULL DEFAULT '{}';
  ```

- [ ] **Step 2 : Vérifier**

  Dans Table Editor → table `chantiers` : la colonne `photos` doit apparaître avec valeur par défaut `{}`.

---

### Task 2 : Mettre à jour le type `SavedChantier` et ajouter les fonctions storage

**Files:**
- Modify: `src/utils/chantierStorage.ts`

- [ ] **Step 1 : Ajouter le champ `photos` dans `SavedChantier`**

  Dans `src/utils/chantierStorage.ts`, modifier le type `SavedChantier` (ligne 8) :

  ```ts
  export type SavedChantier = {
    id: string;
    localisation: string;
    taches: Tache[];
    photos: string[];
    date_creation: string;
    status: 'en_cours' | 'termine';
  };
  ```

- [ ] **Step 2 : Ajouter l'import `ExpoFile`**

  En haut du fichier, après `import { supabase } from './supabaseClient';`, ajouter :

  ```ts
  import { File as ExpoFile } from 'expo-file-system';
  ```

- [ ] **Step 3 : Ajouter `uploadPhotoChantier` à la fin du fichier**

  ```ts
  export const uploadPhotoChantier = async (
    chantierId: string,
    localUri: string
  ): Promise<string | null> => {
    try {
      const ext = localUri.split('.').pop() || 'jpg';
      const fileName = `chantiers/${chantierId}/${Date.now()}.${ext}`;

      const file = new ExpoFile(localUri);
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Erreur upload photo chantier:', uploadError.message);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Erreur upload photo chantier:', error);
      return null;
    }
  };
  ```

- [ ] **Step 4 : Ajouter `supprimerPhotoChantier` à la fin du fichier**

  ```ts
  export const supprimerPhotoChantier = async (photoUrl: string): Promise<boolean> => {
    try {
      const urlParts = photoUrl.split('/storage/v1/object/public/photos/');
      if (urlParts.length < 2) return false;

      const filePath = urlParts[1];

      const { error } = await supabase.storage
        .from('photos')
        .remove([filePath]);

      if (error) {
        console.error('Erreur suppression photo chantier:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur suppression photo chantier:', error);
      return false;
    }
  };
  ```

- [ ] **Step 5 : Ajouter `updatePhotosChantier` à la fin du fichier**

  ```ts
  export const updatePhotosChantier = async (
    id: string,
    photos: string[]
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chantiers')
        .update({ photos })
        .eq('id', id);

      if (error) {
        console.error('Erreur mise à jour photos chantier:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur mise à jour photos chantier:', error);
      return false;
    }
  };
  ```

- [ ] **Step 6 : Commit**

  ```bash
  git add src/utils/chantierStorage.ts
  git commit -m "feat: add photo storage functions for chantiers"
  ```

---

## Chunk 2 : UI dans FicheChantier

### Task 3 : Mettre à jour `FicheChantier.tsx`

**Files:**
- Modify: `FicheChantier.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

  Remplacer le bloc d'imports actuel par :

  ```ts
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
  ```

- [ ] **Step 2 : Étendre le type `alertConfig`**

  Remplacer la définition du type `alertConfig` (le `useState` qui définit le type inline) par :

  ```ts
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
  ```

- [ ] **Step 3 : Ajouter l'état photos et uploading**

  Après `const [loading, setLoading] = useState(true);`, ajouter :

  ```ts
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  ```

- [ ] **Step 4 : Charger les photos dans `loadChantier`**

  Dans `loadChantier`, après `setChantier(data);`, ajouter :

  ```ts
  setPhotos(data?.photos ?? []);
  ```

- [ ] **Step 5 : Ajouter le handler `handleAddPhoto`**

  Après la fonction `handleToggleTache`, ajouter :

  ```ts
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
  ```

- [ ] **Step 6 : Ajouter le handler `handleRemovePhoto`**

  Après `handleUploadAndSave`, ajouter :

  ```ts
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
  ```

- [ ] **Step 7 : Ajouter `renderPhotosSection` (footer de la FlatList)**

  Avant le `return`, ajouter :

  ```ts
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
  ```

- [ ] **Step 8 : Remplacer le bloc conditionnel tâches par une FlatList avec `ListFooterComponent`**

  Actuellement le JSX contient :
  ```tsx
  {total === 0 ? (
    <View style={styles.centered}>...</View>
  ) : (
    <FlatList ... />
  )}
  ```

  Supprimer entièrement ce ternaire et le remplacer par une FlatList unique qui gère les deux cas (tâches vides + photos) :

  ```tsx
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
  ```

- [ ] **Step 9 : Passer les props `confirmText`, `cancelText`, `onCancel` au `CustomAlert`**

  Mettre à jour le `<CustomAlert>` en bas du JSX :

  ```tsx
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
  ```

- [ ] **Step 10 : Ajouter les styles**

  Dans `StyleSheet.create({...})`, ajouter à la fin :

  ```ts
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
  ```

- [ ] **Step 11 : Commit**

  ```bash
  git add FicheChantier.tsx
  git commit -m "feat: add photo section to FicheChantier"
  ```

---

## Vérification manuelle

- [ ] Ouvrir un chantier existant → la section "Photos" apparaît sous les tâches
- [ ] Appuyer "Ajouter une photo" → alert avec "📷 Caméra" / "🖼️ Galerie"
- [ ] Prendre ou choisir une photo → miniature apparaît dans la grille
- [ ] Recharger la fiche → la photo est toujours là (persistée en BDD)
- [ ] Appui long sur une miniature → alert de confirmation suppression
- [ ] Confirmer → la photo disparaît de la grille et de Supabase Storage
- [ ] Vérifier sur un chantier sans tâches → section photos toujours visible
