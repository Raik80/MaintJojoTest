import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
import {
  trouverEquipementParCodeBarres,
  ajouterEquipement,
  Equipement,
} from './src/utils/equipementStorage';
import { genererEtEnvoyerPDFChantier } from './src/utils/generatePDF';
import CustomAlert from './src/components/CustomAlert';

type FicheChantierProps = {
  chantierId: string;
  onBackPress?: () => void;
};

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  const jour = date.getDate().toString().padStart(2, '0');
  const mois = (date.getMonth() + 1).toString().padStart(2, '0');
  const annee = date.getFullYear();
  const heures = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${jour}/${mois}/${annee} à ${heures}:${minutes}`;
};

const FicheChantier: React.FC<FicheChantierProps> = ({ chantierId, onBackPress }) => {
  const [chantier, setChantier] = useState<SavedChantier | null>(null);
  const [loading, setLoading] = useState(true);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [, requestCameraPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const scanningRef = useRef(false);
  const [materiaux, setMateriaux] = useState<Materiau[]>([]);

  const [quantiteModal, setQuantiteModal] = useState<{
    visible: boolean;
    equipement: Equipement | null;
    quantite: string;
  }>({ visible: false, equipement: null, quantite: '1' });

  const [ajoutModal, setAjoutModal] = useState<{
    visible: boolean;
    codeBarres: string;
    nom: string;
    referenceRexel: string;
  }>({ visible: false, codeBarres: '', nom: '', referenceRexel: '' });

  const loadChantier = useCallback(async () => {
    setLoading(true);
    const data = await chargerChantierById(chantierId);
    setChantier(data);
    setPhotos(data?.photos ?? []);
    setMateriaux(data?.materiaux ?? []);
    setLoading(false);
  }, [chantierId]);

  useEffect(() => { loadChantier(); }, [loadChantier]);

  const handleToggleTache = async (index: number) => {
    if (!chantier) return;

    // Save original state before optimistic update
    const originalChantier = chantier;

    // Optimistic update
    const newTaches: Tache[] = chantier.taches.map((t, i) =>
      i === index ? { ...t, done: !t.done } : t
    );
    setChantier({ ...chantier, taches: newTaches });

    // Persist
    const success = await updateTachesChantier(chantier.id, newTaches);
    if (!success) {
      // Rollback to original state
      setChantier(originalChantier);
      setAlertConfig({
        visible: true,
        title: 'Erreur',
        message: 'Impossible de mettre à jour la tâche.',
        type: 'danger',
        onConfirm: closeAlert,
      });
    }
  };

  const handleAddPhoto = () => {
    if (!chantier) return;
    setAlertConfig({
      visible: true,
      title: 'Ajouter une photo',
      message: 'Choisir la source de la photo',
      type: 'info',
      confirmText: '📷 Caméra',
      cancelText: '🖼️ Galerie',
      onConfirm: async () => {
        closeAlert();
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
          await handleUploadAndSave(result.assets[0].uri);
        }
      },
      onCancel: async () => {
        closeAlert();
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
          await handleUploadAndSave(result.assets[0].uri);
        }
      },
    });
  };

  const handleUploadAndSave = async (localUri: string) => {
    if (!chantier) return;
    setUploading(true);
    const publicUrl = await uploadPhotoChantier(chantier.id, localUri);
    setUploading(false);
    if (publicUrl) {
      const newPhotos = [...photos, publicUrl];
      setPhotos(newPhotos);
      await updatePhotosChantier(chantier.id, newPhotos);
    } else {
      setAlertConfig({
        visible: true,
        title: 'Erreur',
        message: "Impossible d'uploader la photo.",
        type: 'danger',
        onConfirm: closeAlert,
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    if (!chantier) return;
    setAlertConfig({
      visible: true,
      title: 'Supprimer la photo',
      message: 'Voulez-vous supprimer cette photo ?',
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        closeAlert();
        const photoUrl = photos[index];
        const newPhotos = photos.filter((_, i) => i !== index);
        setPhotos(newPhotos);
        await supprimerPhotoChantier(photoUrl);
        await updatePhotosChantier(chantier.id, newPhotos);
      },
      onCancel: closeAlert,
    });
  };

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
    scanningRef.current = false;
    setScannerVisible(true);
  };

  const handleBarcodeScanned = async ({ data: codeBarres }: { data: string }) => {
    if (scanningRef.current) return;
    scanningRef.current = true;
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

  const done = chantier?.taches.filter(t => t.done).length ?? 0;
  const total = chantier?.taches.length ?? 0;

  const renderTache = ({ item, index }: { item: Tache; index: number }) => (
    <Pressable
      onPress={() => handleToggleTache(index)}
      style={({ pressed }) => [styles.tacheRow, pressed && styles.tacheRowPressed]}
    >
      <MaterialIcons
        name={item.done ? 'check-box' : 'check-box-outline-blank'}
        size={24}
        color={item.done ? '#34D399' : '#6B7280'}
      />
      <Text style={[styles.tacheText, item.done && styles.tacheTextDone]}>
        {item.description}
      </Text>
    </Pressable>
  );

  const renderPhotosSection = () => (
    <View style={styles.photosSection}>
      <View style={styles.photosSectionHeader}>
        <MaterialIcons name="photo-library" size={20} color="#A78BFA" />
        <Text style={styles.photosSectionTitle}>Photos</Text>
        <Text style={styles.photosCount}>{photos.length}</Text>
      </View>

      {photos.length > 0 && (
        <View style={styles.photosGrid}>
          {photos.map((uri, index) => (
            <Pressable
              key={index}
              onLongPress={() => handleRemovePhoto(index)}
              style={styles.photoWrapper}
            >
              <Image source={{ uri }} style={styles.photoThumbnail} />
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={handleAddPhoto}
        disabled={uploading}
        style={({ pressed }) => [
          styles.addPhotoButton,
          pressed && !uploading && styles.addPhotoButtonPressed,
          uploading && styles.addPhotoButtonDisabled,
        ]}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#A78BFA" />
        ) : (
          <MaterialIcons name="add-a-photo" size={20} color="#A78BFA" />
        )}
        <Text style={styles.addPhotoButtonText}>
          {uploading ? 'Upload en cours...' : 'Ajouter une photo'}
        </Text>
      </Pressable>
    </View>
  );

  const renderMateriauxSection = () => (
    <View style={styles.materiauxSection}>
      <View style={styles.materiauxHeader}>
        <MaterialIcons name="inventory" size={20} color="#FBBF24" />
        <Text style={styles.materiauxTitle}>Matériaux</Text>
        <Text style={styles.materiauxCount}>{materiaux.length}</Text>
      </View>

      {materiaux.map((m, index) => (
        <Pressable
          key={m.equipement_id}
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

  const renderAjoutEquipementModal = () => (
    <Modal visible={ajoutModal.visible} transparent animationType="fade" onRequestClose={() => setAjoutModal(p => ({ ...p, visible: false }))}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Nouvel équipement</Text>
          <Text style={styles.modalCodeBarres}>Code-barres : {ajoutModal.codeBarres}</Text>
          <Text style={styles.modalLabel}>Nom du produit</Text>
          <TextInput
            style={styles.modalInputText}
            value={ajoutModal.nom}
            onChangeText={v => setAjoutModal(p => ({ ...p, nom: v }))}
            placeholder="ex: Disjoncteur 16A"
            placeholderTextColor="#4B5563"
            autoFocus
          />
          <Text style={styles.modalLabel}>Référence Rexel</Text>
          <TextInput
            style={styles.modalInputText}
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050B14" />

      <View style={[styles.header, { paddingTop: (StatusBar.currentHeight || 0) + 16 }]}>
        <Pressable
          onPress={onBackPress}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <MaterialIcons name="chevron-left" size={28} color="#F9FAFB" />
        </Pressable>

        <Text style={styles.title} numberOfLines={2}>
          {chantier?.localisation ?? ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#34D399" />
        </View>
      ) : !chantier ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color="#374151" />
          <Text style={styles.emptyText}>Chantier introuvable</Text>
        </View>
      ) : (
        <>
          <View style={styles.infoRow}>
            <View style={styles.progressBadge}>
              <MaterialIcons name="checklist" size={16} color="#38BDF8" />
              <Text style={styles.progressText}>{done}/{total} tâches complétées</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(chantier.date_creation)}</Text>
          </View>

          <FlatList
            data={chantier.taches}
            keyExtractor={(item, i) => `${i}-${item.description}`}
            renderItem={renderTache}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centered}>
                <MaterialIcons name="playlist-add-check" size={48} color="#374151" />
                <Text style={styles.emptyText}>Aucune tâche pour ce chantier</Text>
              </View>
            }
            ListFooterComponent={() => (
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
            )}
          />
        </>
      )}

      {renderScannerModal()}
      {renderQuantiteModal()}
      {renderAjoutEquipementModal()}

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050B14' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  backButtonPressed: { backgroundColor: '#1F2937' },
  title: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: { color: '#38BDF8', fontSize: 14, fontWeight: '600' },
  dateText: { color: '#6B7280', fontSize: 12 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  tacheRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 14,
    marginBottom: 10,
  },
  tacheRowPressed: { backgroundColor: '#1A2436' },
  tacheText: { color: '#F9FAFB', fontSize: 15, flex: 1 },
  tacheTextDone: { color: '#6B7280', textDecorationLine: 'line-through' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: { color: '#6B7280', fontSize: 16 },
  photosSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  photosSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  photosSectionTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  photosCount: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  photoWrapper: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
  },
  addPhotoButtonPressed: { backgroundColor: 'rgba(167, 139, 250, 0.2)' },
  addPhotoButtonDisabled: { opacity: 0.6 },
  addPhotoButtonText: {
    color: '#A78BFA',
    fontSize: 15,
    fontWeight: '600',
  },
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
  modalInputText: {
    backgroundColor: '#050B14',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 14,
    color: '#F9FAFB',
    fontSize: 15,
    marginBottom: 16,
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
});

export default FicheChantier;
