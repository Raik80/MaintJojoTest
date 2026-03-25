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

Ajouter `genererEtEnvoyerPDFChantier()` dans le fichier existant `src/utils/generatePDF.ts`. Les utilitaires partagés (`getIconBase64`, `urlToBase64`, `RESPONSABLE_EMAIL`) et la fonction privée `formatDate` sont déjà présents dans ce fichier et réutilisés directement — `formatDate` n'est pas exportée et ne doit pas l'être.

---

## Modifications

### 1. `src/utils/generatePDF.ts`

**Nouvelles fonctions (toutes dans le même fichier) :**

#### `buildHTMLChantier(chantier: SavedChantier): Promise<string>`

Construit le HTML du rapport. Structure :

- **Header** : logo MaintJojo (`getIconBase64`) + badge statut
  - `status === 'termine'` → badge vert "Terminé" (couleur `#10B981`, fond `#D1FAE5`)
  - `status === 'en_cours'` → badge jaune "En cours" (couleur `#F59E0B`, fond `#FEF3C7`)
- **Titre** : "Fiche de chantier" + sous-titre "Généré le {formatDate(now)}"
- **Info-card** :
  - Localisation
  - Date de création (via `formatDate`)
  - Progression : "{done}/{total} tâches complétées"
- **Section Tâches** (toujours affichée, même si vide) :
  - Si `taches.length === 0` : message "Aucune tâche" en italique gris
  - Sinon : liste de lignes avec
    - Tâche `done: true` → `✅` + texte barré gris
    - Tâche `done: false` → `⬜` + texte normal
- **Section Matériaux** (omise si `materiaux.length === 0`) :
  - Tableau : colonnes Nom / Référence Rexel / Quantité
- **Section Photos** (omise si `photos.length === 0`) :
  - Photos converties en base64 via `urlToBase64`, affichées en grille (même que pour les interventions)
- **Footer** : "MaintJojo · Rapport généré automatiquement" + ID du chantier

Style visuel identique aux interventions (même palette `#050B14` / `#111827` / `#F9FAFB`, même typographie, mêmes `.info-card`, `.section`, `.text-box`, `.photos-grid`).

#### `buildSubjectChantier(chantier: SavedChantier): string`

Format : `[MaintJojo] Chantier – {localisation} – {date}`
où `{date}` est obtenu via `new Date(chantier.date_creation).toLocaleDateString('fr-FR')` (date seule, sans heure) — même approche que `buildSubject` pour les interventions. Ne pas utiliser la fonction privée `formatDate` qui inclut l'heure.

#### `buildBodyChantier(chantier: SavedChantier): string`

Corps email en texte plain, même structure que `buildBody` pour les interventions :

```
Bonjour,

Veuillez trouver ci-joint le rapport du chantier suivant :

• Localisation : {chantier.localisation}
• Date : {formatDate(chantier.date_creation)}
• Statut : {en cours | terminé}
• Tâches : {done}/{total} complétées

Cordialement.
```

`{done}` = nombre de tâches avec `done === true`, `{total}` = `chantier.taches.length`.
`{en cours | terminé}` : `status === 'termine'` → "terminé", sinon "en cours".

#### `genererEtEnvoyerPDFChantier(chantier: SavedChantier): Promise<void>`

> **Note :** L'ordre diffère volontairement de `genererEtEnvoyerPDF` (interventions) : la garde `isAvailableAsync` est placée en premier pour échouer vite avant tout travail coûteux.

1. Vérifie `MailComposer.isAvailableAsync()` → si `false`, lève `new Error('Aucune application mail disponible sur cet appareil.')`
2. Construit le HTML via `buildHTMLChantier`
3. Génère le PDF via `Print.printToFileAsync({ html, base64: false })`
4. Compose l'email via `MailComposer.composeAsync({ recipients: [RESPONSABLE_EMAIL], subject, body, attachments: [uri] })`

---

### 2. `FicheChantier.tsx`

#### Nouvel état

```ts
const [generating, setGenerating] = useState(false);
```

#### Handler `handleGenererPDF`

```ts
const handleGenererPDF = async () => {
  if (!chantier) return;
  setGenerating(true);
  try {
    await genererEtEnvoyerPDFChantier(chantier);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Une erreur est survenue.';
    setAlertConfig({
      visible: true,
      title: 'Erreur',
      message,
      type: 'danger',
      onConfirm: closeAlert,
    });
  } finally {
    setGenerating(false);
  }
};
```

Un seul `catch` gère à la fois "pas de client mail" et toute autre erreur inattendue — pas de différenciation de type nécessaire.

#### Bouton PDF

Rendu dans `ListFooterComponent`, après `renderMateriauxSection()`.

- Icône `MaterialIcons` `"picture-as-pdf"` couleur `#EF4444`
- Texte : `"Générer et envoyer le PDF"` / `"Génération en cours..."` (selon `generating`)
- Pendant `generating` : `ActivityIndicator` à la place de l'icône
- `disabled={generating || !chantier}` — même pattern que `addPhotoButton`
- Style cohérent avec les autres boutons (fond `rgba(239,68,68,0.1)`, bordure `rgba(239,68,68,0.3)`, `borderRadius: 12`, `paddingVertical: 14`)

---

## Flux utilisateur

```
[Bouton PDF] → handleGenererPDF()
  ├─ generating = true
  ├─ genererEtEnvoyerPDFChantier(chantier)
  │    ├─ isAvailableAsync() → false → throw Error
  │    ├─ buildHTMLChantier() → html string
  │    ├─ printToFileAsync() → uri
  │    └─ composeAsync() → ouvre le client mail (résout immédiatement)
  ├─ catch → CustomAlert danger (message de l'erreur)
  └─ finally → generating = false
```

---

## Gestion d'erreurs

Tout chemin d'erreur (mail non disponible, erreur réseau, erreur d'impression) est capturé dans un seul `catch` → `CustomAlert` de type `danger` avec le message de l'erreur. Le `finally` garantit que `generating` repasse à `false` dans tous les cas.

---

## Dépendances

Aucune nouvelle dépendance. `expo-print` et `expo-mail-composer` sont déjà installés.
