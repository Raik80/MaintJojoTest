import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tache, sauvegarderChantier } from './src/utils/chantierStorage';
import CustomAlert from './src/components/CustomAlert';

type FormulaireChantierProps = {
  localisation: string;
  taches: Tache[];
  onBackPress?: () => void;
  onSaveSuccess?: () => void;
};

const FormulaireChantier: React.FC<FormulaireChantierProps> = ({
  localisation,
  taches: tachesInitiales,
  onBackPress,
  onSaveSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [taches, setTaches] = useState<Tache[]>(tachesInitiales);
  const [saving, setSaving] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const toggleTache = (index: number) => {
    setTaches(prev =>
      prev.map((t, i) => (i === index ? { ...t, done: !t.done } : t))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await sauvegarderChantier(localisation, taches);
    setSaving(false);

    if (success) {
      setAlertConfig({
        visible: true,
        title: 'Chantier créé !',
        message: 'Le chantier a été sauvegardé avec succès.',
        type: 'success',
        onConfirm: () => {
          closeAlert();
          onSaveSuccess?.();
        },
      });
    } else {
      setAlertConfig({
        visible: true,
        title: 'Erreur',
        message: 'Impossible de sauvegarder le chantier.',
        type: 'danger',
        onConfirm: closeAlert,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050B14" />

      <View style={[styles.header, { paddingTop: (StatusBar.currentHeight || 0) + 16 }]}>
        <Pressable
          onPress={onBackPress}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <MaterialIcons name="arrow-back" size={18} color="#DCE4F2" />
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Nouveau chantier</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte localisation */}
        <View style={styles.localisationCard}>
          <View style={styles.localisationHeader}>
            <MaterialIcons name="location-on" size={20} color="#34D399" />
            <Text style={styles.localisationLabel}>Localisation</Text>
          </View>
          <Text style={styles.localisationValue}>{localisation}</Text>
        </View>

        {/* Checklist */}
        <View style={styles.tachesCard}>
          <View style={styles.tachesHeader}>
            <MaterialIcons name="checklist" size={20} color="#38BDF8" />
            <Text style={styles.tachesTitle}>Tâches</Text>
            <Text style={styles.tachesCount}>{taches.length}</Text>
          </View>

          {taches.length === 0 ? (
            <Text style={styles.emptyTaches}>Aucune tâche détectée</Text>
          ) : (
            taches.map((tache, index) => (
              <Pressable
                key={index}
                onPress={() => toggleTache(index)}
                style={({ pressed }) => [
                  styles.tacheRow,
                  pressed && styles.tacheRowPressed,
                ]}
              >
                <View style={[styles.checkbox, tache.done && styles.checkboxDone]}>
                  {tache.done && (
                    <MaterialIcons name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text style={[styles.tacheText, tache.done && styles.tacheTextDone]}>
                  {tache.description}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && !saving && styles.saveButtonPressed,
            saving && styles.saveButtonDisabled,
          ]}
        >
          <MaterialIcons name="save" size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Text>
        </Pressable>
      </View>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050B14' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2738',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#182236',
    marginBottom: 16,
  },
  backButtonPressed: { backgroundColor: '#1F2C44' },
  backButtonText: { marginLeft: 6, color: '#DCE4F2', fontSize: 14, fontWeight: '600' },
  title: { color: '#F9FAFB', fontSize: 28, fontWeight: '800', letterSpacing: 0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  localisationCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 16,
    marginBottom: 16,
  },
  localisationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  localisationLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  localisationValue: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  tachesCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 16,
  },
  tachesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tachesTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  tachesCount: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  emptyTaches: {
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  tacheRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  tacheRowPressed: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  tacheText: { color: '#F9FAFB', fontSize: 15, flex: 1, lineHeight: 22 },
  tacheTextDone: { color: '#6B7280', textDecorationLine: 'line-through' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#050B14',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  saveButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonPressed: { backgroundColor: '#0E9F6E', transform: [{ scale: 0.98 }] },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});

export default FormulaireChantier;
