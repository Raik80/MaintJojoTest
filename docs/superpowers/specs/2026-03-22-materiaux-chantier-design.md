# Matériaux Chantier — Design Spec

**Date:** 2026-03-22
**Statut:** Approuvé

## Objectif

Permettre de gérer un catalogue d'équipements électriques (code-barres + nom + référence Rexel), puis d'ajouter des matériaux à une fiche chantier via scan de code-barres avec saisie de quantité.

## Ce que l'utilisateur doit faire

1. **Supabase Studio** — créer la table `equipements` et ajouter la colonne `materiaux` dans `chantiers`
2. **Ouvrir `catalogue.html`** dans un navigateur sur PC — saisir tous ses équipements
3. **Tester l'app** sur téléphone

## Architecture

### Base de données Supabase

**Nouvelle table `equipements` :**
```sql
CREATE TABLE equipements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code_barres text NOT NULL UNIQUE,
  nom text NOT NULL,
  reference_rexel text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Colonne `materiaux` dans `chantiers` :**
```sql
ALTER TABLE chantiers ADD COLUMN materiaux jsonb NOT NULL DEFAULT '[]';
```

**Structure d'un matériau dans le tableau :**
```ts
type Materiau = {
  equipement_id: string;
  code_barres: string;
  nom: string;
  reference_rexel: string;
  quantite: number;
};
```

### Fichiers créés / modifiés

| Fichier | Type | Rôle |
|---------|------|------|
| `catalogue.html` | Nouveau | Page web PC pour gérer le catalogue |
| `src/utils/equipementStorage.ts` | Nouveau | Fonctions Supabase pour `equipements` |
| `src/utils/chantierStorage.ts` | Modifié | Ajout type `Materiau`, fonction `updateMateriauxChantier` |
| `FicheChantier.tsx` | Modifié | Section matériaux avec scan + liste |

---

## Composant 1 : `catalogue.html`

Page HTML standalone (un seul fichier, sans framework) ouvrable dans n'importe quel navigateur sur PC.

**Fonctionnalités :**
- Liste de tous les équipements du catalogue (tableau : code-barres, nom, référence Rexel)
- Formulaire d'ajout : champs `code_barres`, `nom`, `reference_rexel` + bouton "Ajouter"
- Bouton "Supprimer" sur chaque ligne
- Modification inline (clic sur une ligne → champs éditables)
- Parle directement à Supabase via la clé anon (même que l'app)
- Interface en français, style sobre

**Pas de serveur requis** — ouvrir le fichier local depuis le bureau suffit.

---

## Composant 2 : `src/utils/equipementStorage.ts`

```ts
export type Equipement = {
  id: string;
  code_barres: string;
  nom: string;
  reference_rexel: string;
};

// Chercher un équipement par code-barres
export const trouverEquipementParCodeBarres = async (
  codeBarres: string
): Promise<Equipement | null>

// Ajouter un équipement au catalogue (retourne l'équipement créé pour enchaîner sur le modal quantité)
export const ajouterEquipement = async (
  codeBarres: string,
  nom: string,
  referenceRexel: string
): Promise<Equipement | null>
```

---

## Composant 3 : Mise à jour `chantierStorage.ts`

- Ajout du type `Materiau`
- Ajout du champ `materiaux: Materiau[]` dans `SavedChantier`
- Nouvelle fonction `updateMateriauxChantier(id, materiaux)` — même pattern que `updateTachesChantier`

---

## Composant 4 : Section "Matériaux" dans `FicheChantier.tsx`

Affichée sous la section "Photos", via `ListFooterComponent` de la FlatList existante (ou en dessous de la section photos).

### Flux scan :
```
Appui "Scanner un code-barres"
  → expo-camera (mode barcode scan)
  → code-barres détecté
  → trouverEquipementParCodeBarres(code)
  → Trouvé : modal "Quantité" (nom + référence affichés, champ numérique)
             → Confirmer → updateMateriauxChantier(id, [...materiaux, nouveau])
  → Non trouvé : alert "Équipement inconnu — voulez-vous l'ajouter au catalogue ?"
                → Oui → modal "Ajouter équipement" (code-barres pré-rempli, saisir nom + référence)
                       → ajouterEquipement() → puis modal "Quantité"
                → Non → rien
```

### Liste des matériaux :
- Chaque ligne : nom + référence Rexel + quantité
- Swipe ou appui long → suppression avec confirmation
- Bouton "Scanner un code-barres" en bas de section

---

## Détails d'implémentation

### Scan de code-barres
Utiliser `expo-camera` avec `onBarcodeScanned` — déjà disponible dans l'écosystème Expo. Le scan se fait dans un modal plein écran (overlay caméra), se ferme dès qu'un code est détecté.

### Modal quantité
Alert standard ou composant modal simple avec un `TextInput` numérique. Affiche nom + référence de l'équipement en lecture seule, champ quantité à saisir (valeur par défaut : 1).

### Ajout depuis l'app (équipement inconnu)
Modal à deux champs (nom + référence Rexel), code-barres pré-rempli. Appelle `ajouterEquipement()` puis enchaîne directement sur le modal quantité.

### Stockage matériaux
Les matériaux sont stockés en JSONB dans `chantiers.materiaux` — même pattern que `taches` (tableau dans la colonne). Pas de table séparée.

---

## Ce qui n'est pas dans le scope

- Modification de la quantité d'un matériau déjà ajouté (suppression + re-scan suffit)
- Image du produit — non demandé
- Recherche textuelle dans le catalogue depuis l'app
- Export de la liste des matériaux
