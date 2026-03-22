# Fiche Chantier Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de cliquer sur un chantier dans la liste pour ouvrir une fiche détaillée où l'on peut cocher/décocher les tâches.

**Architecture:** Nouvel écran `FicheChantier.tsx` chargé par id via une nouvelle fonction `chargerChantierById`. Navigation manuelle state-based dans `App.tsx`. `ListeChantiers` reçoit une prop `onChantierPress` pour déclencher la navigation.

**Tech Stack:** React Native, Expo, TypeScript, Supabase, @expo/vector-icons (MaterialIcons)

---

## Chunk 1: Storage + Composant FicheChantier

### Task 1: Ajouter `chargerChantierById` dans chantierStorage.ts

**Files:**
- Modify: `src/utils/chantierStorage.ts`

- [ ] **Step 1: Ajouter la fonction en bas du fichier**

```ts
export const chargerChantierById = async (id: string): Promise<SavedChantier | null> => {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erreur chargement chantier:', error.message);
      return null;
    }

    return data as SavedChantier;
  } catch (error) {
    console.error('Erreur chargement chantier:', error);
    return null;
  }
};
```

- [ ] **Step 2: Vérifier le fichier**

Ouvrir `src/utils/chantierStorage.ts` et confirmer que :
- `chargerChantierById` est présente et correctement exportée
- `updateTachesChantier` est aussi bien exportée (utilisée dans FicheChantier.tsx)

- [ ] **Step 3: Commit**

```bash
git add src/utils/chantierStorage.ts
git commit -m "feat: add chargerChantierById to chantierStorage"
```

---

### Task 2: Créer `FicheChantier.tsx`

**Files:**
- Create: `FicheChantier.tsx`

- [ ] **Step 1: Créer le fichier avec le contenu suivant**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  Tache,
  chargerChantierById,
  updateTachesChantier,
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
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const loadChantier = useCallback(async () => {
    setLoading(true);
    const data = await chargerChantierById(chantierId);
    setChantier(data);
    setLoading(false);
  }, [chantierId]);

  useEffect(() => { loadChantier(); }, [loadChantier]);

  const handleToggleTache = async (index: number) => {
    if (!chantier) return;

    // Optimistic update
    const newTaches: Tache[] = chantier.taches.map((t, i) =>
      i === index ? { ...t, done: !t.done } : t
    );
    setChantier({ ...chantier, taches: newTaches });

    // Persist
    const success = await updateTachesChantier(chantier.id, newTaches);
    if (!success) {
      // Rollback
      setChantier({ ...chantier });
      setAlertConfig({
        visible: true,
        title: 'Erreur',
        message: 'Impossible de mettre à jour la tâche.',
        type: 'danger',
        onConfirm: closeAlert,
      });
    }
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

          {total === 0 ? (
            <View style={styles.centered}>
              <MaterialIcons name="playlist-add-check" size={48} color="#374151" />
              <Text style={styles.emptyText}>Aucune tâche pour ce chantier</Text>
            </View>
          ) : (
            <FlatList
              data={chantier.taches}
              keyExtractor={(_, i) => String(i)}
              renderItem={renderTache}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

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
});

export default FicheChantier;
```

- [ ] **Step 2: Vérifier la création du fichier**

Confirmer que `FicheChantier.tsx` existe à la racine du projet (même niveau que `App.tsx`, `ListeChantiers.tsx`, etc.) : `C:\Users\MRthe\Desktop\travail\MaintJojoTest\FicheChantier.tsx`

- [ ] **Step 3: Commit**

```bash
git add FicheChantier.tsx
git commit -m "feat: add FicheChantier screen with task toggle"
```

---

## Chunk 2: Navigation

### Task 3: Modifier `ListeChantiers.tsx`

**Files:**
- Modify: `ListeChantiers.tsx`

- [ ] **Step 1: Ajouter la prop `onChantierPress` au type**

Remplacer :
```ts
type ListeChantiersProps = {
  onBackPress?: () => void;
};
```
Par :
```ts
type ListeChantiersProps = {
  onBackPress?: () => void;
  onChantierPress?: (id: string) => void;
};
```

- [ ] **Step 2: Destructurer la prop dans le composant**

Remplacer :
```ts
const ListeChantiers: React.FC<ListeChantiersProps> = ({ onBackPress }) => {
```
Par :
```ts
const ListeChantiers: React.FC<ListeChantiersProps> = ({ onBackPress, onChantierPress }) => {
```

- [ ] **Step 3: Ajouter `onPress` sur la card**

Dans `renderItem`, remplacer :
```tsx
<Pressable
  onLongPress={() => handleDelete(item)}
  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
>
```
Par :
```tsx
<Pressable
  onPress={() => onChantierPress?.(item.id)}
  onLongPress={() => handleDelete(item)}
  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
>
```

- [ ] **Step 4: Commit**

```bash
git add ListeChantiers.tsx
git commit -m "feat: add onChantierPress prop to ListeChantiers"
```

---

### Task 4: Modifier `App.tsx`

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Importer FicheChantier**

Ajouter après les imports existants de chantier :
```ts
import FicheChantier from './FicheChantier';
```

- [ ] **Step 2: Ajouter `'fiche-chantier'` au type Screen**

Remplacer :
```ts
type Screen = 'home' | 'nouvelle-intervention' | 'formulaire-intervention' | 'liste-interventions' | 'fiche-intervention' | 'modifier-intervention' | 'chantier' | 'nouveau-chantier' | 'formulaire-chantier' | 'liste-chantiers';
```
Par :
```ts
type Screen = 'home' | 'nouvelle-intervention' | 'formulaire-intervention' | 'liste-interventions' | 'fiche-intervention' | 'modifier-intervention' | 'chantier' | 'nouveau-chantier' | 'formulaire-chantier' | 'liste-chantiers' | 'fiche-chantier';
```

- [ ] **Step 3: Ajouter le state `selectedChantierId`**

Ajouter après `selectedInterventionId` (ligne ~25) :
```ts
const [selectedChantierId, setSelectedChantierId] = useState<string>('');
```

- [ ] **Step 4: Ajouter le handler `handleChantierPress`**

Ajouter après `handleChantierSaveSuccess` :
```ts
const handleChantierPress = (id: string) => {
  setSelectedChantierId(id);
  setScreen('fiche-chantier');
};
```

- [ ] **Step 5: Ajouter le BackHandler pour `fiche-chantier`**

Dans le `useEffect` du BackHandler, ajouter avant la règle `liste-chantiers` :
```ts
if (screen === 'fiche-chantier')  { setScreen('liste-chantiers');  return true; }
```

- [ ] **Step 6: Ajouter le render block pour `fiche-chantier`**

Ajouter après le block `liste-chantiers` dans `renderScreen` :
```tsx
if (screen === 'fiche-chantier' && selectedChantierId) {
  return (
    <FicheChantier
      chantierId={selectedChantierId}
      onBackPress={() => setScreen('liste-chantiers')}
    />
  );
}
```

- [ ] **Step 7: Passer `onChantierPress` à `ListeChantiers`**

Remplacer :
```tsx
<ListeChantiers
  onBackPress={() => setScreen('chantier')}
/>
```
Par :
```tsx
<ListeChantiers
  onBackPress={() => setScreen('chantier')}
  onChantierPress={handleChantierPress}
/>
```

- [ ] **Step 8: Commit**

```bash
git add App.tsx
git commit -m "feat: wire FicheChantier into App navigation"
```

---

## Vérification manuelle

- [ ] Lancer l'app : `npx expo start`
- [ ] Naviguer vers Chantiers → liste → taper sur une card → fiche s'ouvre
- [ ] Cocher/décocher une tâche → le badge de progression se met à jour
- [ ] Bouton retour header → retour à la liste
- [ ] Bouton hardware back Android → retour à la liste
- [ ] Long press sur une card dans la liste → toujours la suppression
