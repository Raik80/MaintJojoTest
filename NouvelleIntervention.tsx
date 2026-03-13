import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PhoneIllustration from './PhoneIllustration';
import { analyserMultipleInterventions, InterventionExtractedData } from './src/utils/interventionParser';

/**
 * Propriétés du composant NouvelleIntervention.
 * @property onBackPress - Fonction de rappel déclenchée lors de l'appui sur le bouton de retour.
 * @property onAnalyzeComplete - Fonction de rappel déclenchée lors de l'analyse, renvoie le texte et le TABLEAU de données.
 */
type NouvelleInterventionProps = {
  onBackPress?: () => void;
  onAnalyzeComplete?: (notes: string, data: InterventionExtractedData[]) => void;
};

/**
 * Écran principal permettant de saisir les détails (notes) d'une nouvelle intervention.
 * Supporte plusieurs interventions séparées par des sauts de ligne.
 */
const NouvelleIntervention: React.FC<NouvelleInterventionProps> = ({
  onBackPress,
  onAnalyzeComplete,
}) => {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState('');

  const handleBackPress = () => {
    onBackPress?.();
  };

  const handleAnalyzePress = () => {
    if (!notes.trim()) {
      return;
    }
    // Utilise la nouvelle fonction multi-interventions
    const extractedDataArray = analyserMultipleInterventions(notes);
    onAnalyzeComplete?.(notes, extractedDataArray);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable
              onPress={handleBackPress}
              accessibilityLabel="Retour à l'écran précédent"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed
              ]}
            >
              <MaterialIcons name="arrow-back" size={18} color="#DCE4F2" />
              <Text style={styles.backButtonText}>Retour</Text>
            </Pressable>
          </View>
          <Text style={styles.headerTitle}>Détails de l'intervention</Text>
          <Text style={styles.headerHint}>💡 Une intervention par ligne</Text>
        </View>

        <View style={styles.content}>
          <PhoneIllustration />

          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            multiline
            autoFocus
            textAlignVertical="top"
            placeholder={"Saisis ici les détails pendant l'appel...\n\nExemple :\nnéon qui clignote salle 102 bat A 2A\nprise arrachée cuisine BU"}
            placeholderTextColor="#8B95A7"
          />
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={handleAnalyzePress}
            accessibilityLabel="Analyser et continuer"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed
            ]}
          >
            <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Analyser & Continuer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 0) + 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2738',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#182236',
  },
  backButtonPressed: {
    backgroundColor: '#1F2C44',
  },
  backButtonText: {
    marginLeft: 6,
    color: '#DCE4F2',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#F5F7FB',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerHint: {
    color: '#8B95A7',
    fontSize: 13,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  notesInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2A364D',
    borderRadius: 14,
    backgroundColor: '#121B2B',
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#1D2738',
    backgroundColor: '#0B1220',
  },
  saveButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 7,
  },
  saveButtonPressed: {
    backgroundColor: '#0E9F6E',
    transform: [{ scale: 0.985 }],
  },
  saveButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default NouvelleIntervention;
