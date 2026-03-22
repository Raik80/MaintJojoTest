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
- **Chemin fichier :** `chantiers/<uuid>.jpg`
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

1. **`uploadPhotoChantier(uri: string): Promise<string | null>`**
   Upload une image depuis un URI local vers `photos/chantiers/<uuid>.jpg`. Retourne l'URL publique ou `null` en cas d'erreur.

2. **`supprimerPhotoChantier(photoUrl: string): Promise<boolean>`**
   Extrait le chemin depuis l'URL publique et supprime le fichier du storage.

3. **`updatePhotosChantier(id: string, photos: string[]): Promise<boolean>`**
   Met à jour le champ `photos` du chantier dans Supabase. Même pattern que `updateTachesChantier`.

### `FicheChantier.tsx`

Nouvelle section "Photos" affichée sous la `FlatList` des tâches :

- **Grille 2 colonnes** des miniatures existantes (composant `Image`)
- **Appui long** sur une photo → alerte de confirmation suppression
- **Bouton "Ajouter une photo"** en bas de section → ActionSheet avec deux choix :
  - Appareil photo (`ImagePicker.launchCameraAsync`)
  - Galerie (`ImagePicker.launchImageLibraryAsync`)
- **Indicateur de chargement** (`ActivityIndicator`) pendant l'upload
- **Mise à jour optimiste :** ajout immédiat en UI, rollback si `updatePhotosChantier` échoue
- La section entière est scrollable avec les tâches (intégrée dans la `FlatList` via `ListFooterComponent`)

## Flux de données

```
Utilisateur appuie "Ajouter une photo"
  → ActionSheet : Appareil photo / Galerie
  → expo-image-picker retourne URI local
  → uploadPhotoChantier(uri) → URL publique
  → updatePhotosChantier(id, [...photos, url])
  → setChantier mis à jour
```

```
Utilisateur appui long sur miniature
  → Alerte confirmation suppression
  → supprimerPhotoChantier(url)
  → updatePhotosChantier(id, photos.filter(...))
  → setChantier mis à jour
```

## Ce qui n'est pas dans le scope

- Ajout de photos lors de la **création** d'un chantier (`FormulaireChantier`) — non demandé
- Zoom / visualisation plein écran des photos — non demandé
- Limite du nombre de photos — non défini, pas de restriction appliquée
