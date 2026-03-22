# Design : Fiche Chantier avec tâches cochables

**Date :** 2026-03-18

## Objectif

Permettre à l'utilisateur de cliquer sur un chantier dans la liste pour ouvrir une fiche détaillée où il peut cocher/décocher les tâches.

## Composants

### `src/utils/chantierStorage.ts` (modification)

Ajouter la fonction :
```ts
export const chargerChantierById = async (id: string): Promise<SavedChantier | null>
```
Implémentation : `.from('chantiers').select('*').eq('id', id).single()`
Cela évite de charger tous les chantiers juste pour en afficher un.

### `FicheChantier.tsx` (nouveau fichier)

**Props :**
```ts
type FicheChantierProps = {
  chantierId: string;
  onBackPress?: () => void;
};
```

**Contenu :**
- Charge le chantier au montage via `chargerChantierById(chantierId)`
- Header : bouton retour + titre = localisation du chantier
- Badge de progression : "X/Y tâches complétées"
- Liste des tâches : chaque item = `Pressable` avec icône checkbox + texte
- Si `taches` est vide : afficher un état vide "Aucune tâche pour ce chantier" (cohérent avec FormulaireChantier)
- Tap sur une tâche : mise à jour locale immédiate (optimistic update) + appel `updateTachesChantier` en arrière-plan. En cas d'échec Supabase : rollback de l'état local + alerte d'erreur simple
- Afficher `date_creation` formatée (cohérent avec ListeChantiers)
- Style dark cohérent (`#050B14`, `#111827`, `#1F2937`) identique au reste de l'app

### `ListeChantiers.tsx` (modification)

- Ajouter prop `onChantierPress?: (id: string) => void`
- Changer le `Pressable` de la card : `onPress` → appelle `onChantierPress(item.id)`
- Conserver `onLongPress` pour la suppression

### `App.tsx` (modification)

- Ajouter `'fiche-chantier'` au type `Screen`
- Ajouter state `selectedChantierId: string` (initialisé à `''`)
- Handler `handleChantierPress(id)` : `setSelectedChantierId(id)` + `setScreen('fiche-chantier')`
- **BackHandler** : ajouter `if (screen === 'fiche-chantier') { setScreen('liste-chantiers'); return true; }` avant la règle `liste-chantiers`
- **Render guard** : `if (screen === 'fiche-chantier' && selectedChantierId)` → rendre `<FicheChantier chantierId={selectedChantierId} onBackPress={() => setScreen('liste-chantiers')} />`
- Passer `onChantierPress={handleChantierPress}` à `<ListeChantiers>`

## Flux de données

```
ListeChantiers
  → onPress card → onChantierPress(id)
    → App.tsx : selectedChantierId = id, screen = 'fiche-chantier'
      → FicheChantier(chantierId)
        → chargerChantierById → charge depuis Supabase
        → tap tâche → update local + updateTachesChantier(id, taches)
        → onBackPress / hardware back → screen = 'liste-chantiers'
```

## Ce qui n'est PAS inclus dans ce scope

- Modifier la localisation
- Supprimer le chantier depuis la fiche
- Changer le statut (en_cours / terminé)
