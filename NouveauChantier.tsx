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
import { analyserChantier, ChantierAnalyse } from './src/utils/chantierParser';

type NouveauChantierProps = {
  onBackPress?: () => void;
  onAnalyseComplete?: (result: ChantierAnalyse) => void;
};

const NouveauChantier: React.FC<NouveauChantierProps> = ({
  onBackPress,
  onAnalyseComplete,
}) => {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState('');

  const handleAnalyse = () => {
    if (!notes.trim()) return;
    const result = analyserChantier(notes);
    onAnalyseComplete?.(result);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onBackPress}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <MaterialIcons name="arrow-back" size={18} color="#DCE4F2" />
            <Text style={styles.backButtonText}>Retour</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Nouveau chantier</Text>
          <Text style={styles.headerHint}>
            💡 La ligne avec le bâtiment = localisation, le reste = tâches
          </Text>
        </View>

        <View style={styles.content}>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            multiline
            autoFocus
            textAlignVertical="top"
            placeholder={
              'Écris la localisation et les tâches...\n\nExemple :\nBat A entrée 2A\nChanger les néons du couloir\nVérifier les prises du labo'
            }
            placeholderTextColor="#8B95A7"
          />
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={handleAnalyse}
            disabled={!notes.trim()}
            style={({ pressed }) => [
              styles.analyseButton,
              pressed && notes.trim() && styles.analyseButtonPressed,
              !notes.trim() && styles.analyseButtonDisabled,
            ]}
          >
            <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
            <Text style={styles.analyseButtonText}>Analyser & Continuer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  keyboardContainer: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: (StatusBar.currentHeight || 0) + 16,
    paddingBottom: 12,
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
    marginBottom: 12,
  },
  backButtonPressed: { backgroundColor: '#1F2C44' },
  backButtonText: { marginLeft: 6, color: '#DCE4F2', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#F5F7FB', fontSize: 22, fontWeight: '700', letterSpacing: 0.2 },
  headerHint: { color: '#8B95A7', fontSize: 13, marginTop: 4 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
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
    borderTopWidth: 1,
    borderTopColor: '#1D2738',
    backgroundColor: '#0B1220',
  },
  analyseButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 7,
  },
  analyseButtonPressed: { backgroundColor: '#0E9F6E', transform: [{ scale: 0.985 }] },
  analyseButtonDisabled: { opacity: 0.4 },
  analyseButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});

export default NouveauChantier;