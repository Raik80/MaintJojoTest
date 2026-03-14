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
  L'utilisateur tape : "45043 téléphone HS"
  → clic "Analyser & Continuer"
      → Parser détecte le numéro 5 chiffres → type = "Téléphonie"
      → Appel API annuaire : GET ldapsearch?valeur=45043&filtervalue=&withvac=false
          → 0 résultat : alerte "Aucune personne trouvée", continue sans personne
          → 1 résultat : sélection automatique
          → 2+ résultats : modale de sélection
      → FormulaireIntervention avec nom + numéro pré-remplis
```

---

## API Annuaire UL

**Endpoint :** `https://annuaire-web.univ-lorraine.fr/p/ldapsearch?valeur={numero}&filtervalue=&withvac=false`
**Méthode :** GET
**Accès :** Public (accessible depuis n'importe où)

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
- `telephone` (décodé) → affiché dans la modale uniquement
- `affectation` → affiché dans la modale pour aider à identifier la personne

---

## Fichiers à créer ou modifier

### Nouveau fichier : `src/utils/annuaireService.ts`

Responsabilités :
- Type `PersonneAnnuaire` : `{ displayName, nom, prenom, telephone, affectation }`
- `decoderChaine(s: string): string` — décalage César -1
- `rechercherParNumero(numeroInterne: string): Promise<PersonneAnnuaire[]>` — appel API + décodage

### Nouveau composant : `src/components/PersonSelectionModal.tsx`

Responsabilités :
- Affiche une liste de `PersonneAnnuaire[]`
- Chaque item : nom complet + affectation + téléphone décodé
- Actions : sélectionner une personne | "Continuer sans sélectionner"
- Style cohérent avec `CustomAlert.tsx` existant (dark theme, neon)

### Modifié : `interventionParser.ts`

- Ajout du type `"Téléphonie"` dans la liste des types d'intervention
- Ajout de la détection d'un numéro interne : regex `\b\d{5}\b` dans le texte
- Si détecté : type = `"Téléphonie"` + `numeroInterne` retourné dans `InterventionExtractedData`
- Le numéro 5 chiffres n'est pas confondu avec d'autres patterns (numéros de salle = max 3 chiffres généralement)

### Modifié : `NouvelleIntervention.tsx`

- Après le parsing, si un `numeroInterne` est détecté :
  - Appel à `rechercherParNumero()`
  - Gestion des cas : 0 / 1 / 2+ résultats
  - Si 2+ : affichage de `PersonSelectionModal`
- Passe `personneSelectionnee` à `FormulaireIntervention` via `onAnalyzeComplete`

### Modifié : `FormulaireIntervention.tsx`

- Nouvelle section "Personne concernée" (conditionnelle, visible si personne sélectionnée)
- 2 champs éditables : "Numéro interne" + "Nom"
- Style cohérent avec les champs existants

### Modifié : `FicheIntervention.tsx`

- Affichage dans la carte d'info : "Numéro interne : 45043 — Jonathan Odille" si renseigné

### Modifié : `ModifierIntervention.tsx`

- 2 champs éditables optionnels : "Numéro interne" + "Nom"

### Modifié : `interventionStorage.ts`

- Ajout de `numero_interne` et `nom_personne` dans les opérations insert/update/select
- Type `Intervention` étendu avec ces 2 champs optionnels

### Modifié : `App.tsx`

- Type `InterventionExtractedData` étendu avec `numeroInterne?: string` et `nomPersonne?: string`
- Passage de `personneSelectionnee` dans `handleAnalyzeComplete()`

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
| Pas de réseau | Alerte "Impossible de contacter l'annuaire", continue sans personne |
| 0 résultat | Alerte "Aucune personne trouvée pour ce numéro", continue sans personne |
| 1 résultat | Sélection automatique, pas de modale |
| 2+ résultats | Affichage de `PersonSelectionModal` |
| Numéro absent du texte | Pas d'appel API, flux normal existant |

---

## Contraintes

- Les champs `numero_interne` et `nom_personne` sont **optionnels** partout
- Le flux existant (interventions non-téléphonie) est **inchangé**
- La détection repose sur la présence d'un nombre exactement à 5 chiffres dans le texte
- L'API est publique, pas d'authentification nécessaire
