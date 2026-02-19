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

type NouvelleInterventionProps = {
  onBackPress?: () => void;
  onSavePress?: () => void;
};

const NouvelleIntervention: React.FC<NouvelleInterventionProps> = ({
  onBackPress,
  onSavePress,
}) => {
  const [notes, setNotes] = useState('');

  const handleBackPress = () => {
    onBackPress?.();
  };

  const handleSavePress = () => {
    // TODO: brancher la sauvegarde reelle de "notes".
    onSavePress?.();
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
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            >
              <MaterialIcons name="arrow-back" size={18} color="#DCE4F2" />
              <Text style={styles.backButtonText}>Retour</Text>
            </Pressable>
          </View>

          <Text style={styles.headerTitle}>Details de l&apos;intervention</Text>
        </View>

        <View style={styles.content}>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            multiline
            autoFocus
            textAlignVertical="top"
            placeholder="Saisis ici les details pendant l'appel..."
            placeholderTextColor="#8B95A7"
          />
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={handleSavePress}
            style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
          >
            <MaterialIcons name="save" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Enregistrer l&apos;intervention</Text>
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
    paddingTop: 16,
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
