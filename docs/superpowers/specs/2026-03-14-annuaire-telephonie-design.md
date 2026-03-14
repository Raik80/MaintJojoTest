# Design — Intégration Annuaire UL & Interventions Téléphonie

**Date :** 2026-03-14
**Statut :** Approuvé

---

## Contexte

L'application MaintJojo gère des interventions de maintenance. L'utilisateur traite des interventions liées à la téléphonie. Il veut pouvoir taper un numéro interne (5 chiffres, ex: `45043`) dans le champ texte de NouvelleIntervention, et que l'application :
1. Reconnaisse automatiquement qu'il s'agit d'une intervention téléphonique
2. Interroge l'annuaire de l'Université de Lorraine pour trouver la personne
3. Pré-remplisse le nom et le numéro interne dans le formulaire

---

## Flux utilisateur

```
NouvelleIntervention
  L'utilisateur tape (une ou plusieurs lignes) :
    "45043 téléphone HS"
    "néon clignote salle 102 bat A"
  → clic "Analyser & Continuer"
      → Bouton désactivé + spinner pendant les appels réseau
      → Pour chaque ligne : Parser détecte un numéro 5 chiffres → type = "Téléphonie"
      → Pour chaque intervention avec numeroInterne, appel API séquentiel :
          → 0 résultat : alerte "Aucune personne trouvée pour XXXXX", continue sans personne pour cette ligne
          → 1 résultat : sélection automatique pour cette ligne
          → 2+ résultats : modale de sélection (personnalisée par ligne)
      → FormulaireIntervention avec les interventions, chacune ayant son nomPersonne/numeroInterne si trouvé
```

---

## API Annuaire UL

**Endpoint :** `https://annuaire-web.univ-lorraine.fr/p/ldapsearch?valeur={numero}&filtervalue=&withvac=false`
**Méthode :** GET
**Accès :** Public (accessible depuis n'importe où)
**Timeout :** 5 secondes

**Structure de réponse :**
```json
{
  "total_count": 2,
  "code_result": "200",
  "items": [
    {
      "displayName": "Jonathan Odille",
      "nom": "Odille",
      "prenom": "Jonathan",
      "telephone": ",44!4!83!85!61!54",
      "affectation": "Faculté des Sciences et Technologies (FST)",
      "enActivite": true
    }
  ]
}
```

**Décodage :** Les champs `telephone` et `mail` sont obfusqués via décalage César +1. Pour décoder : soustraire 1 au code ASCII de chaque caractère.
- Exemple : `",44!4!83!85!61!54"` → `"+33 3 72 74 50 43"`
- Fonction : `str.split('').map(c => String.fromCharCode(c.charCodeAt(0) - 1)).join('')`

**Champs utilisés :**
- `displayName` → nom affiché + stocké (`nom_personne`)
- `telephone` (décodé) → affiché dans la modale uniquement pour aider à identifier
- `affectation` → affiché dans la modale pour aider à identifier la personne

---

## Fichiers à créer ou modifier

### Nouveau fichier : `src/utils/annuaireService.ts`

Responsabilités :
- Type `PersonneAnnuaire` : `{ displayName: string, nom: string, prenom: string, telephone: string, affectation: string }`
- `decoderChaine(s: string): string` — décalage César -1
- `rechercherParNumero(numeroInterne: string): Promise<PersonneAnnuaire[]>` — appel API avec timeout 5s + décodage du champ `telephone`
- En cas d'erreur réseau ou timeout : throw une erreur avec message clair

### Nouveau composant : `src/components/PersonSelectionModal.tsx`

Responsabilités :
- Affiche une liste de `PersonneAnnuaire[]`
- Chaque item : nom complet + affectation + téléphone décodé
- Actions : sélectionner une personne | "Continuer sans sélectionner"
- Quand "Continuer sans sélectionner" → `personneSelectionnee = null`
- **Visuels identiques à `CustomAlert.tsx`** : overlay `rgba(5, 11, 20, 0.85)`, background `#111827`, border radius 24, même animation fade

### Modifié : `src/utils/interventionParser.ts`

- Ajout du type `"Téléphonie"` dans la liste des types d'intervention
- Ajout de `numeroInterne?: string` dans le type `InterventionExtractedData` (c'est ici que le type est défini, pas dans App.tsx)
- Détection d'un numéro interne : regex `\b\d{5}\b` dans le texte
  - Si détecté : type = `"Téléphonie"` + `numeroInterne` = le nombre trouvé
  - Remarque : les numéros de salle dans l'app sont max 3 chiffres, les codes UL sont 5 chiffres — le risque de faux positif est faible dans ce contexte métier
- Le numéro 5 chiffres extrait est retourné dans `InterventionExtractedData`

### Modifié : `NouvelleIntervention.tsx`

Nouveau comportement au clic "Analyser & Continuer" :
1. Parse toutes les lignes comme avant (synchrone)
2. Désactiver le bouton + afficher un indicateur de chargement
3. Pour chaque `InterventionExtractedData` ayant un `numeroInterne`, appeler `rechercherParNumero()` séquentiellement
4. Gérer les cas par intervention :
   - Erreur réseau → alerte globale "Impossible de contacter l'annuaire", `nomPersonne = null` pour cette intervention
   - 0 résultat → alerte "Aucune personne trouvée pour [numéro]", `nomPersonne = null`
   - 1 résultat → `nomPersonne = items[0].displayName`
   - 2+ résultats → afficher `PersonSelectionModal` pour cette intervention, attendre la sélection
5. Ré-activer le bouton en cas d'erreur, ou naviguer vers FormulaireIntervention si tout est résolu
6. Passer les interventions enrichies (avec `numeroInterne` + `nomPersonne`) via `onAnalyzeComplete`

### Modifié : `FormulaireIntervention.tsx`

- Nouvelle section "Personne concernée" — visible uniquement si `nomPersonne != null && nomPersonne !== ''`
- 2 champs éditables : "Numéro interne" (texte, max 5 car.) + "Nom" (texte libre)
- Style cohérent avec les champs existants (Bâtiment, Étage, etc.)
- Si `nomPersonne` est null/undefined : section masquée

### Modifié : `src/utils/interventionStorage.ts`

- **`SupabaseRow`** (type ligne DB) : ajouter `numero_interne?: string | null` et `nom_personne?: string | null`
- **`rowToIntervention`** (mapper) : mapper `row.numero_interne → numeroInterne`, `row.nom_personne → nomPersonne`
- **`sauvegarderInterventions`** : inclure `numero_interne` et `nom_personne` dans l'insert
- **`updateIntervention`** : ces champs peuvent être mis à jour
- Type `SavedIntervention` étendu avec `numeroInterne?: string` et `nomPersonne?: string`

### Modifié : `App.tsx`

- `handleAnalyzeComplete()` reçoit désormais des `InterventionExtractedData[]` qui peuvent contenir `nomPersonne` et `numeroInterne` — aucun changement de signature nécessaire
- Pas de changement de type ici — le type est défini dans `interventionParser.ts`

### Modifié : `FicheIntervention.tsx`

- `getTypeConfig` : ajouter une branche `if` pour `"Téléphonie"` (en tête de la chaîne `if/else if` existante) → `{ icon: 'phone', color: '#06B6D4' }`
- Section "Personne concernée" dans la carte d'info, avec ces 4 cas :
  - `numeroInterne` ET `nomPersonne` présents : "45043 — Jonathan Odille"
  - Seulement `numeroInterne` : "Numéro interne : 45043"
  - Seulement `nomPersonne` : "Personne : Jonathan Odille"
  - Aucun des deux : section masquée

### Modifié : `ModifierIntervention.tsx`

- 2 nouveaux `useState` : `numeroInterne` et `nomPersonne`
- Initialisés depuis `intervention.numeroInterne` et `intervention.nomPersonne` dans `loadIntervention()`
- 2 champs éditables optionnels dans le formulaire
- Inclus dans la sauvegarde via `updateIntervention()`

### Non modifié : `genererEtEnvoyerPDF`

- Le PDF n'inclura pas les champs `numero_interne` / `nom_personne` dans cette version
- Cette évolution est laissée pour une version future

---

## Base de données Supabase

Nouvelles colonnes dans la table `interventions` :

| Colonne | Type | Nullable | Description |
|---|---|---|---|
| `numero_interne` | TEXT | OUI | Numéro interne à 5 chiffres (ex: "45043") |
| `nom_personne` | TEXT | OUI | Nom complet de la personne (ex: "Jonathan Odille") |

---

## Gestion d'erreurs

| Situation | Comportement |
|---|---|
| Pas de réseau / timeout 5s | Alerte "Impossible de contacter l'annuaire", `nomPersonne = null`, continue |
| 0 résultat | Alerte "Aucune personne trouvée pour [numéro]", `nomPersonne = null`, continue |
| 1 résultat | Sélection automatique, `nomPersonne = items[0].displayName` |
| 2+ résultats | `PersonSelectionModal` → sélection ou `null` si "Continuer sans sélectionner" |
| Numéro absent du texte | Pas d'appel API, flux normal existant inchangé |
| Double-clic sur bouton | Bouton désactivé pendant le traitement asynchrone |

---

## Contraintes

- Les champs `numero_interne` et `nom_personne` sont **optionnels** partout
- Le flux existant (interventions non-téléphonie) est **inchangé**
- La détection repose sur la présence d'un nombre exactement à 5 chiffres dans le texte (`\b\d{5}\b`)
- Les API lookups sont traités **séquentiellement** par ligne (pas en parallèle) pour simplifier la gestion des modales
- L'API est publique, pas d'authentification nécessaire
- Timeout API : 5 secondes
