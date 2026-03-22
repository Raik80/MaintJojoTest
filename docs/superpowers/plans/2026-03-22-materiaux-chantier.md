# Matériaux Chantier — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un catalogue d'équipements électriques (géré via page web PC) et une section matériaux dans FicheChantier avec scan code-barres + saisie de quantité.

**Architecture:** Table Supabase `equipements` (code_barres, nom, reference_rexel) + colonne `materiaux jsonb` dans `chantiers`. Page HTML standalone pour gérer le catalogue sur PC. Section matériaux dans FicheChantier via scan `expo-camera` avec modals React Native pour quantité et ajout d'équipement inconnu.

**Tech Stack:** React Native, Expo SDK 54, Supabase, `expo-camera` (à installer), HTML + Supabase JS CDN pour le catalogue PC.

**Spec:** `docs/superpowers/specs/2026-03-22-materiaux-chantier-design.md`

---

## Chunk 1: Supabase + Storage

### Task 1 : Schéma Supabase

**Files:** Action manuelle dans Supabase Studio

- [ ] **Step 1 : Créer la table `equipements` et ajouter la colonne `materiaux`**

  Dans Supabase Studio → SQL Editor, exécuter :

  ```sql
  CREATE TABLE equipements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code_barres text NOT NULL UNIQUE,
    nom text NOT NULL,
    reference_rexel text NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  ALTER TABLE chantiers ADD COLUMN materiaux jsonb NOT NULL DEFAULT '[]';
  ```

- [ ] **Step 2 : Vérifier**

  Table Editor → table `equipements` doit exister. Table `chantiers` doit avoir la colonne `materiaux`.

---

### Task 2 : Créer `src/utils/equipementStorage.ts`

**Files:**
- Create: `src/utils/equipementStorage.ts`

- [ ] **Step 1 : Créer le fichier**

  ```ts
  import { supabase } from './supabaseClient';

  export type Equipement = {
    id: string;
    code_barres: string;
    nom: string;
    reference_rexel: string;
  };

  export const trouverEquipementParCodeBarres = async (
    codeBarres: string
  ): Promise<Equipement | null> => {
    try {
      const { data, error } = await supabase
        .from('equipements')
        .select('*')
        .eq('code_barres', codeBarres)
        .single();

      if (error) return null;
      return data as Equipement;
    } catch {
      return null;
    }
  };

  export const ajouterEquipement = async (
    codeBarres: string,
    nom: string,
    referenceRexel: string
  ): Promise<Equipement | null> => {
    try {
      const { data, error } = await supabase
        .from('equipements')
        .insert({ code_barres: codeBarres, nom, reference_rexel: referenceRexel })
        .select()
        .single();

      if (error) {
        console.error('Erreur ajout équipement:', error.message);
        return null;
      }
      return data as Equipement;
    } catch (error) {
      console.error('Erreur ajout équipement:', error);
      return null;
    }
  };
  ```

- [ ] **Step 2 : Commit**

  ```bash
  git add src/utils/equipementStorage.ts
  git commit -m "feat: add equipementStorage with barcode lookup and add functions"
  ```

---

### Task 3 : Mettre à jour `src/utils/chantierStorage.ts`

**Files:**
- Modify: `src/utils/chantierStorage.ts`

- [ ] **Step 1 : Ajouter le type `Materiau`**

  Après la définition du type `Tache` (ligne ~6), ajouter :

  ```ts
  export type Materiau = {
    equipement_id: string;
    code_barres: string;
    nom: string;
    reference_rexel: string;
    quantite: number;
  };
  ```

- [ ] **Step 2 : Ajouter `materiaux` dans `SavedChantier`**

  Dans le type `SavedChantier`, ajouter après `photos: string[];` :

  ```ts
  materiaux: Materiau[];
  ```

- [ ] **Step 3 : Ajouter `updateMateriauxChantier` à la fin du fichier**

  ```ts
  export const updateMateriauxChantier = async (
    id: string,
    materiaux: Materiau[]
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chantiers')
        .update({ materiaux })
        .eq('id', id);

      if (error) {
        console.error('Erreur mise à jour matériaux:', error.message);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erreur mise à jour matériaux:', error);
      return false;
    }
  };
  ```

- [ ] **Step 4 : Commit**

  ```bash
  git add src/utils/chantierStorage.ts
  git commit -m "feat: add Materiau type and updateMateriauxChantier to chantierStorage"
  ```

---

## Chunk 2 : catalogue.html

### Task 4 : Créer `catalogue.html`

**Files:**
- Create: `catalogue.html` (à la racine du projet)

- [ ] **Step 1 : Créer le fichier**

  ```html
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Catalogue Équipements</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, sans-serif; background: #0f172a; color: #f1f5f9; min-height: 100vh; padding: 32px 24px; }
      h1 { font-size: 24px; font-weight: 800; margin-bottom: 32px; color: #38bdf8; }
      .form-card { background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #334155; }
      .form-card h2 { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
      .form-row { display: flex; gap: 12px; flex-wrap: wrap; }
      .form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 180px; }
      label { font-size: 13px; color: #94a3b8; font-weight: 600; }
      input { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 10px 14px; color: #f1f5f9; font-size: 15px; outline: none; }
      input:focus { border-color: #38bdf8; }
      .btn { padding: 11px 22px; border-radius: 8px; border: none; cursor: pointer; font-size: 15px; font-weight: 700; }
      .btn-primary { background: #0ea5e9; color: white; }
      .btn-primary:hover { background: #0284c7; }
      .btn-danger { background: transparent; color: #f87171; border: 1px solid #f87171; padding: 6px 14px; font-size: 13px; border-radius: 6px; cursor: pointer; }
      .btn-danger:hover { background: rgba(248,113,113,0.1); }
      .btn-save { background: #10b981; color: white; padding: 6px 14px; font-size: 13px; border-radius: 6px; cursor: pointer; border: none; font-weight: 700; }
      .btn-save:hover { background: #059669; }
      .table-card { background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
      .table-header { display: grid; grid-template-columns: 1fr 1.5fr 1.2fr auto; gap: 12px; padding: 14px 20px; background: #0f172a; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
      .table-row { display: grid; grid-template-columns: 1fr 1.5fr 1.2fr auto; gap: 12px; padding: 14px 20px; border-top: 1px solid #1e293b; align-items: center; }
      .table-row:hover { background: #0f172a; }
      .table-row input { background: transparent; border: 1px solid transparent; padding: 4px 8px; border-radius: 4px; }
      .table-row input:focus { border-color: #38bdf8; background: #0f172a; }
      .cell-text { font-size: 14px; color: #cbd5e1; }
      .actions { display: flex; gap: 8px; }
      .count { font-size: 14px; color: #64748b; padding: 14px 20px; }
      .status { position: fixed; bottom: 24px; right: 24px; background: #10b981; color: white; padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 14px; display: none; }
    </style>
  </head>
  <body>
    <h1>Catalogue Équipements</h1>

    <div class="form-card">
      <h2>Ajouter un équipement</h2>
      <div class="form-row">
        <div class="form-group">
          <label>Code-barres (EAN)</label>
          <input id="input-code" type="text" placeholder="ex: 3245060107000" />
        </div>
        <div class="form-group">
          <label>Nom du produit</label>
          <input id="input-nom" type="text" placeholder="ex: Disjoncteur 16A" />
        </div>
        <div class="form-group">
          <label>Référence Rexel</label>
          <input id="input-ref" type="text" placeholder="ex: REX123456" />
        </div>
        <div style="display:flex;align-items:flex-end">
          <button class="btn btn-primary" onclick="ajouterEquipement()">Ajouter</button>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header">
        <span>Code-barres</span>
        <span>Nom</span>
        <span>Réf. Rexel</span>
        <span></span>
      </div>
      <div id="liste"></div>
      <div class="count" id="count"></div>
    </div>

    <div class="status" id="status"></div>

    <script>
      const SUPABASE_URL = 'https://kuacvscomudobqlhnymy.supabase.co';
      const SUPABASE_KEY = 'sb_publishable_yA1kezau8Ymo_IMlclwf4Q_GZDJKUx0';
      const { createClient } = supabase;
      const db = createClient(SUPABASE_URL, SUPABASE_KEY);

      let equipements = [];

      function showStatus(msg, isError = false) {
        const el = document.getElementById('status');
        el.textContent = msg;
        el.style.background = isError ? '#ef4444' : '#10b981';
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 2500);
      }

      async function charger() {
        const { data, error } = await db.from('equipements').select('*').order('created_at', { ascending: false });
        if (error) { showStatus('Erreur de chargement', true); return; }
        equipements = data || [];
        afficher();
      }

      function afficher() {
        const liste = document.getElementById('liste');
        document.getElementById('count').textContent = equipements.length + ' équipement(s)';
        if (equipements.length === 0) {
          liste.innerHTML = '<div style="padding:24px;text-align:center;color:#475569">Aucun équipement. Ajoutez-en un ci-dessus.</div>';
          return;
        }
        liste.innerHTML = equipements.map(e => `
          <div class="table-row" id="row-${e.id}">
            <input id="code-${e.id}" value="${e.code_barres}" onchange="marquerModifie('${e.id}')" />
            <input id="nom-${e.id}" value="${e.nom}" onchange="marquerModifie('${e.id}')" />
            <input id="ref-${e.id}" value="${e.reference_rexel}" onchange="marquerModifie('${e.id}')" />
            <div class="actions">
              <button class="btn-save" id="save-${e.id}" style="display:none" onclick="sauvegarder('${e.id}')">Sauvegarder</button>
              <button class="btn-danger" onclick="supprimer('${e.id}')">Supprimer</button>
            </div>
          </div>
        `).join('');
      }

      function marquerModifie(id) {
        document.getElementById('save-' + id).style.display = 'inline-block';
      }

      async function sauvegarder(id) {
        const code = document.getElementById('code-' + id).value.trim();
        const nom = document.getElementById('nom-' + id).value.trim();
        const ref = document.getElementById('ref-' + id).value.trim();
        if (!code || !nom || !ref) { showStatus('Tous les champs sont requis', true); return; }
        const { error } = await db.from('equipements').update({ code_barres: code, nom, reference_rexel: ref }).eq('id', id);
        if (error) {
          showStatus(error.message.includes('unique') ? 'Ce code-barres existe déjà' : 'Erreur de sauvegarde', true);
          return;
        }
        document.getElementById('save-' + id).style.display = 'none';
        showStatus('Sauvegardé ✓');
        await charger();
      }

      async function ajouterEquipement() {
        const code = document.getElementById('input-code').value.trim();
        const nom = document.getElementById('input-nom').value.trim();
        const ref = document.getElementById('input-ref').value.trim();
        if (!code || !nom || !ref) { showStatus('Tous les champs sont requis', true); return; }
        const { error } = await db.from('equipements').insert({ code_barres: code, nom, reference_rexel: ref });
        if (error) {
          showStatus(error.message.includes('unique') ? 'Ce code-barres existe déjà' : 'Erreur d\'ajout', true);
          return;
        }
        document.getElementById('input-code').value = '';
        document.getElementById('input-nom').value = '';
        document.getElementById('input-ref').value = '';
        showStatus('Équipement ajouté ✓');
        await charger();
      }

      async function supprimer(id) {
        if (!confirm('Supprimer cet équipement ?')) return;
        const { error } = await db.from('equipements').delete().eq('id', id);
        if (error) { showStatus('Erreur de suppression', true); return; }
        showStatus('Supprimé ✓');
        await charger();
      }

      charger();
    </script>
  </body>
  </html>
  ```

- [ ] **Step 2 : Commit**

  ```bash
  git add catalogue.html
  git commit -m "feat: add catalogue.html for PC equipment management"
  ```

---

## Chunk 3 : FicheChantier UI

### Task 5 : Installer `expo-camera`

**Files:** `package.json` (modifié par npx expo install)

- [ ] **Step 1 : Installer expo-camera**

  ```bash
  npx expo install expo-camera
  ```

  Attendu : `expo-camera` ajouté dans `package.json` sans erreur.

- [ ] **Step 2 : Commit**

  ```bash
  git add package.json
  git commit -m "feat: install expo-camera for barcode scanning"
  ```

---

### Task 6 : Ajouter la section matériaux dans `FicheChantier.tsx`

**Files:**
- Modify: `FicheChantier.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

  **Dans le bloc `react-native`** — ajouter `KeyboardAvoidingView`, `Modal`, `Platform`, `TextInput` aux imports existants (ne pas dupliquer ce qui est déjà importé) :
  ```ts
  import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
  } from 'react-native';
  ```

  **Ajouter après l'import `expo-image-picker`** (nouvelle ligne) :
  ```ts
  import { CameraView, useCameraPermissions } from 'expo-camera';
  ```

  **Dans l'import `chantierStorage`** — ajouter `Materiau` et `updateMateriauxChantier` aux imports existants :
  ```ts
  import {
    SavedChantier,
    Tache,
    Materiau,
    chargerChantierById,
    updateTachesChantier,
    uploadPhotoChantier,
    supprimerPhotoChantier,
    updatePhotosChantier,
    updateMateriauxChantier,
  } from './src/utils/chantierStorage';
  ```

  **Ajouter après les autres imports** (nouvelle ligne) :
  ```ts
  import {
    trouverEquipementParCodeBarres,
    ajouterEquipement,
    Equipement,
  } from './src/utils/equipementStorage';
  ```

  Note : `MaterialIcons` est déjà importé dans le fichier — ne pas le dupliquer.

- [ ] **Step 2 : Ajouter les états matériaux**

  Après `const [uploading, setUploading] = useState(false);`, ajouter :

  ```ts
  const [, requestCameraPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [materiaux, setMateriaux] = useState<Materiau[]>([]);

  // Modal quantité
  const [quantiteModal, setQuantiteModal] = useState<{
    visible: boolean;
    equipement: Equipement | null;
    quantite: string;
  }>({ visible: false, equipement: null, quantite: '1' });

  // Modal ajout équipement inconnu
  const [ajoutModal, setAjoutModal] = useState<{
    visible: boolean;
    codeBarres: string;
    nom: string;
    referenceRexel: string;
  }>({ visible: false, codeBarres: '', nom: '', referenceRexel: '' });
  ```

- [ ] **Step 3 : Charger les matériaux dans `loadChantier`**

  Après `setPhotos(data?.photos ?? []);`, ajouter :

  ```ts
  setMateriaux(data?.materiaux ?? []);
  ```

- [ ] **Step 4 : Ajouter le handler `handleScannerOpen`**

  Après `handleRemovePhoto`, ajouter :

  ```ts
  const handleScannerOpen = async () => {
    const { granted } = await requestCameraPermission();
    if (!granted) {
      setAlertConfig({
        visible: true,
        title: 'Permission refusée',
        message: 'Accès à la caméra nécessaire pour scanner.',
        type: 'warning',
        onConfirm: closeAlert,
      });
      return;
    }
    setScannerVisible(true);
  };
  ```

- [ ] **Step 5 : Ajouter le handler `handleBarcodeScanned`**

  ```ts
  const handleBarcodeScanned = async ({ data: codeBarres }: { data: string }) => {
    setScannerVisible(false);
    if (!chantier) return;

    const equipement = await trouverEquipementParCodeBarres(codeBarres);

    if (equipement) {
      setQuantiteModal({ visible: true, equipement, quantite: '1' });
    } else {
      setAlertConfig({
        visible: true,
        title: 'Équipement inconnu',
        message: `Code-barres "${codeBarres}" non trouvé dans le catalogue. Voulez-vous l'ajouter ?`,
        type: 'warning',
        confirmText: 'Ajouter',
        cancelText: 'Annuler',
        onConfirm: () => {
          closeAlert();
          setAjoutModal({ visible: true, codeBarres, nom: '', referenceRexel: '' });
        },
        onCancel: closeAlert,
      });
    }
  };
  ```

- [ ] **Step 6 : Ajouter le handler `handleConfirmQuantite`**

  ```ts
  const handleConfirmQuantite = async (equipement: Equipement, quantiteStr: string) => {
    if (!chantier) return;
    const quantite = parseInt(quantiteStr, 10);
    if (isNaN(quantite) || quantite <= 0) return;

    const nouveau: Materiau = {
      equipement_id: equipement.id,
      code_barres: equipement.code_barres,
      nom: equipement.nom,
      reference_rexel: equipement.reference_rexel,
      quantite,
    };
    const newMateriaux = [...materiaux, nouveau];
    setMateriaux(newMateriaux);
    setQuantiteModal({ visible: false, equipement: null, quantite: '1' });
    await updateMateriauxChantier(chantier.id, newMateriaux);
  };
  ```

- [ ] **Step 7 : Ajouter le handler `handleConfirmAjoutEquipement`**

  ```ts
  const handleConfirmAjoutEquipement = async () => {
    const { codeBarres, nom, referenceRexel } = ajoutModal;
    if (!nom.trim() || !referenceRexel.trim()) return;

    const equipement = await ajouterEquipement(codeBarres, nom.trim(), referenceRexel.trim());
    setAjoutModal({ visible: false, codeBarres: '', nom: '', referenceRexel: '' });

    if (equipement) {
      setQuantiteModal({ visible: true, equipement, quantite: '1' });
    } else {
      setAlertConfig({
        visible: true,
        title: 'Erreur',
        message: "Impossible d'ajouter l'équipement.",
        type: 'danger',
        onConfirm: closeAlert,
      });
    }
  };
  ```

- [ ] **Step 8 : Ajouter le handler `handleRemoveMateriau`**

  ```ts
  const handleRemoveMateriau = (index: number) => {
    if (!chantier) return;
    setAlertConfig({
      visible: true,
      title: 'Supprimer le matériau',
      message: 'Voulez-vous retirer ce matériau du chantier ?',
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        closeAlert();
        const newMateriaux = materiaux.filter((_, i) => i !== index);
        setMateriaux(newMateriaux);
        await updateMateriauxChantier(chantier.id, newMateriaux);
      },
      onCancel: closeAlert,
    });
  };
  ```

- [ ] **Step 9 : Ajouter `renderMateriauxSection`**

  Après `renderPhotosSection`, ajouter :

  ```ts
  const renderMateriauxSection = () => (
    <View style={styles.materiauxSection}>
      <View style={styles.materiauxHeader}>
        <MaterialIcons name="inventory" size={20} color="#FBBF24" />
        <Text style={styles.materiauxTitle}>Matériaux</Text>
        <Text style={styles.materiauxCount}>{materiaux.length}</Text>
      </View>

      {materiaux.map((m, index) => (
        <Pressable
          key={index}
          onLongPress={() => handleRemoveMateriau(index)}
          style={styles.materiauRow}
        >
          <View style={styles.materiauInfo}>
            <Text style={styles.materiauNom}>{m.nom}</Text>
            <Text style={styles.materiauRef}>{m.reference_rexel}</Text>
          </View>
          <View style={styles.materiauQty}>
            <Text style={styles.materiauQtyText}>{m.quantite}</Text>
            <Text style={styles.materiauQtyLabel}>unité{m.quantite > 1 ? 's' : ''}</Text>
          </View>
        </Pressable>
      ))}

      <Pressable
        onPress={handleScannerOpen}
        style={({ pressed }) => [
          styles.scanButton,
          pressed && styles.scanButtonPressed,
        ]}
      >
        <MaterialIcons name="qr-code-scanner" size={20} color="#FBBF24" />
        <Text style={styles.scanButtonText}>Scanner un code-barres</Text>
      </Pressable>
    </View>
  );
  ```

- [ ] **Step 10 : Ajouter `renderScannerModal`**

  ```ts
  const renderScannerModal = () => (
    <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
      <View style={styles.scannerContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a'] }}
        />
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
          <Text style={styles.scannerHint}>Pointez vers le code-barres</Text>
        </View>
        <Pressable
          onPress={() => setScannerVisible(false)}
          style={styles.scannerClose}
        >
          <MaterialIcons name="close" size={28} color="#F9FAFB" />
        </Pressable>
      </View>
    </Modal>
  );
  ```

- [ ] **Step 11 : Ajouter `renderQuantiteModal`**

  ```ts
  const renderQuantiteModal = () => {
    const eq = quantiteModal.equipement;
    if (!eq) return null;
    return (
      <Modal visible={quantiteModal.visible} transparent animationType="fade" onRequestClose={() => setQuantiteModal(p => ({ ...p, visible: false }))}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ajouter au chantier</Text>
            <Text style={styles.modalProduitNom}>{eq.nom}</Text>
            <Text style={styles.modalProduitRef}>{eq.reference_rexel}</Text>
            <Text style={styles.modalLabel}>Quantité</Text>
            <TextInput
              style={styles.modalInput}
              value={quantiteModal.quantite}
              onChangeText={v => setQuantiteModal(p => ({ ...p, quantite: v }))}
              keyboardType="numeric"
              selectTextOnFocus
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setQuantiteModal({ visible: false, equipement: null, quantite: '1' })}
                style={styles.modalBtnCancel}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={() => handleConfirmQuantite(eq, quantiteModal.quantite)}
                style={styles.modalBtnConfirm}
              >
                <Text style={styles.modalBtnConfirmText}>Ajouter</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };
  ```

- [ ] **Step 12 : Ajouter `renderAjoutEquipementModal`**

  ```ts
  const renderAjoutEquipementModal = () => (
    <Modal visible={ajoutModal.visible} transparent animationType="fade" onRequestClose={() => setAjoutModal(p => ({ ...p, visible: false }))}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Nouvel équipement</Text>
          <Text style={styles.modalCodeBarres}>Code-barres : {ajoutModal.codeBarres}</Text>
          <Text style={styles.modalLabel}>Nom du produit</Text>
          <TextInput
            style={styles.modalInput}
            value={ajoutModal.nom}
            onChangeText={v => setAjoutModal(p => ({ ...p, nom: v }))}
            placeholder="ex: Disjoncteur 16A"
            placeholderTextColor="#4B5563"
            autoFocus
          />
          <Text style={styles.modalLabel}>Référence Rexel</Text>
          <TextInput
            style={styles.modalInput}
            value={ajoutModal.referenceRexel}
            onChangeText={v => setAjoutModal(p => ({ ...p, referenceRexel: v }))}
            placeholder="ex: REX123456"
            placeholderTextColor="#4B5563"
          />
          <View style={styles.modalButtons}>
            <Pressable
              onPress={() => setAjoutModal({ visible: false, codeBarres: '', nom: '', referenceRexel: '' })}
              style={styles.modalBtnCancel}
            >
              <Text style={styles.modalBtnCancelText}>Annuler</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirmAjoutEquipement}
              style={[styles.modalBtnConfirm, (!ajoutModal.nom.trim() || !ajoutModal.referenceRexel.trim()) && { opacity: 0.5 }]}
              disabled={!ajoutModal.nom.trim() || !ajoutModal.referenceRexel.trim()}
            >
              <Text style={styles.modalBtnConfirmText}>Suivant</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  ```

- [ ] **Step 13 : Mettre à jour `ListFooterComponent` et ajouter les modals**

  Remplacer `ListFooterComponent={renderPhotosSection}` par :

  ```tsx
  ListFooterComponent={() => (
    <>
      {renderPhotosSection()}
      {renderMateriauxSection()}
    </>
  )}
  ```

  Juste avant le `<CustomAlert>` en bas du JSX, ajouter les 3 modals :

  ```tsx
  {renderScannerModal()}
  {renderQuantiteModal()}
  {renderAjoutEquipementModal()}
  ```

- [ ] **Step 14 : Ajouter les styles**

  Dans `StyleSheet.create({...})`, ajouter à la fin :

  ```ts
  // ── Matériaux ──────────────────────────────────────
  materiauxSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  materiauxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  materiauxTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  materiauxCount: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  materiauRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 14,
    marginBottom: 10,
  },
  materiauInfo: { flex: 1 },
  materiauNom: { color: '#F9FAFB', fontSize: 15, fontWeight: '600', marginBottom: 3 },
  materiauRef: { color: '#6B7280', fontSize: 13 },
  materiauQty: { alignItems: 'center' },
  materiauQtyText: { color: '#FBBF24', fontSize: 20, fontWeight: '800' },
  materiauQtyLabel: { color: '#6B7280', fontSize: 11 },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  scanButtonPressed: { backgroundColor: 'rgba(251, 191, 36, 0.2)' },
  scanButtonText: { color: '#FBBF24', fontSize: 15, fontWeight: '600' },
  // ── Scanner modal ───────────────────────────────────
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FBBF24',
    backgroundColor: 'transparent',
  },
  scannerHint: {
    marginTop: 20,
    color: '#F9FAFB',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scannerClose: {
    position: 'absolute',
    top: 56,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Modals communs ──────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modalTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  modalProduitNom: { color: '#F9FAFB', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  modalProduitRef: { color: '#6B7280', fontSize: 13, marginBottom: 20 },
  modalCodeBarres: { color: '#6B7280', fontSize: 13, marginBottom: 20 },
  modalLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: {
    backgroundColor: '#050B14',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 14,
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    alignItems: 'center',
  },
  modalBtnCancelText: { color: '#9CA3AF', fontWeight: '700', fontSize: 15 },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
  },
  modalBtnConfirmText: { color: '#000', fontWeight: '800', fontSize: 15 },
  ```

- [ ] **Step 15 : Commit**

  ```bash
  git add FicheChantier.tsx
  git commit -m "feat: add materials section with barcode scanning to FicheChantier"
  ```

---

## Vérification manuelle

**Catalogue PC :**
- [ ] Ouvrir `catalogue.html` dans un navigateur → liste vide affichée
- [ ] Ajouter un équipement (code-barres + nom + référence) → apparaît dans la liste
- [ ] Modifier un équipement → bouton "Sauvegarder" apparaît → sauvegarder
- [ ] Supprimer un équipement → disparaît de la liste

**App — scan équipement connu :**
- [ ] Ouvrir fiche chantier → section "Matériaux" visible sous les photos
- [ ] Appuyer "Scanner un code-barres" → caméra s'ouvre
- [ ] Scanner le code-barres d'un équipement du catalogue → modal quantité avec nom + référence
- [ ] Entrer quantité → confirmer → matériau apparaît dans la liste
- [ ] Recharger la fiche → matériau toujours là (persisté)
- [ ] Appui long sur un matériau → confirmation suppression → disparaît

**App — scan équipement inconnu :**
- [ ] Scanner un code-barres absent du catalogue → alert "Équipement inconnu"
- [ ] Appuyer "Ajouter" → modal avec code-barres pré-rempli → saisir nom + référence → "Suivant"
- [ ] Modal quantité s'ouvre → confirmer → matériau ajouté
- [ ] Vérifier dans `catalogue.html` que le nouvel équipement est bien dans la liste
