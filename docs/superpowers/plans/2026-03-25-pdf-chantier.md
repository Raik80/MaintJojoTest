# PDF Chantier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PDF generation and email sending for chantiers, triggered by a button at the bottom of `FicheChantier`.

**Architecture:** Add four functions to the existing `src/utils/generatePDF.ts` (reusing shared helpers), then add a `generating` state + `handleGenererPDF` handler + PDF button to `FicheChantier.tsx`.

**Tech Stack:** React Native / Expo — `expo-print`, `expo-mail-composer`, `expo-file-system`, `expo-asset`

**Spec:** `docs/superpowers/specs/2026-03-25-pdf-chantier-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `generatePDF.ts` (racine) | **Supprimer** | Doublon obsolète — remplacé par `src/utils/generatePDF.ts` |
| `src/utils/generatePDF.ts` | Modify | Add `buildHTMLChantier`, `buildSubjectChantier`, `buildBodyChantier`, `genererEtEnvoyerPDFChantier` |
| `FicheChantier.tsx` | Modify | Import new function, add `generating` state, `handleGenererPDF` handler, PDF button |

---

## Task 0 : Supprimer le doublon `generatePDF.ts` à la racine

**Files:**
- Delete: `generatePDF.ts` (racine du projet)

Le projet contient deux fichiers `generatePDF.ts` :
- `generatePDF.ts` (racine) — doublon obsolète, version incomplète sans les utilitaires photo
- `src/utils/generatePDF.ts` — version active utilisée par toute l'app

`FicheChantier.tsx` importe depuis `'./src/utils/...'`, donc `src/utils/generatePDF.ts` est bien le bon fichier. La racine doit être supprimée pour éviter toute confusion.

- [ ] **Step 1 : Supprimer le fichier racine**

  ```bash
  rm generatePDF.ts
  ```

- [ ] **Step 2 : Commit**

  ```bash
  git add generatePDF.ts
  git commit -m "chore: remove stale root-level generatePDF.ts duplicate"
  ```

---

## Task 1 : Ajouter les helpers HTML dans `generatePDF.ts`

**Files:**
- Modify: `src/utils/generatePDF.ts`

- [ ] **Step 1 : Ajouter l'import du type `SavedChantier`**

  En tête du fichier `src/utils/generatePDF.ts`, après la ligne `import { SavedIntervention } from './interventionStorage';` :

  ```ts
  import { SavedChantier } from './chantierStorage';
  ```

- [ ] **Step 2 : Ajouter la fonction `buildHTMLChantier` à la fin du fichier, avant `buildSubject`**

  > **Note :** `formatDate` est une fonction privée (non exportée) définie dans ce même fichier — elle est réutilisée directement ici.

  ```ts
  const buildHTMLChantier = async (chantier: SavedChantier): Promise<string> => {
      const isTermine = chantier.status === 'termine';
      const statusLabel = isTermine ? 'Terminé' : 'En cours';
      const statusColor = isTermine ? '#10B981' : '#F59E0B';
      const statusBg = isTermine ? '#D1FAE5' : '#FEF3C7';

      const iconBase64 = await getIconBase64();
      const brandIconHTML = iconBase64
          ? `<img src="${iconBase64}" style="width:42px;height:42px;border-radius:10px;object-fit:cover;" />`
          : `<div class="brand-icon">⚡</div>`;

      const done = chantier.taches.filter(t => t.done).length;
      const total = chantier.taches.length;

      const tachesHTML = chantier.taches.length === 0
          ? `<div class="text-box italic">Aucune tâche</div>`
          : chantier.taches.map(t => `
              <div class="tache-row">
                  <span class="tache-icon">${t.done ? '✅' : '⬜'}</span>
                  <span class="tache-text${t.done ? ' tache-done' : ''}">${t.description}</span>
              </div>`).join('');

      const materiauxHTML = chantier.materiaux.length > 0
          ? `<div class="section">
              <h3 class="section-title">📦 Matériaux</h3>
              <table class="mat-table">
                  <thead>
                      <tr>
                          <th class="mat-th">Nom</th>
                          <th class="mat-th">Référence Rexel</th>
                          <th class="mat-th mat-th-center">Quantité</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${chantier.materiaux.map(m => `
                      <tr>
                          <td class="mat-td">${m.nom}</td>
                          <td class="mat-td">${m.reference_rexel}</td>
                          <td class="mat-td mat-td-center">${m.quantite}</td>
                      </tr>`).join('')}
                  </tbody>
              </table>
          </div>`
          : '';

      let photosHTML = '';
      if (chantier.photos.length > 0) {
          const base64Photos = await Promise.all(chantier.photos.map(urlToBase64));
          photosHTML = `<div class="section">
              <h3 class="section-title">📷 Photos</h3>
              <div class="photos-grid">
                  ${base64Photos.map(src => `<img src="${src}" class="photo" />`).join('')}
              </div>
          </div>`;
      }

      return `<!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, 'Segoe UI', sans-serif;
        background: #ffffff;
        color: #111827;
        padding: 40px 48px;
        font-size: 14px;
        line-height: 1.5;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 20px;
        border-bottom: 2px solid #E5E7EB;
        margin-bottom: 28px;
      }
      .brand { display: flex; align-items: center; gap: 10px; }
      .brand-icon {
        width: 42px; height: 42px;
        background: #F3F4F6; border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px;
      }
      .brand-name { font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; }
      .brand-sub { font-size: 12px; color: #6B7280; margin-top: 1px; }
      .status-badge {
        padding: 6px 16px; border-radius: 999px;
        font-size: 13px; font-weight: 700;
        background: ${statusBg}; color: ${statusColor};
      }
      .page-title { font-size: 28px; font-weight: 800; color: #0F172A; margin-bottom: 6px; }
      .page-subtitle { font-size: 13px; color: #9CA3AF; margin-bottom: 28px; }
      .info-card {
        border: 1px solid #E5E7EB; border-radius: 14px;
        overflow: hidden; margin-bottom: 24px;
      }
      .info-card-header {
        background: #F9FAFB; padding: 16px 20px;
        border-bottom: 1px solid #E5E7EB;
        display: flex; align-items: center; gap: 12px;
      }
      .type-icon {
        width: 42px; height: 42px; background: #EDE9FE;
        border-radius: 10px; display: flex;
        align-items: center; justify-content: center; font-size: 20px;
      }
      .type-label { font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; }
      .type-value { font-size: 18px; font-weight: 700; color: #111827; margin-top: 2px; }
      .info-grid { padding: 0 20px; }
      .info-row {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 0; border-bottom: 1px solid #F3F4F6;
      }
      .info-row:last-child { border-bottom: none; }
      .info-label { font-size: 13px; color: #6B7280; font-weight: 500; }
      .info-value { font-size: 13px; color: #111827; font-weight: 600; text-align: right; }
      .section { margin-bottom: 24px; }
      .section-title { font-size: 14px; font-weight: 700; color: #374151; margin-bottom: 10px; }
      .text-box {
        background: #F9FAFB; border: 1px solid #E5E7EB;
        border-radius: 10px; padding: 14px 16px;
        font-size: 14px; color: #374151; line-height: 1.6;
      }
      .text-box.italic { font-style: italic; color: #6B7280; }
      .tache-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #F3F4F6; }
      .tache-row:last-child { border-bottom: none; }
      .tache-icon { font-size: 16px; }
      .tache-text { font-size: 13px; color: #111827; flex: 1; }
      .tache-done { color: #9CA3AF; text-decoration: line-through; }
      .taches-box {
        background: #F9FAFB; border: 1px solid #E5E7EB;
        border-radius: 10px; padding: 4px 16px;
      }
      .mat-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .mat-th {
        background: #F9FAFB; padding: 10px 12px;
        text-align: left; font-weight: 600; color: #6B7280;
        border-bottom: 1px solid #E5E7EB; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
      }
      .mat-th-center { text-align: center; }
      .mat-td { padding: 10px 12px; color: #111827; border-bottom: 1px solid #F3F4F6; }
      .mat-td-center { text-align: center; font-weight: 700; }
      .photos-grid { display: flex; flex-wrap: wrap; gap: 12px; }
      .photo { width: 160px; height: 160px; object-fit: cover; border-radius: 10px; border: 1px solid #E5E7EB; }
      .footer {
        margin-top: 40px; padding-top: 16px;
        border-top: 1px solid #E5E7EB;
        display: flex; justify-content: space-between; align-items: center;
      }
      .footer-text { font-size: 11px; color: #9CA3AF; }
      .footer-id { font-size: 10px; color: #D1D5DB; font-family: monospace; }
    </style>
  </head>
  <body>

    <div class="header">
      <div class="brand">
        ${brandIconHTML}
        <div>
          <div class="brand-name">MaintJojo</div>
          <div class="brand-sub">Rapport de chantier</div>
        </div>
      </div>
      <div class="status-badge">${statusLabel}</div>
    </div>

    <div class="page-title">Fiche de chantier</div>
    <div class="page-subtitle">Généré le ${formatDate(new Date().toISOString())}</div>

    <div class="info-card">
      <div class="info-card-header">
        <div class="type-icon">🏗️</div>
        <div>
          <div class="type-label">Chantier</div>
          <div class="type-value">${chantier.localisation || '—'}</div>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Date de création</span>
          <span class="info-value">${formatDate(chantier.date_creation)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Progression</span>
          <span class="info-value">${done}/${total} tâches complétées</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">✅ Tâches</h3>
      <div class="taches-box">
        ${tachesHTML}
      </div>
    </div>

    ${materiauxHTML}
    ${photosHTML}

    <div class="footer">
      <div class="footer-text">MaintJojo · Rapport généré automatiquement</div>
      <div class="footer-id">ID : ${chantier.id}</div>
    </div>

  </body>
  </html>`;
  };
  ```

- [ ] **Step 3 : Commit**

  ```bash
  git add src/utils/generatePDF.ts
  git commit -m "feat: add buildHTMLChantier to generatePDF"
  ```

---

## Task 2 : Ajouter `buildSubjectChantier`, `buildBodyChantier` et `genererEtEnvoyerPDFChantier`

**Files:**
- Modify: `src/utils/generatePDF.ts`

- [ ] **Step 1 : Ajouter `buildSubjectChantier` et `buildBodyChantier` juste après `buildHTMLChantier`**

  > **Note :** `buildSubjectChantier` utilise `toLocaleDateString('fr-FR')` (date seule, sans heure) — comme `buildSubject` pour les interventions. Ne pas utiliser `formatDate` ici car elle inclut l'heure.

  ```ts
  const buildSubjectChantier = (chantier: SavedChantier): string => {
      const date = new Date(chantier.date_creation).toLocaleDateString('fr-FR');
      return `[MaintJojo] Chantier – ${chantier.localisation} – ${date}`;
  };

  const buildBodyChantier = (chantier: SavedChantier): string => {
      const done = chantier.taches.filter(t => t.done).length;
      const total = chantier.taches.length;
      const statut = chantier.status === 'termine' ? 'terminé' : 'en cours';

      return `Bonjour,

  Veuillez trouver ci-joint le rapport du chantier suivant :

  • Localisation : ${chantier.localisation}
  • Date : ${formatDate(chantier.date_creation)}
  • Statut : ${statut}
  • Tâches : ${done}/${total} complétées

  Cordialement.`;
  };
  ```

- [ ] **Step 2 : Ajouter `genererEtEnvoyerPDFChantier` (exportée) juste après**

  > **Important :** L'ordre diffère volontairement de `genererEtEnvoyerPDF` (interventions) : ici `isAvailableAsync` est vérifié en premier (fail fast) avant tout travail coûteux. Ne pas copier l'ordre de la fonction existante.
  >
  > **Limitation connue :** Le fichier PDF temporaire créé par `printToFileAsync` n'est pas supprimé après envoi — même comportement que pour les interventions.

  ```ts
  export const genererEtEnvoyerPDFChantier = async (chantier: SavedChantier): Promise<void> => {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
          throw new Error('Aucune application mail disponible sur cet appareil.');
      }

      const html = await buildHTMLChantier(chantier);

      const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
      });

      await MailComposer.composeAsync({
          recipients: [RESPONSABLE_EMAIL],
          subject: buildSubjectChantier(chantier),
          body: buildBodyChantier(chantier),
          attachments: [uri],
      });
  };
  ```

- [ ] **Step 3 : Commit**

  ```bash
  git add src/utils/generatePDF.ts
  git commit -m "feat: add genererEtEnvoyerPDFChantier"
  ```

---

## Task 3 : Intégrer le bouton PDF dans `FicheChantier.tsx`

**Files:**
- Modify: `FicheChantier.tsx`

- [ ] **Step 1 : Ajouter l'import de `genererEtEnvoyerPDFChantier`**

  `FicheChantier.tsx` est à la racine du projet. La fonction est dans `src/utils/generatePDF.ts`. Ajouter après les imports existants depuis `./src/utils/...` :

  ```ts
  import { genererEtEnvoyerPDFChantier } from './src/utils/generatePDF';
  ```

- [ ] **Step 2 : Ajouter l'état `generating`**

  Dans le composant `FicheChantier`, après `const [uploading, setUploading] = useState(false);` :

  ```ts
  const [generating, setGenerating] = useState(false);
  ```

- [ ] **Step 3 : Ajouter le handler `handleGenererPDF`**

  Après la fonction `handleRemoveMateriau` :

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

- [ ] **Step 4 : Ajouter le bouton PDF dans `ListFooterComponent`**

  Dans `ListFooterComponent`, le fragment actuel est :
  ```tsx
  <>
    {renderPhotosSection()}
    {renderMateriauxSection()}
  </>
  ```

  Le bouton PDF va **après `{renderMateriauxSection()}`**, toujours à l'intérieur du fragment `<>` — **pas** à l'intérieur de la fonction `renderMateriauxSection`. Résultat attendu :

  ```tsx
  <>
    {renderPhotosSection()}
    {renderMateriauxSection()}
    <Pressable
      onPress={handleGenererPDF}
      disabled={generating || !chantier}
      style={({ pressed }) => [
        styles.pdfButton,
        pressed && !generating && styles.pdfButtonPressed,
        (generating || !chantier) && styles.pdfButtonDisabled,
      ]}
    >
      {generating ? (
        <ActivityIndicator size="small" color="#EF4444" />
      ) : (
        <MaterialIcons name="picture-as-pdf" size={20} color="#EF4444" />
      )}
      <Text style={styles.pdfButtonText}>
        {generating ? 'Génération en cours...' : 'Générer et envoyer le PDF'}
      </Text>
    </Pressable>
  </>
  ```

  `ActivityIndicator` est déjà importé dans `FicheChantier.tsx` — aucun import supplémentaire nécessaire.

- [ ] **Step 5 : Ajouter les styles du bouton PDF dans `StyleSheet.create`**

  À la fin de `StyleSheet.create`, avant la fermeture `}` :

  ```ts
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 40,
  },
  pdfButtonPressed: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  pdfButtonDisabled: { opacity: 0.6 },
  pdfButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  ```

- [ ] **Step 6 : Commit**

  ```bash
  git add FicheChantier.tsx
  git commit -m "feat: add PDF button to FicheChantier"
  ```

---

## Task 4 : Vérification manuelle

- [ ] **Step 1 : Lancer l'application**

  ```bash
  npx expo start
  ```

- [ ] **Step 2 : Ouvrir un chantier avec tâches, matériaux et photos**

  Vérifier :
  - Le bouton "Générer et envoyer le PDF" apparaît en bas, après la section Matériaux
  - Fond rouge translucide, icône PDF rouge
  - Appuyer → spinner + texte "Génération en cours..."
  - Le client mail s'ouvre avec `jean-francois.marc@univ-lorraine.fr`, sujet `[MaintJojo] Chantier – ... – JJ/MM/AAAA`, PDF en pièce jointe

- [ ] **Step 3 : Tester sur un chantier sans matériaux ni photos**

  Vérifier que le PDF ne contient pas de sections vides pour matériaux et photos.

- [ ] **Step 4 : Tester sur un chantier sans tâches**

  Vérifier que la section Tâches affiche "Aucune tâche" en italique gris.
