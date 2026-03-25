# Design : Génération PDF pour les chantiers

**Date :** 2026-03-25
**Statut :** Approuvé

---

## Contexte

L'application MaintJojo génère déjà des PDF pour les interventions (`generatePDF.ts` + `expo-print` + `expo-mail-composer`). Le même mécanisme doit être mis en place pour les chantiers.

## Objectif

Permettre à l'utilisateur de générer un rapport PDF d'un chantier depuis la `FicheChantier` et de l'envoyer par email au responsable.

---

## Architecture

### Approche retenue

Ajouter `genererEtEnvoyerPDFChantier()` dans le fichier existant `src/utils/generatePDF.ts`. Les utilitaires partagés (`getIconBase64`, `urlToBase64`, `formatDate`, `RESPONSABLE_EMAIL`) sont déjà présents et réutilisés directement.

---

## Modifications

### 1. `src/utils/generatePDF.ts`

**Nouvelles fonctions :**

- `buildHTMLChantier(chantier: SavedChantier): Promise<string>`
  Construit le HTML du rapport chantier. Sections :
  - **Header** : logo MaintJojo + badge statut (`En cours` / `Terminé`)
  - **Titre** : "Fiche de chantier" + date de génération
  - **Info-card** : localisation, date de création, progression tâches (X/Y complétées)
  - **Section Tâches** : liste avec ✅ (done) ou ⬜ (en attente) par tâche
  - **Section Matériaux** : tableau nom / référence Rexel / quantité (omis si vide)
  - **Section Photos** : grille d'images base64 (omis si vide)
  - **Footer** : ID du chantier
  - Style visuel identique aux interventions (même palette, même typographie)

- `buildSubjectChantier(chantier: SavedChantier): string`
  Sujet email : `[MaintJojo] Chantier – {localisation} – {date}`

- `buildBodyChantier(chantier: SavedChantier): string`
  Corps email en texte plain : localisation, tâches complétées/total, statut.

- `genererEtEnvoyerPDFChantier(chantier: SavedChantier): Promise<void>`
  Orchestre : buildHTML → `Print.printToFileAsync` → `MailComposer.composeAsync`.
  Destinataire : `jean-francois.marc@univ-lorraine.fr` (constante partagée `RESPONSABLE_EMAIL`).
  Lance une erreur si le mail n'est pas disponible sur l'appareil.

### 2. `FicheChantier.tsx`

**Ajouts :**

- État `generating: boolean` pour bloquer le bouton pendant la génération.
- Handler `handleGenererPDF()` :
  1. Passe `generating` à `true`
  2. Appelle `genererEtEnvoyerPDFChantier(chantier)`
  3. En cas d'erreur : affiche `CustomAlert` type `danger`
  4. Remet `generating` à `false` dans le `finally`
- Bouton rendu dans `ListFooterComponent`, après `renderMateriauxSection()` :
  - Icône `picture-as-pdf` (MaterialIcons)
  - Texte : `Générer et envoyer le PDF` / `Génération en cours...`
  - `ActivityIndicator` pendant `generating`
  - Style cohérent avec les autres boutons de la fiche (fond coloré, bordure, border-radius 12)
  - Désactivé (`disabled`) pendant `generating` et si `chantier` est null

---

## Flux utilisateur

```
FicheChantier
  └─ [Bouton PDF] (bas de liste)
       └─ handleGenererPDF()
            ├─ generating = true
            ├─ buildHTMLChantier() → HTML string
            ├─ Print.printToFileAsync() → uri PDF
            ├─ MailComposer.composeAsync() → ouvre le client mail
            └─ generating = false
```

---

## Gestion d'erreurs

- Mail non disponible → `CustomAlert` danger : "Aucune application mail disponible sur cet appareil."
- Erreur inattendue → `CustomAlert` danger avec le message de l'erreur.

---

## Dépendances

Aucune nouvelle dépendance. `expo-print` et `expo-mail-composer` sont déjà installés et utilisés pour les interventions.
