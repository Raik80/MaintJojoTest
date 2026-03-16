# Design — Feature Chantier

**Date :** 2026-03-16
**Projet :** MaintJojo (React Native / Expo + Supabase)

---

## Contexte

L'app MaintJojo gère des interventions techniques. On ajoute une feature "Chantier" : créer des chantiers avec localisation + checklist de tâches, en réutilisant la logique de détection de bâtiments existante.

---

## Types canoniques — `src/utils/chantierStorage.ts`

`Tache` est définie **uniquement** dans `chantierStorage.ts`. `chantierParser.ts` l'importe depuis `chantierStorage.ts`.

```ts
// src/utils/chantierStorage.ts
export type Tache = {
  description: string;
  done: boolean;
};

export type SavedChantier = {
  id: string;
  localisation: string;
  taches: Tache[];
  date_creation: string;   // ISO string
  status: 'en_cours' | 'termine';
};
```

---

## Analyse du texte — `src/utils/chantierParser.ts` (nouveau fichier)

```ts
import { Tache } from './chantierStorage';
import { analyserNotesIntervention } from './interventionParser';

export type ChantierAnalyse = {
  localisation: string;
  taches: Tache[];
};

export const analyserChantier = (texte: string): ChantierAnalyse
```

**Algorithme :**
1. Si `texte.trim()` est vide → retourner `{ localisation: "Localisation non détectée", taches: [] }`.
2. Séparer par lignes, filtrer les vides.
3. Pour chaque ligne, appeler `analyserNotesIntervention(ligne)`.
4. La **première** ligne dont le résultat a `batiment !== ""` → localisation.
   - Format : `batiment + (entree ? " — Entrée " + entree : "")`.
   - Cette ligne est **entièrement consommée** comme localisation (non ajoutée aux tâches).
5. Si aucune ligne ne contient de bâtiment → `localisation = "Localisation non détectée"`.
6. Toutes les autres lignes → `{ description: ligne, done: false }`.

**Guard dans `NouveauChantier` :** le bouton "Analyser & Continuer" est désactivé (ou fait un `return` immédiat) si `texte.trim() === ""`, identique au pattern de `NouvelleIntervention`.

---

## Table Supabase `chantiers`

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid | PK, généré auto |
| `localisation` | text | chaîne assemblée |
| `taches` | jsonb | `[{ description, done }]` |
| `date_creation` | timestamptz | défaut `now()` |
| `status` | text | `'en_cours'` par défaut |

**Pas de mapper nécessaire :** les noms de colonnes Supabase (`id`, `localisation`, `taches`, `date_creation`, `status`) correspondent exactement aux champs de `SavedChantier`. `chargerChantiers` peut caster directement `data as SavedChantier[]` sans fonction de conversion snake_case → camelCase, contrairement à `interventionStorage.ts`.

---

## `src/utils/chantierStorage.ts` — fonctions

```ts
// Charge tous les chantiers, triés par date_creation desc
export const chargerChantiers = async (): Promise<SavedChantier[]>

// Insère un nouveau chantier, retourne true si succès
export const sauvegarderChantier = async (
  localisation: string,
  taches: Tache[]
): Promise<boolean>

// Met à jour les tâches d'un chantier — stub pour usage futur (détail chantier)
// Non appelé dans cette version, mais nécessaire pour la cohérence de la surface CRUD
export const updateTachesChantier = async (
  id: string,
  taches: Tache[]
): Promise<boolean>

// Supprime un chantier par ID
export const supprimerChantier = async (id: string): Promise<boolean>

// Supprime tous les chantiers
// Utiliser le même workaround Supabase que supprimerToutesInterventions :
// .delete().neq('id', '00000000-0000-0000-0000-000000000000')
export const supprimerTousChantiers = async (): Promise<boolean>
```

---

## Navigation et état dans `App.tsx`

**Type Screen final :**
```ts
type Screen =
  | 'home'
  | 'nouvelle-intervention'
  | 'formulaire-intervention'
  | 'liste-interventions'
  | 'fiche-intervention'
  | 'modifier-intervention'
  | 'chantier'
  | 'nouveau-chantier'
  | 'formulaire-chantier'
  | 'liste-chantiers';
```

**Nouvel état intermédiaire** (à côté de `interventionsData` et `originalNotes`) :
```ts
const [chantierAnalyse, setChantierAnalyse] = useState<ChantierAnalyse | null>(null);
```

**Handler d'analyse :**
```ts
const handleChantierAnalyseComplete = (result: ChantierAnalyse) => {
  setChantierAnalyse(result);
  setScreen('formulaire-chantier');
};
```

**Handler de sauvegarde réussie :**
```ts
const handleChantierSaveSuccess = () => {
  setChantierAnalyse(null);
  setScreen('chantier');
};
```

**BackHandler chain** (dans le useEffect existant, à ajouter avant le `return false`) :
```ts
if (screen === 'formulaire-chantier') { setScreen('nouveau-chantier'); return true; }
if (screen === 'nouveau-chantier')    { setScreen('chantier');          return true; }
if (screen === 'liste-chantiers')     { setScreen('chantier');          return true; }
if (screen === 'chantier')            { setScreen('home');              return true; }
```

**Ordre complet de `renderScreen`** (les blocs chantier s'insèrent avant le `return <HomeScreen>` final) :
```ts
// ... blocs intervention existants ...
if (screen === 'chantier') { return <ChantierScreen ... />; }
if (screen === 'nouveau-chantier') { return <NouveauChantier ... />; }
if (screen === 'formulaire-chantier' && chantierAnalyse) {
  return (
    <FormulaireChantier
      localisation={chantierAnalyse.localisation}
      taches={chantierAnalyse.taches}
      onBackPress={() => setScreen('nouveau-chantier')}
      onSaveSuccess={handleChantierSaveSuccess}
    />
  );
}
if (screen === 'liste-chantiers') { return <ListeChantiers onBackPress={() => setScreen('chantier')} />; }
return <HomeScreen ... />;  // fallback existant
```

---

## Interfaces des composants

### `HomeScreen.tsx`
```ts
type HomeScreenProps = {
  onNewInterventionPress?: () => void;
  onViewInterventionsPress?: () => void;
  onChantierPress?: () => void;   // NOUVEAU
};
```
- Nouveau bouton "Chantier" ajouté **sous** les deux boutons existants.
- Style identique au bouton outline "Voir les interventions" (transparent, bordure `#2A364D`).
- Icône : `construction` (MaterialIcons).
- Handler : vibration 10ms + `onChantierPress?.()`.

### `ChantierScreen.tsx`
```ts
type ChantierScreenProps = {
  onNouveauPress?: () => void;
  onVoirPress?: () => void;
  onBackPress?: () => void;
};
```
- Header avec bouton Retour + titre "Chantiers".
- Bouton "Nouveau chantier" (rempli, `#0D6EFD`, icône `add`).
- Bouton "Voir les chantiers" (outline, transparent, icône `list-alt`).

### `NouveauChantier.tsx`
```ts
type NouveauChantierProps = {
  onBackPress?: () => void;
  onAnalyseComplete?: (result: ChantierAnalyse) => void;
};
```
- Identique à `NouvelleIntervention.tsx` structurellement.
- Placeholder : `"Écris la localisation et les tâches...\n\nExemple :\nBat A entrée 2A\nChanger les néons du couloir\nVérifier les prises du labo"`.
- Hint : `"💡 La ligne avec le bâtiment = localisation, le reste = tâches"`.
- Bouton "Analyser & Continuer" → `analyserChantier(texte)` → `onAnalyseComplete(result)`.

### `FormulaireChantier.tsx`
```ts
type FormulaireChantierProps = {
  localisation: string;
  taches: Tache[];
  onBackPress?: () => void;
  onSaveSuccess?: () => void;
};
```
- Header Retour + titre "Nouveau chantier".
- Carte localisation (icône `location-on`, couleur `#34D399`).
- Checklist des tâches — `FormulaireChantier` initialise un `useState<Tache[]>` local copié depuis la prop `taches` au montage. Les toggles modifient uniquement cet état local. La prop et l'état `chantierAnalyse` dans `App.tsx` ne sont pas modifiés.
- Bouton "Sauvegarder" (couleur `#10B981`) → appelle `sauvegarderChantier(localisation, taches)`.
  - Succès → `CustomAlert` type `success` → `onConfirm` appelle `onSaveSuccess?.()`.
  - Échec → `CustomAlert` type `danger` → `onConfirm` ferme l'alerte.
- `CustomAlert` géré localement (même pattern que `FicheIntervention`).

### `ListeChantiers.tsx`
```ts
type ListeChantiersProps = {
  onBackPress?: () => void;
};
```
- Header Retour + titre "Chantiers" + bouton "Tout supprimer" (désactivé si liste vide).
- `FlatList` des chantiers triés par date desc.
- Chaque carte : `localisation` + progression `"X/Y tâches complétées"` + date formatée `DD/MM/YYYY`.
  - Format date : même logique que `FicheIntervention.tsx` (`formatDate(isoString)` → `JJ/MM/AAAA à HH:MM`).
- Appui long sur carte → CustomAlert confirmation suppression → `supprimerChantier(id)` → recharge liste.
- Bouton "Tout supprimer" → CustomAlert → `supprimerTousChantiers()` → recharge liste.
- État vide : icône `build` + texte "Aucun chantier pour l'instant".
- `CustomAlert` géré localement.
- Pas de navigation vers un détail dans cette version.

---

## Style général

Thème sombre existant : fond `#050B14`, cartes `#111827`, bordures `#1F2937`, accent `#38BDF8`. Bouton Sauvegarder : `#10B981`.
