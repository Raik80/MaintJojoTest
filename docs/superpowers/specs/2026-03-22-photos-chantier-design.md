# Photos Chantier — Design Spec

**Date:** 2026-03-22
**Statut:** Approuvé

## Objectif

Permettre d'ajouter, visualiser et supprimer des photos directement depuis la fiche d'un chantier (`FicheChantier`), sous la checklist des tâches.

## Contexte

L'app React Native / Expo utilise Supabase comme backend. La section interventions dispose déjà d'un système de photos (`expo-image-picker` + Supabase Storage bucket `photos`). Les chantiers n'ont pas encore de photos. Les photos des chantiers doivent être séparées de celles des interventions.

## Architecture

### Stockage

- **Bucket Supabase :** `photos` (existant) — sous-dossier `chantiers/`
- **Chemin fichier :** `chantiers/<chantierId>/<timestamp>.<ext>` (même structure que les interventions : `<interventionId>/<timestamp>.<ext>`)
- **Colonne BDD :** `photos text[]` à ajouter à la table `chantiers` dans Supabase

### Type de données

```ts
// Mise à jour de SavedChantier dans chantierStorage.ts
export type SavedChantier = {
  id: string;
  localisation: string;
  taches: Tache[];
  photos: string[];        // URLs publiques Supabase Storage
  date_creation: string;
  status: 'en_cours' | 'termine';
};
```

## Composants modifiés

### `src/utils/chantierStorage.ts`

Trois nouvelles fonctions :

1. **`uploadPhotoChantier(chantierId: string, uri: string): Promise<string | null>`**
   Upload une image depuis un URI local vers `chantiers/<chantierId>/<timestamp>.<ext>`. Retourne l'URL publique ou `null` en cas d'erreur. Même implémentation que `uploadPhoto` dans `interventionStorage.ts`.

2. **`supprimerPhotoChantier(photoUrl: string): Promise<boolean>`**
   Extrait le chemin depuis l'URL publique via `split('/storage/v1/object/public/photos/')` et supprime le fichier du storage. Même logique que `supprimerPhoto`.

3. **`updatePhotosChantier(id: string, photos: string[]): Promise<boolean>`**
   Met à jour le champ `photos` du chantier dans Supabase. Même pattern que `updateTachesChantier`.

### `FicheChantier.tsx`

Nouvelle section "Photos" affichée via `ListFooterComponent` de la `FlatList` (scrollable avec les tâches) :

- **Grille 2 colonnes** des miniatures (composant `Image`)
- **Appui long** sur une photo → `CustomAlert` de confirmation suppression (type `danger`, boutons "Supprimer" / "Annuler")
- **Bouton "Ajouter une photo"** en bas de la section → `CustomAlert` (type `info`, boutons "📷 Caméra" / "🖼️ Galerie") — même pattern que `FicheIntervention.handleAddPhoto`
- **Indicateur de chargement** (`ActivityIndicator`) pendant l'upload ; bouton désactivé pendant ce temps
- **Upload non-optimiste :** l'URL est ajoutée à l'état uniquement après upload réussi (même comportement que `FicheIntervention.handleUploadAndSave`)
- **Suppression UI-first :** la photo est retirée de l'état immédiatement après confirmation, puis supprimée du storage et de la DB

## Flux de données

```
Utilisateur appuie "Ajouter une photo"
  → CustomAlert : "📷 Caméra" ou "🖼️ Galerie"
  → expo-image-picker retourne URI local (ou canceled → rien)
  → setUploading(true)
  → uploadPhotoChantier(chantierId, uri) → URL publique
  → setUploading(false)
  → si succès : updatePhotosChantier(id, [...photos, url]) + setPhotos
  → si échec : CustomAlert erreur
```

```
Utilisateur appui long sur une miniature
  → CustomAlert confirmation "Supprimer" / "Annuler"
  → si confirmé : retirer la photo de l'état local
  → supprimerPhotoChantier(url)
  → updatePhotosChantier(id, nouvelles photos)
```

## Détails d'implémentation

### Format URL Supabase Storage
Les URLs publiques suivent le format : `<supabase_url>/storage/v1/object/public/photos/chantiers/<chantierId>/<timestamp>.<ext>`
La suppression extrait le chemin via `split('/storage/v1/object/public/photos/')` — même logique que `supprimerPhoto`.

### Choix caméra / galerie
`CustomAlert` existant avec `confirmText`, `cancelText`, `onCancel` — pas de bibliothèque ActionSheet externe.
Le type local `alertConfig` dans `FicheChantier.tsx` doit être étendu pour inclure `confirmText?: string`, `cancelText?: string` et `onCancel?: () => void` (actuellement absent du composant, présent dans `FicheIntervention.tsx`).

### Gestion des permissions
`expo-image-picker` gère les permissions automatiquement. Si refusé, retourne `canceled: true` — aucun traitement supplémentaire (même comportement que `FicheIntervention`).

### Suppression : état de chargement
Pas d'indicateur de chargement pendant la suppression — cohérent avec `FicheIntervention`.

### Cas d'échec : photo uploadée mais DB non mise à jour
Si `updatePhotosChantier` échoue après un upload réussi, la photo reste orpheline dans le Storage. Ce cas est accepté — même comportement que `FicheIntervention`.

### Schéma Supabase
Colonne à ajouter manuellement dans Supabase Studio :
```sql
ALTER TABLE chantiers ADD COLUMN photos text[] NOT NULL DEFAULT '{}';
```

## Ce qui n'est pas dans le scope

- Ajout de photos lors de la **création** d'un chantier (`FormulaireChantier`) — non demandé
- Zoom / visualisation plein écran des photos — non demandé
- Limite du nombre de photos — aucune restriction appliquée
