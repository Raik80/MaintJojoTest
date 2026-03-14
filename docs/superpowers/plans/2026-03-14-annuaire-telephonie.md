# Annuaire UL & Interventions Téléphonie — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Détecter automatiquement les numéros internes UL (5 chiffres) dans le texte d'une intervention, interroger l'annuaire UL, et pré-remplir le nom de la personne dans le formulaire.

**Architecture:** Le parser extrait le numéro interne, `NouvelleIntervention` appelle l'API annuaire de façon asynchrone avant de naviguer vers `FormulaireIntervention`, qui affiche les nouvelles infos. Les données sont sauvegardées dans Supabase via deux nouvelles colonnes.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript, Supabase, MaterialIcons

---

## Chunk 1 : Fondations — Service annuaire + Parser + Storage

### Task 1 : Ajouter les colonnes Supabase

**Fichiers :**
- Aucun fichier de code — action manuelle dans Supabase

- [ ] **Étape 1 : Ajouter les colonnes dans Supabase**

Ouvrir le dashboard Supabase → SQL Editor et exécuter :

```sql
ALTER TABLE interventions
  ADD COLUMN numero_interne TEXT,
  ADD COLUMN nom_personne TEXT;
```

- [ ] **Étape 2 : Vérifier**

Dans Supabase → Table Editor → `interventions` : les deux colonnes apparaissent, nullable, sans valeur par défaut.

---

### Task 2 : Créer `src/utils/annuaireService.ts`

**Fichiers :**
- Créer : `src/utils/annuaireService.ts`

- [ ] **Étape 1 : Créer le fichier**

```typescript
// src/utils/annuaireService.ts

const ANNUAIRE_BASE_URL = 'https://annuaire-web.univ-lorraine.fr/p/ldapsearch';
const TIMEOUT_MS = 5000;

export type PersonneAnnuaire = {
    displayName: string;
    nom: string;
    prenom: string;
    telephone: string; // décodé
    affectation: string;
};

/**
 * Décode une chaîne obfusquée par décalage César +1.
 * Ex: ",44!4!83!85!61!54" → "+33 3 72 74 50 43"
 */
export const decoderChaine = (s: string): string =>
    s.split('').map(c => String.fromCharCode(c.charCodeAt(0) - 1)).join('');

/**
 * Interroge l'annuaire UL avec un numéro interne à 5 chiffres.
 * Retourne la liste des personnes trouvées (vide si aucune).
 * Lève une erreur en cas de problème réseau ou timeout.
 */
export const rechercherParNumero = async (numeroInterne: string): Promise<PersonneAnnuaire[]> => {
    const url = `${ANNUAIRE_BASE_URL}?valeur=${encodeURIComponent(numeroInterne)}&filtervalue=&withvac=false`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }

        const json = await response.json();
        const items: any[] = json?.items ?? [];

        return items.map((item): PersonneAnnuaire => ({
            displayName: item.displayName ?? '',
            nom: item.nom ?? '',
            prenom: item.prenom ?? '',
            telephone: item.telephone ? decoderChaine(item.telephone) : '',
            affectation: item.affectation ?? '',
        }));
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error?.name === 'AbortError') {
            throw new Error('Timeout : impossible de contacter l\'annuaire');
        }
        throw error;
    }
};
```

- [ ] **Étape 2 : Commit**

```bash
git add src/utils/annuaireService.ts
git commit -m "feat: add annuaireService for UL directory lookup"
```

---

### Task 3 : Étendre `interventionParser.ts`

**Fichiers :**
- Modifier : `src/utils/interventionParser.ts`

- [ ] **Étape 1 : Ajouter `numeroInterne` et `nomPersonne` à `InterventionExtractedData`**

Remplacer les lignes 4–10 (la définition complète du type) par :

```typescript
export type InterventionExtractedData = {
    batiment: string;
    entree: string;
    etage: string;
    piece: string;
    typeIntervention: string;
    numeroInterne?: string;  // Numéro interne téléphonie (5 chiffres)
    nomPersonne?: string;    // Nom récupéré depuis l'annuaire
};
```

- [ ] **Étape 2 : Ajouter le type "Téléphonie" dans `TYPES_INTERVENTION`**

À la fin du tableau `TYPES_INTERVENTION` (avant le `];` de fermeture, après le bloc `Réseau`), ajouter :

```typescript
    {
        type: "Téléphonie",
        keywords: [
            "telephone hs", "téléphone hs",
            "telephone qui repond plus", "téléphone qui répond plus",
            "ne repond plus", "ne répond plus",
            "probleme telephone", "problème téléphone",
            "telephone", "téléphone",
        ],
    },
```

- [ ] **Étape 3 : Initialiser `result` avec les nouveaux champs**

Dans `analyserNotesIntervention`, **remplacer** le bloc d'initialisation de `result` (lignes 142–148) par :

```typescript
    const result: InterventionExtractedData = {
        batiment: "",
        entree: "",
        etage: "",
        piece: "",
        typeIntervention: "",
        numeroInterne: undefined,
        nomPersonne: undefined,
    };
```

- [ ] **Étape 4 : Détecter le numéro interne et forcer le type**

Insérer le bloc suivant **directement avant** le commentaire `// ── 4. Déduction du Type d'intervention` (qui se trouve vers la ligne 271 du fichier original) :

```typescript
    // ── Détection du numéro interne téléphonie (exactement 5 chiffres) ──
    // Cette détection est prioritaire et court-circuite la déduction du type.
    const numeroMatch = texte.match(/\b(\d{5})\b/);
    if (numeroMatch) {
        result.numeroInterne = numeroMatch[1];
        result.typeIntervention = "Téléphonie";
    }
```

- [ ] **Étape 5 : Modifier la déduction du type pour ne pas écraser "Téléphonie"**

Envelopper le bloc de déduction du type (la boucle `for (const categorie of TYPES_INTERVENTION)` et le `if (!result.typeIntervention && ...)` final) dans une condition :

```typescript
    // ── 4. Déduction du Type d'intervention ────────────────
    // Skippé si le type a déjà été défini (ex: détection téléphonie ci-dessus)
    if (!result.typeIntervention) {
        for (const categorie of TYPES_INTERVENTION) {
            // ... code existant inchangé ...
        }
        if (!result.typeIntervention && texte.trim().length > 0) {
            result.typeIntervention = "Autres";
        }
    }
```

- [ ] **Étape 6 : Commit**

```bash
git add src/utils/interventionParser.ts
git commit -m "feat: detect 5-digit internal numbers, add Telephonie intervention type"
```

---

### Task 4 : Mettre à jour `interventionStorage.ts`

**Fichiers :**
- Modifier : `src/utils/interventionStorage.ts`

> **Note importante :** `SavedIntervention` est défini comme `InterventionExtractedData & { ... }` (intersection type, ligne 8). Une fois que `InterventionExtractedData` aura `numeroInterne?` et `nomPersonne?` (Task 3), ces champs seront automatiquement disponibles sur `SavedIntervention` par héritage. **Ne pas** re-déclarer ces champs directement dans `SavedIntervention`.

- [ ] **Étape 1 : Étendre `SupabaseRow`**

Remplacer la définition complète de `SupabaseRow` (lignes 21–34) par :

```typescript
type SupabaseRow = {
    id: string;
    batiment: string;
    entree: string;
    etage: string;
    piece: string;
    type_intervention: string;
    note_originale: string;
    commentaire: string;
    photos: string[];
    status: 'en_cours' | 'terminee';
    date_creation: string;
    date_terminee: string | null;
    numero_interne: string | null;
    nom_personne: string | null;
};
```

- [ ] **Étape 2 : Mettre à jour `rowToIntervention`**

Remplacer la définition complète de `rowToIntervention` (lignes 39–52) par :

```typescript
const rowToIntervention = (row: SupabaseRow): SavedIntervention => ({
    id: row.id,
    batiment: row.batiment || '',
    entree: row.entree || '',
    etage: row.etage || '',
    piece: row.piece || '',
    typeIntervention: row.type_intervention || '',
    noteOriginale: row.note_originale || '',
    commentaire: row.commentaire || '',
    photos: row.photos || [],
    status: row.status || 'en_cours',
    dateCreation: row.date_creation,
    dateTerminee: row.date_terminee || undefined,
    numeroInterne: row.numero_interne || undefined,
    nomPersonne: row.nom_personne || undefined,
});
```

- [ ] **Étape 3 : Mettre à jour `sauvegarderInterventions`**

Dans le `.map()` (lignes 85–95), ajouter les deux nouvelles lignes après `status`:

```typescript
        const rows = interventions.map((i, index) => ({
            batiment: i.batiment || '',
            entree: i.entree || '',
            etage: i.etage || '',
            piece: i.piece || '',
            type_intervention: i.typeIntervention || '',
            note_originale: notesOriginales?.[index] || '',
            commentaire: '',
            photos: [],
            status: 'en_cours',
            numero_interne: i.numeroInterne || null,
            nom_personne: i.nomPersonne || null,
        }));
```

- [ ] **Étape 4 : Mettre à jour `updateIntervention`**

Dans le bloc de conversion camelCase → snake_case (lignes 125–134), ajouter après la ligne `date_terminee` :

```typescript
        if (updates.numeroInterne !== undefined) supabaseUpdates.numero_interne = updates.numeroInterne || null;
        if (updates.nomPersonne !== undefined) supabaseUpdates.nom_personne = updates.nomPersonne || null;
```

- [ ] **Étape 5 : Commit**

```bash
git add src/utils/interventionStorage.ts
git commit -m "feat: add numeroInterne and nomPersonne to storage layer"
```

---

## Chunk 2 : Composants UI

### Task 5 : Créer `src/components/PersonSelectionModal.tsx`

**Fichiers :**
- Créer : `src/components/PersonSelectionModal.tsx`

- [ ] **Étape 1 : Créer le composant**

```typescript
// src/components/PersonSelectionModal.tsx
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PersonneAnnuaire } from '../utils/annuaireService';

type PersonSelectionModalProps = {
    visible: boolean;
    personnes: PersonneAnnuaire[];
    numeroInterne: string;
    onSelect: (personne: PersonneAnnuaire) => void;
    onSkip: () => void;
};

const PersonSelectionModal: React.FC<PersonSelectionModalProps> = ({
    visible,
    personnes,
    numeroInterne,
    onSelect,
    onSkip,
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: visible ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [visible, fadeAnim]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <View style={styles.container}>
                    <View style={styles.iconRow}>
                        <MaterialIcons name="phone" size={28} color="#06B6D4" />
                    </View>
                    <Text style={styles.title}>Plusieurs personnes trouvées</Text>
                    <Text style={styles.subtitle}>Numéro interne : {numeroInterne}</Text>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {personnes.map((p, index) => (
                            <Pressable
                                key={index}
                                style={({ pressed }) => [
                                    styles.item,
                                    pressed && styles.itemPressed,
                                ]}
                                onPress={() => onSelect(p)}
                            >
                                <View style={styles.itemContent}>
                                    <Text style={styles.itemName}>{p.displayName}</Text>
                                    {!!p.affectation && (
                                        <Text style={styles.itemAffectation} numberOfLines={2}>
                                            {p.affectation}
                                        </Text>
                                    )}
                                    {!!p.telephone && (
                                        <Text style={styles.itemPhone}>{p.telephone}</Text>
                                    )}
                                </View>
                                <MaterialIcons name="chevron-right" size={20} color="#4B5563" />
                            </Pressable>
                        ))}
                    </ScrollView>

                    <Pressable
                        style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
                        onPress={onSkip}
                    >
                        <Text style={styles.skipText}>Continuer sans sélectionner</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(5, 11, 20, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    container: {
        width: '100%',
        backgroundColor: '#111827',
        borderRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    iconRow: {
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        color: '#F5F7FB',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        color: '#06B6D4',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: '600',
    },
    list: {
        maxHeight: 300,
        marginBottom: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#182236',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
    },
    itemPressed: {
        backgroundColor: '#1F2C44',
    },
    itemContent: {
        flex: 1,
    },
    itemName: {
        color: '#F5F7FB',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    itemAffectation: {
        color: '#8B95A7',
        fontSize: 12,
        marginBottom: 2,
    },
    itemPhone: {
        color: '#06B6D4',
        fontSize: 12,
    },
    skipButton: {
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#182236',
    },
    skipButtonPressed: {
        backgroundColor: '#1F2C44',
    },
    skipText: {
        color: '#8B95A7',
        fontSize: 14,
        fontWeight: '500',
    },
});

export default PersonSelectionModal;
```

- [ ] **Étape 2 : Commit**

```bash
git add src/components/PersonSelectionModal.tsx
git commit -m "feat: add PersonSelectionModal for annuaire results"
```

---

### Task 6 : Mettre à jour `NouvelleIntervention.tsx`

**Fichiers :**
- Modifier : `NouvelleIntervention.tsx`

- [ ] **Étape 1 : Mettre à jour les imports**

Modifier l'import React Native existant pour y ajouter `ActivityIndicator` et `Alert` :

```typescript
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
```

Ajouter après l'import de `interventionParser` :

```typescript
import { rechercherParNumero, PersonneAnnuaire } from './src/utils/annuaireService';
import PersonSelectionModal from './src/components/PersonSelectionModal';
```

- [ ] **Étape 2 : Ajouter les états**

Après `const [notes, setNotes] = useState('');`, ajouter :

```typescript
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPersonnes, setModalPersonnes] = useState<PersonneAnnuaire[]>([]);
  const [modalNumero, setModalNumero] = useState('');
  const resolveModalRef = React.useRef<((p: PersonneAnnuaire | null) => void) | null>(null);
```

- [ ] **Étape 3 : Ajouter les handlers de la modale**

Après les états, avant `handleBackPress`, ajouter :

```typescript
  const afficherModalSelection = (personnes: PersonneAnnuaire[], numero: string): Promise<PersonneAnnuaire | null> => {
    return new Promise(resolve => {
      resolveModalRef.current = resolve;
      setModalPersonnes(personnes);
      setModalNumero(numero);
      setModalVisible(true);
    });
  };

  const handleModalSelect = (personne: PersonneAnnuaire) => {
    setModalVisible(false);
    resolveModalRef.current?.(personne);
    resolveModalRef.current = null;
  };

  const handleModalSkip = () => {
    setModalVisible(false);
    resolveModalRef.current?.(null);
    resolveModalRef.current = null;
  };
```

- [ ] **Étape 4 : Réécrire `handleAnalyzePress` en async**

Remplacer la fonction `handleAnalyzePress` existante (lignes 43–50) par :

```typescript
  const handleAnalyzePress = async () => {
    if (!notes.trim()) return;

    const extractedDataArray = analyserMultipleInterventions(notes);

    const hasNumeros = extractedDataArray.some(d => !!d.numeroInterne);
    if (!hasNumeros) {
      onAnalyzeComplete?.(notes, extractedDataArray);
      return;
    }

    setLoading(true);

    const enriched = [...extractedDataArray];
    for (let i = 0; i < enriched.length; i++) {
      const numero = enriched[i].numeroInterne;
      if (!numero) continue;

      try {
        const personnes = await rechercherParNumero(numero);

        if (personnes.length === 0) {
          Alert.alert(
            'Annuaire',
            `Aucune personne trouvée pour le numéro ${numero}.`,
            [{ text: 'OK' }]
          );
        } else if (personnes.length === 1) {
          enriched[i] = { ...enriched[i], nomPersonne: personnes[0].displayName };
        } else {
          setLoading(false);
          const selected = await afficherModalSelection(personnes, numero);
          setLoading(true);
          if (selected) {
            enriched[i] = { ...enriched[i], nomPersonne: selected.displayName };
          }
        }
      } catch {
        Alert.alert(
          'Annuaire',
          'Impossible de contacter l\'annuaire. La recherche sera ignorée.',
          [{ text: 'OK' }]
        );
      }
    }

    setLoading(false);
    onAnalyzeComplete?.(notes, enriched);
  };
```

- [ ] **Étape 5 : Mettre à jour le bouton "Analyser & Continuer"**

Remplacer le `<Pressable>` du bouton (lignes 94–106) par :

```typescript
          <Pressable
            onPress={handleAnalyzePress}
            disabled={loading}
            accessibilityLabel="Analyser et continuer"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.saveButton,
              pressed && !loading && styles.saveButtonPressed,
              loading && styles.saveButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Analyser & Continuer</Text>
              </>
            )}
          </Pressable>
```

Ajouter dans `StyleSheet.create` après `saveButtonPressed` :

```typescript
  saveButtonDisabled: {
    opacity: 0.7,
  },
```

- [ ] **Étape 6 : Ajouter `PersonSelectionModal` dans le JSX**

Juste avant `</SafeAreaView>`, ajouter :

```typescript
      <PersonSelectionModal
        visible={modalVisible}
        personnes={modalPersonnes}
        numeroInterne={modalNumero}
        onSelect={handleModalSelect}
        onSkip={handleModalSkip}
      />
```

- [ ] **Étape 7 : Commit**

```bash
git add NouvelleIntervention.tsx
git commit -m "feat: async annuaire lookup in NouvelleIntervention with person selection modal"
```

---

### Task 7 : Mettre à jour `FormulaireIntervention.tsx`

**Fichiers :**
- Modifier : `FormulaireIntervention.tsx`

> Les noms de styles existants dans ce fichier sont : `inputGroup`, `inputLabel`, `textInput`, `sectionTitle`. Les utiliser tels quels.

- [ ] **Étape 1 : Ajouter la section "Personne concernée"**

Dans la `ScrollView` du formulaire, ajouter après le `<TextInput>` des notes originales (ligne ~197-203) et avant `<View style={{ height: 20 }} />` :

```typescript
                    {/* Section Personne concernée (téléphonie) */}
                    {(!!current.nomPersonne || !!current.numeroInterne) && (
                        <>
                            <Text style={[styles.sectionTitle, { marginTop: 10, color: '#06B6D4' }]}>
                                Personne concernée
                            </Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Numéro interne</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={current.numeroInterne ?? ''}
                                    onChangeText={v => updateField('numeroInterne', v)}
                                    placeholder="ex: 45043"
                                    placeholderTextColor="#8B95A7"
                                    keyboardType="number-pad"
                                    maxLength={5}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Nom</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={current.nomPersonne ?? ''}
                                    onChangeText={v => updateField('nomPersonne', v)}
                                    placeholder="Nom de la personne"
                                    placeholderTextColor="#8B95A7"
                                />
                            </View>
                        </>
                    )}
```

- [ ] **Étape 2 : Commit**

```bash
git add FormulaireIntervention.tsx
git commit -m "feat: show personne concernee section in FormulaireIntervention for telephonie"
```

---

## Chunk 3 : Écrans d'affichage

### Task 8 : Mettre à jour `FicheIntervention.tsx`

**Fichiers :**
- Modifier : `FicheIntervention.tsx`

- [ ] **Étape 1 : Ajouter "Téléphonie" dans `getTypeConfig`**

Remplacer la fonction `getTypeConfig` (lignes 84–91) par :

```typescript
    const getTypeConfig = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('téléphonie') || t.includes('telephonie')) return { icon: 'phone', color: '#06B6D4' };
        if (t.includes('éclairage') || t.includes('lampe')) return { icon: 'lightbulb-outline', color: '#FBBF24' };
        if (t.includes('prise')) return { icon: 'electrical-services', color: '#F87171' };
        if (t.includes('contrôle') || t.includes('accès')) return { icon: 'lock-outline', color: '#34D399' };
        if (t.includes('réseau') || t.includes('wifi')) return { icon: 'wifi', color: '#38BDF8' };
        return { icon: 'build', color: '#A78BFA' };
    };
```

- [ ] **Étape 2 : Ajouter l'affichage de la personne dans `infoGrid`**

Dans la `<View style={styles.infoGrid}>` (ligne ~314), après le dernier `InfoRow` existant (après `dateTerminee` ou `event`), ajouter :

```typescript
                        {/* Personne concernée (téléphonie) */}
                        {(!!intervention.numeroInterne || !!intervention.nomPersonne) && (
                            <InfoRow
                                icon="phone"
                                label="Personne"
                                value={
                                    intervention.numeroInterne && intervention.nomPersonne
                                        ? `${intervention.numeroInterne} — ${intervention.nomPersonne}`
                                        : intervention.numeroInterne
                                            ? `Numéro : ${intervention.numeroInterne}`
                                            : intervention.nomPersonne ?? ''
                                }
                            />
                        )}
```

- [ ] **Étape 3 : Commit**

```bash
git add FicheIntervention.tsx
git commit -m "feat: display telephonie type and person info in FicheIntervention"
```

---

### Task 9 : Mettre à jour `ModifierIntervention.tsx`

**Fichiers :**
- Modifier : `ModifierIntervention.tsx`

> Les noms de styles existants dans ce fichier sont : `sectionContainer`, `sectionHeader`, `sectionTitle`, `inputGroup`, `inputLabel`, `textInput`. Les utiliser tels quels.

- [ ] **Étape 1 : Ajouter les états (après `setCommentaire` ligne 43)**

```typescript
    const [numeroInterne, setNumeroInterne] = useState('');
    const [nomPersonne, setNomPersonne] = useState('');
```

- [ ] **Étape 2 : Initialiser dans `loadIntervention` (après `setCommentaire`)**

```typescript
            setNumeroInterne(found.numeroInterne || '');
            setNomPersonne(found.nomPersonne || '');
```

- [ ] **Étape 3 : Inclure dans `handleSave`**

Dans l'appel `updateIntervention`, ajouter après `commentaire` :

```typescript
            numeroInterne: numeroInterne.trim() || undefined,
            nomPersonne: nomPersonne.trim() || undefined,
```

- [ ] **Étape 4 : Ajouter la section "Personne concernée" dans le JSX**

Dans la `ScrollView`, ajouter une nouvelle section après la section "Commentaire" et avant le bouton de sauvegarde :

```typescript
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
```

- [ ] **Étape 5 : Commit**

```bash
git add ModifierIntervention.tsx
git commit -m "feat: add numeroInterne and nomPersonne fields to ModifierIntervention"
```

---

## Vérification finale

- [ ] **Lancer l'application**

```bash
npx expo start
```

- [ ] **Test scénario 1 : numéro trouvé (1 résultat)**
  1. Taper `45043 téléphone HS` dans Nouvelle Intervention
  2. Cliquer "Analyser & Continuer" → spinner visible
  3. Vérifier : FormulaireIntervention affiche type="Téléphonie", numéro=45043, nom rempli

- [ ] **Test scénario 2 : plusieurs résultats**
  1. Taper un numéro qui retourne 2+ personnes
  2. Vérifier : modale avec liste des personnes (nom + affectation)
  3. Sélectionner → formulaire pré-rempli
  4. Tester "Continuer sans sélectionner" → formulaire sans nom

- [ ] **Test scénario 3 : numéro inexistant**
  1. Taper `99999 téléphone HS`
  2. Vérifier : alerte "Aucune personne trouvée", puis formulaire normal

- [ ] **Test scénario 4 : intervention normale**
  1. Taper `néon clignote salle 102 bat A 2A`
  2. Vérifier : flux inchangé, pas d'appel API

- [ ] **Test scénario 5 : sauvegarde et affichage**
  1. Valider une intervention téléphonie
  2. Ouvrir la fiche → icône téléphone cyan, "45043 — Nom Prénom" visible
  3. Cliquer "Modifier" → champs numéro/nom pré-remplis

- [ ] **Commit final**

```bash
git add -A
git commit -m "feat: complete annuaire UL telephonie integration"
```
