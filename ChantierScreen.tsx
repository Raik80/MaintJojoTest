import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Vibration,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type ChantierScreenProps = {
  onNouveauPress?: () => void;
  onVoirPress?: () => void;
  onBackPress?: () => void;
};

const ChantierScreen: React.FC<ChantierScreenProps> = ({
  onNouveauPress,
  onVoirPress,
  onBackPress,
}) => {
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
        <Text style={styles.title}>Chantiers</Text>
      </View>

      <View style={styles.content}>
        <Pressable
          onPress={() => { Vibration.vibrate(10); onNouveauPress?.(); }}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
        >
          <MaterialIcons name="add" size={22} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Nouveau chantier</Text>
        </Pressable>

        <Pressable
          onPress={() => { Vibration.vibrate(10); onVoirPress?.(); }}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
        >
          <MaterialIcons name="list-alt" size={22} color="#DCE4F2" />
          <Text style={styles.secondaryButtonText}>Voir les chantiers</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B14',
  },
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
  backButtonPressed: {
    backgroundColor: '#1F2C44',
  },
  backButtonText: {
    marginLeft: 6,
    color: '#DCE4F2',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#F9FAFB',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#0D6EFD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#0D6EFD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonPressed: {
    backgroundColor: '#0A58CA',
    transform: [{ scale: 0.96 }],
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2A364D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryButtonPressed: {
    backgroundColor: '#182236',
    transform: [{ scale: 0.96 }],
  },
  secondaryButtonText: {
    color: '#DCE4F2',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default ChantierScreen;